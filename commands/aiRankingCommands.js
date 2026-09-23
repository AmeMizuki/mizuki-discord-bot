const axios = require('axios');
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getRanking } = require('../services/artificialAnalysis/artificialAnalysisService');

const SOURCE_URL = 'https://artificialanalysis.ai/';
const QUICKCHART_URL = 'https://quickchart.io/chart';
// Keyed by Artificial Analysis model_creator.slug
const PROVIDER_COLORS = {
	anthropic: '#CC785C',
	openai: '#1F1F1F',
	meta: '#0089F4',
	xiaomi: '#FF6900',
	alibaba: '#FF6900',
	kimi: '#047AFE',
	minimax: '#EB3568',
	nvidia: '#676767',
	google: '#34A853',
	deepseek: '#2243E6',
	xai: '#736CD3',
};
const DEFAULT_PROVIDER_COLOR = '#B0B0B0';

const CATEGORY_LABELS = {
	intelligence: { name: 'Intelligence Index', format: score => score.toFixed(1) },
	coding: { name: 'Coding Index', format: score => score.toFixed(1) },
	math: { name: 'Math Index', format: score => score.toFixed(1) },
	speed: { name: 'Output Speed', format: score => `${Math.round(score).toLocaleString('en-US')} tokens/s` },
};

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━';

const RANK_EMOJIS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

// Auth/config failures stay generic here; the service logs the details to the console
const ERROR_MESSAGES = {
	rate_limit: '⏳ Artificial Analysis API 請求次數已達上限，請稍後再試。',
	malformed: '❌ Artificial Analysis 回傳的資料格式異常，請稍後再試。',
};

const aiRankingCommands = [
	new SlashCommandBuilder()
		.setName('ai-ranking')
		.setDescription('顯示 Artificial Analysis 的 AI 模型排行榜 (Top 10)')
		.addStringOption(option =>
			option.setName('category')
				.setDescription('排行類別')
				.setRequired(true)
				.addChoices(
					{ name: 'Intelligence', value: 'intelligence' },
					{ name: 'Coding', value: 'coding' },
					{ name: 'Math', value: 'math' },
					{ name: 'Speed', value: 'speed' },
				)),
];

// Chart.js draws an array label as multiple lines, which keeps long names readable under narrow vertical bars
function wrapLabel(text, maxLines = 3, lineWidth = 14) {
	const lines = [];
	for (const word of text.split(' ')) {
		const last = lines.length - 1;
		if (last >= 0 && `${lines[last]} ${word}`.length <= lineWidth) {
			lines[last] += ` ${word}`;
		}
		else {
			lines.push(word);
		}
	}
	if (lines.length > maxLines) {
		lines.length = maxLines;
		lines[maxLines - 1] += '…';
	}
	return lines;
}

// Rendered via POST and attached, since a GET URL with ten model names exceeds Discord's 2048-char image URL limit
async function renderRankingChart(ranking, label) {
	const chart = {
		type: 'bar',
		data: {
			labels: ranking.map(entry => wrapLabel(entry.name)),
			datasets: [{
				// Pre-rounded because the datalabels formatter would need a JS function, which JSON can't carry
				data: ranking.map(entry => Math.round(entry.score)),
				backgroundColor: ranking.map(entry => PROVIDER_COLORS[entry.providerSlug] ?? DEFAULT_PROVIDER_COLOR),
				borderRadius: 4,
			}],
		},
		options: {
			plugins: {
				legend: { display: false },
				datalabels: { anchor: 'end', align: 'top', color: '#1F1F1F', font: { size: 13, weight: 'bold' } },
				title: { display: true, text: `${label.name} · Data by Artificial Analysis`, color: '#1F1F1F', font: { size: 16 } },
			},
			scales: {
				x: { ticks: { color: '#333333', font: { size: 11 }, maxRotation: 0, autoSkip: false }, grid: { display: false } },
				y: { grace: '8%', ticks: { color: '#666666' }, grid: { color: '#E5E5E5' } },
			},
		},
	};

	const { data } = await axios.post(QUICKCHART_URL, {
		version: '4',
		width: 1000,
		height: 500,
		backgroundColor: '#FFFFFF',
		format: 'png',
		chart,
	}, { responseType: 'arraybuffer', timeout: 10000 });

	return Buffer.from(data);
}

// Charts only change when the ranking data does, so reuse them until the next fetch
const chartCache = new Map();

async function getRankingChart(category, ranking, label, fetchedAt) {
	const cached = chartCache.get(category);
	if (cached?.fetchedAt === fetchedAt) {
		return cached.image;
	}

	const image = await renderRankingChart(ranking, label);
	chartCache.set(category, { fetchedAt, image });
	return image;
}

async function handleAiRankingCommand(interaction) {
	const category = interaction.options.getString('category');
	const label = CATEGORY_LABELS[category];

	await interaction.deferReply();

	let result;
	try {
		result = await getRanking(category);
	}
	catch (error) {
		await interaction.editReply(ERROR_MESSAGES[error.code] ?? '❌ 無法取得 Artificial Analysis 排行資料，請稍後再試。');
		return;
	}

	const { ranking, fetchedAt, stale } = result;
	if (ranking.length === 0) {
		await interaction.editReply(`❌ Artificial Analysis 目前沒有 ${label.name} 的排行資料。`);
		return;
	}

	const entries = ranking.map((entry, index) =>
		`${RANK_EMOJIS[index]}   **${entry.name}**\n└ Company: \`${entry.provider}\`\n└ Score: \`${label.format(entry.score)}\``);

	let description = `${DIVIDER}\n### ${label.name}\n${DIVIDER}\n\n${entries.join('\n\n')}`;
	if (stale) {
		description += '\n\n⚠️ 目前無法連線至 Artificial Analysis，顯示的是先前快取的資料。';
	}
	// Footers can't hold links, so a subtext line stands in for one with a relative timestamp
	description += `\n\n-# Data By [Artificial Analysis](${SOURCE_URL}) • <t:${Math.floor(fetchedAt / 1000)}:R>`;

	const embed = new EmbedBuilder()
		.setColor(0xF1C40F)
		.setTitle(`👑 AI Model Rankings · Top ${ranking.length}`)
		.setDescription(description);

	let chart = null;
	try {
		chart = new AttachmentBuilder(await getRankingChart(category, ranking, label, fetchedAt), { name: 'ai-ranking.png' });
		embed.setImage('attachment://ai-ranking.png');
	}
	catch (error) {
		console.error(`Failed to render AI ranking chart: ${error.message}`);
	}

	await interaction.editReply({ embeds: [embed], files: chart ? [chart] : [] });
}

module.exports = {
	aiRankingCommands,
	handleAiRankingCommand,
};
