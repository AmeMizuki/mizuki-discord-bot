const fetch = require('node-fetch').default;
const ExifParser = require('exif-parser');
const extractChunks = require('png-chunks-extract');
const decodeText = require('png-chunk-text').decode;

// Helper function to check if a string is valid JSON
function isJsonString(str) {
	try {
		JSON.parse(str);
	}
	catch {
		return false;
	}
	return true;
}

// Helper function to detect metadata type from JSON object
function detectMetadataType(jsonObj) {
	if (jsonObj.sui_image_params || jsonObj.sui_extra_data) {
		return 'swarmui';
	}
	if (jsonObj.workflow || jsonObj.prompt || jsonObj.nodes ||
		(jsonObj.version && jsonObj.version.includes && jsonObj.version.includes('ComfyUI')) ||
		(typeof jsonObj === 'object' && Object.keys(jsonObj).some(key =>
			key.includes('workflow') || key.includes('comfy') || key.includes('node')))) {
		return 'comfyui';
	}
	return 'unknown';
}

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
					const combinedText = textChunks.join('\n');
					if (isJsonString(combinedText)) {
						const jsonObj = JSON.parse(combinedText);
						const metadataType = detectMetadataType(jsonObj);
						if (metadataType === 'swarmui') {
							sdParameters = { type: 'swarmui', data: jsonObj };
						}
						else if (metadataType === 'comfyui') {
							sdParameters = { type: 'comfyui', data: jsonObj };
						}
						else {
							sdParameters = { type: 'stable-diffusion-webui', data: combinedText };
						}
					}
					else {
						sdParameters = { type: 'stable-diffusion-webui', data: combinedText };
					}
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
						let commentData;
						if (Buffer.isBuffer(result.tags.UserComment)) {
							commentData = result.tags.UserComment.toString('utf8');
						}
						else {
							commentData = result.tags.UserComment;
						}

						if (isJsonString(commentData)) {
							const jsonObj = JSON.parse(commentData);
							const metadataType = detectMetadataType(jsonObj);
							if (metadataType === 'swarmui') {
								sdParameters = { type: 'swarmui', data: jsonObj };
							}
							else if (metadataType === 'comfyui') {
								sdParameters = { type: 'comfyui', data: jsonObj };
							}
							else {
								sdParameters = { type: 'stable-diffusion-webui', data: commentData };
							}
						}
						else {
							sdParameters = { type: 'stable-diffusion-webui', data: commentData };
						}
					}
					catch (e) {
						console.error('Error decoding UserComment:', e);
						sdParameters = { type: 'stable-diffusion-webui', data: result.tags.UserComment.toString() };
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

async function parseSDmetadata(metadataString) {
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

async function parseComfyUIMetadata(metadataObject) {
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

	if (metadataObject.workflow) {
		// Look for common nodes and extract information
		for (const nodeId in metadataObject.workflow.nodes) {
			const node = metadataObject.workflow.nodes[nodeId];
			if (node.class_type === 'KSampler' || node.class_type === 'KSamplerAdvanced') {
				if (node.inputs) {
					if (node.inputs.seed !== undefined) parsed.parameters.Seed = String(node.inputs.seed);
					if (node.inputs.steps !== undefined) parsed.parameters.Steps = String(node.inputs.steps);
					if (node.inputs.cfg !== undefined) parsed.parameters['CFG scale'] = String(node.inputs.cfg);
					if (node.inputs.sampler_name !== undefined) parsed.parameters.Sampler = node.inputs.sampler_name;
					if (node.inputs.denoise !== undefined) parsed.parameters['Denoising strength'] = String(node.inputs.denoise);
					if (node.inputs.schedule !== undefined) parsed.parameters['Schedule Type'] = node.inputs.schedule;
				}
			}
			else if (node.class_type === 'CheckpointLoaderSimple' && node.inputs) {
				if (node.inputs.ckpt_name !== undefined) parsed.parameters.Model = node.inputs.ckpt_name;
			}
			else if (node.class_type === 'CLIPTextEncode' && node.inputs) {
				const text = node.inputs.text;
				if (text) {
					if (text.length > 100 && parsed.positivePrompt === 'N/A') {
						parsed.positivePrompt = text;
					}
					else if (parsed.positivePrompt === 'N/A') {
						parsed.positivePrompt = text;
					}
					else if (parsed.negativePrompt === 'N/A') {
						parsed.negativePrompt = text;
					}
				}
			}
			else if (node.class_type === 'LoraLoader' && node.inputs) {
				if (node.inputs.lora_name) {
					if (parsed.parameters.Model !== 'N/A') {
						parsed.parameters.Model += ` + Lora: ${node.inputs.lora_name}`;
					}
					else {
						parsed.parameters.Model = `Lora: ${node.inputs.lora_name}`;
					}
				}
			}
			else if (node.class_type === 'ImageScale' && node.inputs) {
				if (node.inputs.width && node.inputs.height) {
					parsed.parameters.Size = `${node.inputs.width}x${node.inputs.height}`;
				}
			}
		}
	}

	if (!parsed.positivePrompt || parsed.positivePrompt === '') {
		parsed.positivePrompt = 'N/A';
	}
	if (!parsed.negativePrompt || parsed.negativePrompt === '') {
		parsed.negativePrompt = 'N/A';
	}

	return parsed;
}

async function parseSwarmUIMetadata(metadataObject) {
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

	if (metadataObject.sui_image_params) {
		const params = metadataObject.sui_image_params;

		// Extract prompts
		if (params.prompt) {
			parsed.positivePrompt = params.prompt;
		}
		if (params.negativeprompt) {
			parsed.negativePrompt = params.negativeprompt;
		}

		// Extract parameters
		if (params.model) parsed.parameters.Model = params.model;
		if (params.seed !== undefined) parsed.parameters.Seed = String(params.seed);
		if (params.steps !== undefined) parsed.parameters.Steps = String(params.steps);
		if (params.cfgscale !== undefined) parsed.parameters['CFG scale'] = String(params.cfgscale);
		if (params.sampler) parsed.parameters.Sampler = params.sampler;
		if (params.scheduler) parsed.parameters['Schedule Type'] = params.scheduler;
		if (params.width && params.height) {
			parsed.parameters.Size = `${params.width}x${params.height}`;
		}
		if (params.initimagecreativity !== undefined) {
			parsed.parameters['Denoising strength'] = String(params.initimagecreativity);
		}
		if (params.vae) {
			parsed.parameters.Model += ` (VAE: ${params.vae})`;
		}
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
	parseStableDiffusionMetadata: parseSDmetadata,
	parseComfyUIMetadata,
	parseSwarmUIMetadata,
};