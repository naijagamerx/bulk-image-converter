// Contains image conversion logic for standard images and TIFFs for the Web Worker

// This function is a core utility to take a source (ImageBitmap or Canvas)
// and convert it to a target blob format.
// It needs to be accessible to any part of the worker that produces a canvas/bitmap
// that needs final conversion (e.g., after TIFF decoding, after MD-to-Image rendering).
// For importScripts, it will be attached to 'self' or be in the global worker scope.

// Define processSourceToBlob in the global scope of the worker scripts
// or ensure it's loaded first and attached to self if other scripts need it.
// For now, assuming it's globally available after scripts are imported.

function processSourceToBlob(source, targetOutputFormat, targetQuality) {
    return new Promise((resolveProcess, rejectProcess) => {
        let workingCanvas;
        let ctx;

        // Check if OffscreenCanvas is available, which is preferred in workers.
        if (typeof OffscreenCanvas === 'undefined') {
            // If source is already a canvas type that's not OffscreenCanvas (e.g. HTMLCanvasElement from Tiff.js)
            // and OffscreenCanvas is unavailable, we might have an issue or need to rely on its toBlob.
            // However, any *new* canvas creation for processing (e.g. for ImageBitmap, background) requires OffscreenCanvas.
            if (source instanceof HTMLCanvasElement) {
                // Allow processing if source is HTMLCanvasElement and OffscreenCanvas is unavailable
                // but this path will only work if HTMLCanvasElement.toBlob is functional.
                workingCanvas = source;
            } else if (typeof self.ImageBitmap !== 'undefined' && source instanceof self.ImageBitmap) {
                // ImageBitmap needs a canvas to be drawn onto, and OffscreenCanvas is not available.
                return rejectProcess(new Error('Worker: OffscreenCanvas is not supported, required for ImageBitmap conversion.'));
            } else if (!(source instanceof HTMLCanvasElement)) { // If not ImageBitmap and not HTMLCanvasElement
                 return rejectProcess(new Error('Worker: OffscreenCanvas is not supported and source is not a direct HTMLCanvasElement.'));
            }
            // If we reached here with an HTMLCanvasElement, proceed, but new canvases (e.g. for background) cannot be made.
        }


        if (typeof OffscreenCanvas !== 'undefined' && source instanceof OffscreenCanvas) {
            workingCanvas = source;
        } else if (source instanceof HTMLCanvasElement) { // Source could be from Tiff.js if OffscreenCanvas was not used by Tiff.js
            workingCanvas = source;
        } else if (typeof self.ImageBitmap !== 'undefined' && source instanceof self.ImageBitmap) {
            if (typeof OffscreenCanvas === 'undefined') { // Should have been caught above, but as a safeguard
                return rejectProcess(new Error('Worker: OffscreenCanvas is not supported (already checked), cannot process ImageBitmap.'));
            }
            workingCanvas = new OffscreenCanvas(source.width, source.height);
            ctx = workingCanvas.getContext('2d');
            if (!ctx) return rejectProcess(new Error('Worker: Could not get 2D context from OffscreenCanvas for ImageBitmap.'));
            ctx.drawImage(source, 0, 0);
        } else {
            return rejectProcess(new Error('Worker: Invalid source type. Must be OffscreenCanvas, HTMLCanvasElement (from Tiff), or ImageBitmap.'));
        }

        ctx = workingCanvas.getContext('2d');
        if (!ctx) return rejectProcess(new Error('Worker: Could not get 2D context from final working canvas.'));

        if (targetOutputFormat === 'image/jpeg' || targetOutputFormat === 'image/bmp') {
            if (typeof OffscreenCanvas === 'undefined') {
                // If workingCanvas is an HTMLCanvasElement, we can't create a new background OffscreenCanvas.
                // This implies that background filling for HTMLCanvasElement without OffscreenCanvas support is not possible here.
                // However, the primary goal is to avoid worker errors. If OffscreenCanvas is needed and absent, it's an issue.
                return rejectProcess(new Error('Worker: OffscreenCanvas is not supported, required for background fill.'));
            }
            // Create a new OffscreenCanvas for background fill
            const backgroundCanvas = new OffscreenCanvas(workingCanvas.width, workingCanvas.height);
            const bgCtx = backgroundCanvas.getContext('2d');
            if (!bgCtx) {
                return rejectProcess(new Error('Worker: Could not get 2D context for background OffscreenCanvas.'));
            }
            bgCtx.fillStyle = '#FFFFFF';
            bgCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
            bgCtx.drawImage(workingCanvas, 0, 0);
            workingCanvas = backgroundCanvas; // Now workingCanvas is guaranteed to be an OffscreenCanvas if this path was taken
        }

        const qualityArgument = (targetOutputFormat === 'image/jpeg' || targetOutputFormat === 'image/webp') ? targetQuality : undefined;

        // Prioritize convertToBlob if available (OffscreenCanvas)
        if (typeof workingCanvas.convertToBlob === 'function') {
            workingCanvas.convertToBlob({ type: targetOutputFormat, quality: qualityArgument })
                .then(blob => {
                    if (blob) resolveProcess(blob);
                    else rejectProcess(new Error(`Worker: OffscreenCanvas.convertToBlob failed for ${targetOutputFormat}.`));
                })
                .catch(err => rejectProcess(new Error(`Worker: OffscreenCanvas.convertToBlob error for ${targetOutputFormat}: ${err.message}`)));
        } else if (typeof workingCanvas.toBlob === 'function') { // Fallback for HTMLCanvasElement (e.g. from Tiff.js)
            workingCanvas.toBlob(
                (blob) => {
                    if (blob) resolveProcess(blob);
                    else rejectProcess(new Error(`Worker: HTMLCanvasElement.toBlob failed for ${targetOutputFormat}.`));
                },
                targetOutputFormat,
                qualityArgument
            );
        } else {
            rejectProcess(new Error('Worker: Canvas does not support toBlob or convertToBlob.'));
        }
    });
}
self.processSourceToBlob = processSourceToBlob; // Make it globally available in worker after importScripts

