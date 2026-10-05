const fetch = require('node-fetch').default;
const ExifParser = require('exif-parser');
const extractChunks = require('png-chunks-extract');
const { inflateSync } = require('node:zlib');

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
	if (!jsonObj || typeof jsonObj !== 'object') return 'unknown';
	if (jsonObj.sui_image_params || jsonObj.sui_extra_data) {
		return 'swarmui';
	}
	if (jsonObj.workflow || jsonObj.prompt || jsonObj.nodes ||
		(jsonObj.version && jsonObj.version.includes && jsonObj.version.includes('ComfyUI')) ||
		(typeof jsonObj === 'object' && Object.keys(jsonObj).some(key =>
			key.includes('workflow') || key.includes('comfy') || key.includes('node'))) ||
		Object.values(jsonObj).some(node => node && typeof node.class_type === 'string')) {
		return 'comfyui';
	}
	return 'unknown';
}

async function getMetadata(imageUrl, contentType) {
	try {
		const response = await fetch(imageUrl, { timeout: 10000 });
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
				const comfyData = {};
				const textChunks = [];
				for (const chunk of chunks) {
					if (chunk.name !== 'tEXt' && chunk.name !== 'zTXt') continue;
					const data = Buffer.from(chunk.data);
					const separator = data.indexOf(0);
					if (separator < 1) continue;
					const keyword = data.subarray(0, separator).toString('latin1');
					if (chunk.name === 'zTXt' && data[separator + 1] !== 0) continue;
					const text = chunk.name === 'zTXt'
						? inflateSync(data.subarray(separator + 2), { maxOutputLength: 16 * 1024 * 1024 }).toString('utf8')
						: data.subarray(separator + 1).toString('utf8');
					if ((keyword === 'prompt' || keyword === 'workflow') && isJsonString(text)) {
						const value = JSON.parse(text);
						if (value && typeof value === 'object') comfyData[keyword] = value;
					}
					else {
						textChunks.push(text);
					}
				}
				if (comfyData.prompt || comfyData.workflow) {
					const header = Buffer.from(chunks.find(chunk => chunk.name === 'IHDR').data);
					comfyData.imageSize = { width: header.readUInt32BE(0), height: header.readUInt32BE(4) };
					return { type: 'comfyui', data: comfyData };
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

function getComfyNodes(metadata) {
	const graph = metadata?.prompt || metadata?.workflow || metadata || {};
	const source = graph.nodes || graph;
	if (!Array.isArray(source)) {
		return new Map(Object.entries(source).filter(([, node]) => node && typeof node.class_type === 'string'));
	}

	// ponytail: workflow-only widget layouts cover standard nodes; custom nodes need the PNG's executed prompt graph.
	const widgetNames = {
		KSampler: ['seed', 'control_after_generate', 'steps', 'cfg', 'sampler_name', 'scheduler', 'denoise'],
		KSamplerAdvanced: ['add_noise', 'noise_seed', 'control_after_generate', 'steps', 'cfg', 'sampler_name', 'scheduler', 'start_at_step', 'end_at_step', 'return_with_leftover_noise'],
		CLIPTextEncode: ['text'],
		CLIPTextEncodeSDXL: ['width', 'height', 'crop_w', 'crop_h', 'target_width', 'target_height', 'text_g', 'text_l'],
		CLIPTextEncodeSDXLRefiner: ['ascore', 'width', 'height', 'text'],
		CheckpointLoaderSimple: ['ckpt_name'],
		CheckpointLoader: ['config_name', 'ckpt_name'],
		UNETLoader: ['unet_name', 'weight_dtype'],
		VAELoader: ['vae_name'],
		LoraLoader: ['lora_name', 'strength_model', 'strength_clip'],
		LoraLoaderModelOnly: ['lora_name', 'strength_model'],
		EmptyLatentImage: ['width', 'height', 'batch_size'],
		EmptySD3LatentImage: ['width', 'height', 'batch_size'],
		UpscaleModelLoader: ['model_name'],
		ImageScale: ['upscale_method', 'width', 'height', 'crop'],
		ImageScaleBy: ['upscale_method', 'scale_by'],
		LatentUpscale: ['upscale_method', 'width', 'height', 'crop'],
		LatentUpscaleBy: ['upscale_method', 'scale_by'],
		CLIPSetLastLayer: ['stop_at_clip_layer'],
		BasicScheduler: ['scheduler', 'steps', 'denoise'],
		KSamplerSelect: ['sampler_name'],
		RandomNoise: ['noise_seed', 'control_after_generate'],
		CFGGuider: ['cfg'],
		SamplerCustom: ['add_noise', 'noise_seed', 'control_after_generate', 'cfg'],
	};
	const links = new Map((Array.isArray(graph.links) ? graph.links : []).filter(Array.isArray).map(link => [link[0], link]));
	const nodes = new Map();
	for (const node of source) {
		if (!node || typeof node.type !== 'string' || node.mode === 2) continue;
		const inputs = {};
		let names = widgetNames[node.type] || [];
		const values = node.widgets_values || [];
		if (names.includes('control_after_generate') && values.length === names.length - 1) {
			names = names.filter(name => name !== 'control_after_generate');
		}
		if (node.mode !== 4) {
			if (Array.isArray(values)) names.forEach((name, index) => { inputs[name] = values[index]; });
			else Object.assign(inputs, values);
		}
		for (const input of node.inputs || []) {
			const link = links.get(input.link);
			if (link) inputs[input.name] = [String(link[1]), link[2]];
		}
		nodes.set(String(node.id), { class_type: node.mode === 4 ? 'Bypass' : node.type, inputs });
	}
	return nodes;
}

async function parseComfyUIMetadata(metadataObject) {
	const parsed = { positivePrompt: 'N/A', negativePrompt: 'N/A', parameters: {} };
	const nodes = getComfyNodes(metadataObject);
	const linkId = value => Array.isArray(value) && value.length === 2 && Number.isInteger(value[1]) && nodes.has(String(value[0]))
		? String(value[0]) : null;
	function upstream(ids) {
		const visited = new Set();
		const stack = [...ids];
		while (stack.length) {
			const id = stack.pop();
			if (!nodes.has(id) || visited.has(id)) continue;
			visited.add(id);
			for (const input of Object.values(nodes.get(id).inputs || {})) {
				const linked = linkId(input);
				if (linked !== null) stack.push(linked);
			}
		}
		return visited;
	}
	const outputs = [...nodes].filter(([, node]) => node.class_type === 'SaveImage' || node.class_type === 'PreviewImage').map(([id]) => id);
	const active = outputs.length ? upstream(outputs) : new Set(nodes.keys());
	const parameters = new Map();
	function add(key, value) {
		if ((typeof value !== 'string' && typeof value !== 'number') || value === '') return;
		if (!parameters.has(key)) parameters.set(key, new Set());
		parameters.get(key).add(String(value));
	}
	const promptLinks = { positivePrompt: [], negativePrompt: [] };
	for (const id of active) {
		const { class_type: type, inputs = {} } = nodes.get(id);
		for (const [input, key] of Object.entries({
			steps: 'Steps', cfg: 'CFG scale', sampler_name: 'Sampler', scheduler: 'Schedule Type',
			seed: 'Seed', noise_seed: 'Seed', denoise: 'Denoising strength', stop_at_clip_layer: 'Clip skip',
			ckpt_name: 'Model', unet_name: 'Model', vae_name: 'VAE',
		})) {
			add(key, inputs[input]);
		}
		if (typeof inputs.lora_name === 'string') {
			const strengths = ['strength_model', 'strength_clip']
				.filter(key => typeof inputs[key] === 'number')
				.map(key => `${key === 'strength_model' ? 'model' : 'clip'}: ${inputs[key]}`);
			add('LoRA', inputs.lora_name + (strengths.length ? ` (${strengths.join(', ')})` : ''));
		}
		if (type === 'UpscaleModelLoader') add('Upscale model', inputs.model_name);
		if (typeof inputs.upscale_method === 'string' || linkId(inputs.upscale_model) !== null) {
			let method = `${type}${typeof inputs.upscale_method === 'string' ? `: ${inputs.upscale_method}` : ''}`;
			if (typeof inputs.scale_by === 'number') method += ` (x${inputs.scale_by})`;
			if (typeof inputs.upscale_by === 'number') method += ` (x${inputs.upscale_by})`;
			add('Upscale method', method);
		}
		if (!parsed.parameters.Size && /^(Empty.*LatentImage|ImageScale|LatentUpscale)$/.test(type) && inputs.width > 0 && inputs.height > 0) {
			parsed.parameters.Size = `${inputs.width}x${inputs.height}`;
		}
		const conditioningInputs = type === 'BasicGuider' ? [['conditioning', 'positivePrompt']] : [['positive', 'positivePrompt'], ['negative', 'negativePrompt']];
		for (const [input, key] of conditioningInputs) {
			const linked = linkId(inputs[input]);
			if (linked !== null) promptLinks[key].push(linked);
		}
	}
	for (const [key, ids] of Object.entries(promptLinks)) {
		const texts = new Set();
		for (const id of upstream(ids)) {
			const node = nodes.get(id);
			if (!node.class_type.startsWith('CLIPTextEncode')) continue;
			for (const input of ['text', 'text_g', 'text_l']) {
				const text = node.inputs?.[input];
				if (typeof text === 'string' && text.trim()) texts.add(text.trim());
			}
		}
		if (texts.size) parsed[key] = [...texts].join('\n');
	}
	for (const [key, values] of parameters) parsed.parameters[key] = [...values].join('\n');
	if (metadataObject?.imageSize?.width > 0 && metadataObject.imageSize.height > 0) {
		parsed.parameters.Size = `${metadataObject.imageSize.width}x${metadataObject.imageSize.height}`;
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