const fetch = require('node-fetch').default;
const ExifParser = require('exif-parser');
const extractChunks = require('png-chunks-extract');
const decodeText = require('png-chunk-text').decode;

// 輔助函式：解析 Metadata
async function getMetadata(imageUrl, contentType) {
	try {
		const response = await fetch(imageUrl);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		// 將 ArrayBuffer 轉換為 Node.js Buffer

		let sdParameters = null;

		if (contentType && contentType.startsWith('image/png')) {
			try {
				const chunks = extractChunks(buffer);
				const textChunks = [];
				for (const chunk of chunks) {
					if (chunk.name === 'tEXt' || chunk.name === 'zTXt') {
						const decoded = decodeText(chunk.data);
						textChunks.push(decoded.text);
					}
				}
				if (textChunks.length > 0) {
					sdParameters = textChunks.join('\n');
				}
			}
			catch (pngError) {
				console.error('Error parsing PNG chunks:', pngError);
			}
		}
		else if (contentType && contentType.startsWith('image/jpeg')) {
			try {
				const parser = ExifParser.create(buffer);
				const result = parser.parse();

				if (result.tags && result.tags.UserComment) {
					try {
						if (Buffer.isBuffer(result.tags.UserComment)) {
							sdParameters = result.tags.UserComment.toString('utf8');
						}
						else {
							sdParameters = result.tags.UserComment;
						}
					}
					catch (e) {
						console.error('Error decoding UserComment:', e);
						sdParameters = result.tags.UserComment;
					}
				}
			}
			catch (jpegError) {
				console.error('Error parsing JPEG EXIF:', jpegError);
			}
		}

		return sdParameters;

	}
	catch (error) {
		console.error('Error fetching or parsing image metadata:', error);
		return null;
	}
}

// 整理並顯示 metadata 的函式
async function parseStableDiffusionMetadata(metadataString) {
	const parsed = {
		positivePrompt: 'N/A',
		negativePrompt: 'N/A',
		parameters: {
			Steps: 'N/A',
			Sampler: 'N/A',
			'CFG scale': 'N/A',
			Seed: 'N/A',
			Size: 'N/A',
			Model: 'N/A',
			'Model hash': 'N/A',
			'Denoising strength': 'N/A',
			'Clip skip': 'N/A',
			'Schedule Type': 'N/A',
		},
	};

	let workingString = metadataString;

	const negativePromptIndex = workingString.indexOf('Negative prompt:');

	const parameterKeywords = ['Steps:', 'Sampler:', 'CFG scale:', 'Seed:', 'Size:', 'Model:', 'Model hash:', 'Denoising strength:', 'Clip skip:', 'Schedule Type:'];
	let firstParamIndex = -1;
	for (const keyword of parameterKeywords) {
		const index = workingString.indexOf(keyword);
		if (index !== -1 && (firstParamIndex === -1 || index < firstParamIndex)) {
			firstParamIndex = index;
		}
	}

	if (negativePromptIndex !== -1) {
		parsed.positivePrompt = workingString.substring(0, negativePromptIndex).trim();

		const negativeStart = negativePromptIndex + 'Negative prompt:'.length;
		const negativeEnd = (firstParamIndex !== -1 && firstParamIndex > negativePromptIndex) ? firstParamIndex : workingString.length;
		parsed.negativePrompt = workingString.substring(negativeStart, negativeEnd).trim();

		if (firstParamIndex !== -1) {
			workingString = workingString.substring(firstParamIndex);
		}
		else {
			workingString = '';
		}
	}
	else if (firstParamIndex !== -1) {
		parsed.positivePrompt = workingString.substring(0, firstParamIndex).trim();
		workingString = workingString.substring(firstParamIndex);
	}
	else {
		parsed.positivePrompt = workingString.trim();
		workingString = '';
	}

	const paramRegex = /(Steps|Sampler|Schedule Type|CFG scale|Seed|Size|Model|Model hash|Denoising strength|Clip skip):\s*([^\n,]+)/g;
	let match;
	while ((match = paramRegex.exec(workingString)) !== null) {
		const key = match[1].trim();
		const value = match[2].trim();
		parsed.parameters[key] = value;
	}

	if (!parsed.positivePrompt || parsed.positivePrompt === '') {
		parsed.positivePrompt = 'N/A';
	}
	if (!parsed.negativePrompt || parsed.negativePrompt === '') {
		parsed.negativePrompt = 'N/A';
	}

	return parsed;
}

module.exports = {
	getMetadata,
	parseStableDiffusionMetadata,
};