self.handleTiffInput = function(file, outputFormat, quality) {
    return new Promise(async (resolve, reject) => {
        if (!self.Tiff) {
            return reject(new Error("Worker: TIFF library (Tiff.js) not available."));
        }
        // OffscreenCanvas check should ideally be here if Tiff.js output (canvas) needs further OffscreenCanvas operations
        // However, processSourceToBlob will handle it if Tiff.js produces an HTMLCanvasElement and background fill is needed.

        try {
            const arrayBuffer = await file.arrayBuffer();
            const tiff = new self.Tiff({ buffer: arrayBuffer });
            if (!tiff.countDirectory()) {
                return reject(new Error(`Worker: No image directory found in TIFF file ${file.name}.`));
            }
            tiff.setDirectory(0);
            const sourceCanvas = tiff.toCanvas();
            if (!sourceCanvas) {
                return reject(new Error(`Worker: Failed to convert TIFF to canvas for ${file.name}.`));
            }
            // processSourceToBlob will check for OffscreenCanvas if it needs to create new canvases
            self.processSourceToBlob(sourceCanvas, outputFormat, quality).then(resolve).catch(reject);
        } catch (err) {
            reject(new Error(`Worker: Error decoding TIFF ${file.name}: ${err.message}`));
        }
    });
};

self.handleStandardImageInput = function(file, outputFormat, quality) {
    return new Promise(async (resolve, reject) => {
        if (typeof self.createImageBitmap === 'undefined') {
            return reject(new Error('Worker: createImageBitmap is not available.'));
        }
        try {
            const imageBitmap = await self.createImageBitmap(file);
            self.processSourceToBlob(imageBitmap, outputFormat, quality).then(resolve).catch(reject);
        } catch (e) {
            reject(new Error(`Worker: Failed to load image data for ${file.name} using createImageBitmap: ${e.message}`));
        }
    });
};

// SVG pass-through is simple enough to be in mainWorker or here.
self.handleSvgPassThrough = function(file) {
    return Promise.resolve(file); // Just return the original file blob.
};
