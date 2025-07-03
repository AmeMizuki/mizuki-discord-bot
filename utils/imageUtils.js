const sharp = require('sharp');

async function downloadImage(url) {
	const { default: fetch } = await import('node-fetch');
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch image ${url}: ${response.statusText}`);
	}
	return response.buffer();
}

async function stitchImages(imageUrls) {
	if (!imageUrls || imageUrls.length === 0) {
		return null;
	}

	try {
		const imageBuffers = await Promise.all(imageUrls.map(url => downloadImage(url)));

		const images = imageBuffers.map(buffer => sharp(buffer));
		const metadatas = await Promise.all(images.map(image => image.metadata()));

		const totalWidth = metadatas.reduce((sum, meta) => sum + meta.width, 0);
		const maxHeight = Math.max(...metadatas.map(meta => meta.height));

		const compositeImage = sharp({
			create: {
				width: totalWidth,
				height: maxHeight,
				channels: 4,
				background: { r: 0, g: 0, b: 0, alpha: 0 },
			},
		});

		const compositeOperations = [];
		let leftOffset = 0;
		for (let i = 0; i < imageBuffers.length; i++) {
			compositeOperations.push({
				input: imageBuffers[i],
				top: Math.floor((maxHeight - metadatas[i].height) / 2),
				left: leftOffset,
			});
			leftOffset += metadatas[i].width;
		}

		return compositeImage.composite(compositeOperations).png().toBuffer();
	}
	catch (error) {
		console.error('Failed to stitch images:', error);
		return null;
	}
}

module.exports = { stitchImages };