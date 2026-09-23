const axios = require('axios');

const API_URL = 'https://artificialanalysis.ai/api/v2/data/llms/models';
const CACHE_TTL = 5 * 60 * 1000;
const RETRY_BACKOFF = 60 * 1000;

const CATEGORY_METRICS = {
	intelligence: model => model.evaluations?.artificial_analysis_intelligence_index,
	coding: model => model.evaluations?.artificial_analysis_coding_index,
	math: model => model.evaluations?.artificial_analysis_math_index,
	speed: model => model.median_output_tokens_per_second,
};

let cache = null;
let pending = null;
let retryAfter = 0;

// Never pass the axios error itself to console: its config carries the x-api-key header
function describeError(error) {
	const status = error.response?.status;
	if (status === 401 || status === 403) return { code: 'auth', message: `Artificial Analysis rejected the API key (${status})` };
	if (status === 429) return { code: 'rate_limit', message: 'Artificial Analysis rate limit exceeded (429)' };
	if (status) return { code: 'api', message: `Artificial Analysis API error (${status})` };
	return { code: ['auth', 'malformed'].includes(error.code) ? error.code : 'network', message: error.message };
}

async function fetchModels() {
	const apiKey = process.env.AA_BENCHMARK_API;
	if (!apiKey) {
		throw Object.assign(new Error('AA_BENCHMARK_API is not set'), { code: 'auth' });
	}

	const { data } = await axios.get(API_URL, { headers: { 'x-api-key': apiKey }, timeout: 10000 });
	if (!Array.isArray(data?.data)) {
		throw Object.assign(new Error('Malformed Artificial Analysis response'), { code: 'malformed' });
	}
	return data.data;
}

// Returns { models, fetchedAt, stale }. Concurrent callers share one in-flight request;
// on failure, stale cache is served instead of retrying.
async function getModels() {
	if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
		return { ...cache, stale: false };
	}
	if (cache && Date.now() < retryAfter) {
		return { ...cache, stale: true };
	}

	if (!pending) {
		pending = fetchModels()
			.then(models => {
				cache = { models, fetchedAt: Date.now() };
				return { ...cache, stale: false };
			})
			.catch(error => {
				const { code, message } = describeError(error);
				console.error(`Failed to fetch Artificial Analysis models: ${message}`);
				if (cache) {
					// Back off so a failing API is not hit again on every command
					retryAfter = Date.now() + RETRY_BACKOFF;
					return { ...cache, stale: true };
				}
				throw Object.assign(new Error(message), { code });
			})
			.finally(() => {
				pending = null;
			});
	}

	return pending;
}

// Variants are named "<model> (<effort>)", e.g. "GPT-6 Astra (xhigh)"; order matters since "xhigh" contains "high"
const EFFORT_RANKS = [['non-reasoning', 0], ['max', 6], ['xhigh', 5], ['high', 4], ['medium', 3], ['low', 2], ['minimal', 1], ['reasoning', 4]];

function effortRank(name) {
	const variant = name.match(/\((.*)\)/)?.[1].toLowerCase() ?? '';
	return EFFORT_RANKS.find(([keyword]) => variant.includes(keyword))?.[1] ?? 3;
}

async function getRanking(category, limit = 10) {
	const metric = CATEGORY_METRICS[category];
	const { models, fetchedAt, stale } = await getModels();

	// Keep one variant per model: the highest reasoning effort that has a score, newest release on ties
	const best = new Map();
	for (const model of models) {
		const name = model?.name;
		const score = metric(model ?? {});
		// The API reports 0 for speed when there is no measurement, so treat non-positive scores as missing
		if (typeof name !== 'string' || !Number.isFinite(score) || score <= 0) continue;

		const entry = {
			name,
			provider: model.model_creator?.name ?? 'Unknown',
			providerSlug: model.model_creator?.slug,
			score,
			effort: effortRank(name),
			releaseDate: model.release_date ?? '',
		};
		const baseName = name.replace(/\s*\(.*$/, '');
		const current = best.get(baseName);
		if (!current || entry.effort > current.effort || (entry.effort === current.effort && entry.releaseDate > current.releaseDate)) {
			best.set(baseName, entry);
		}
	}

	const ranking = [...best.values()]
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map(({ name, provider, providerSlug, score }) => ({ name, provider, providerSlug, score }));

	return { ranking, fetchedAt, stale };
}

module.exports = {
	getRanking,
};
