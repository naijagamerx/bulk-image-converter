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

        if (source instanceof HTMLCanvasElement || (typeof OffscreenCanvas !== 'undefined' && source instanceof OffscreenCanvas)) {
            workingCanvas = source;
        } else if (typeof self.ImageBitmap !== 'undefined' && source instanceof self.ImageBitmap) {
            if (typeof OffscreenCanvas !== 'undefined') {
                workingCanvas = new OffscreenCanvas(source.width, source.height);
            } else {
                try {
                    // This is a fallback and might not work in very strict workers
                    // or if OffscreenCanvas is the only supported path for canvas creation.
                    workingCanvas = new self.HTMLCanvasElement(); // Not standard, but trying to see if polyfill/env supports
                    workingCanvas.width = source.width;
                    workingCanvas.height = source.height;
                } catch (e) {
                     try { // Fallback for some polyfills or less strict envs
                        workingCanvas = document.createElement('canvas');
                        workingCanvas.width = source.width;
                        workingCanvas.height = source.height;
                     } catch (e2) {
                        rejectProcess(new Error('Worker: HTMLCanvasElement cannot be created (OffscreenCanvas also unavailable).'));
                        return;
                     }
                }
            }
            ctx = workingCanvas.getContext('2d');
            if (!ctx) return rejectProcess(new Error('Worker: Could not get 2D context from working canvas.'));
            ctx.drawImage(source, 0, 0);
        } else {
            return rejectProcess(new Error('Worker: Invalid source type for canvas processing. Must be Canvas or ImageBitmap.'));
        }

        ctx = workingCanvas.getContext('2d');
        if (!ctx) return rejectProcess(new Error('Worker: Could not get 2D context from final working canvas.'));

        if (targetOutputFormat === 'image/jpeg' || targetOutputFormat === 'image/bmp') {
            let backgroundCanvas;
            if (typeof OffscreenCanvas !== 'undefined') {
                backgroundCanvas = new OffscreenCanvas(workingCanvas.width, workingCanvas.height);
            } else {
                 try {
                    backgroundCanvas = new self.HTMLCanvasElement(); // or document.createElement if available
                    backgroundCanvas.width = workingCanvas.width;
                    backgroundCanvas.height = workingCanvas.height;
                 } catch (e) {
                     try {
                        backgroundCanvas = document.createElement('canvas');
                        backgroundCanvas.width = workingCanvas.width;
                        backgroundCanvas.height = workingCanvas.height;
                     } catch (e2) {
                        rejectProcess(new Error('Worker: HTMLCanvasElement cannot be created for background fill.'));
                        return;
                     }
                 }
            }
            const bgCtx = backgroundCanvas.getContext('2d');
             if (!bgCtx) {
                return rejectProcess(new Error('Worker: Could not get 2D context for background canvas.'));
            }
            bgCtx.fillStyle = '#FFFFFF';
            bgCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
            bgCtx.drawImage(workingCanvas, 0, 0);
            workingCanvas = backgroundCanvas;
        }

        const qualityArgument = (targetOutputFormat === 'image/jpeg' || targetOutputFormat === 'image/webp') ? targetQuality : undefined;

        if (workingCanvas.convertToBlob) {
            workingCanvas.convertToBlob({ type: targetOutputFormat, quality: qualityArgument })
                .then(blob => {
                    if (blob) resolveProcess(blob);
                    else rejectProcess(new Error(`Worker: OffscreenCanvas toBlob failed for ${targetOutputFormat}. Unsupported format?`));
                })
                .catch(err => rejectProcess(new Error(`Worker: OffscreenCanvas toBlob error for ${targetOutputFormat}: ${err.message}`)));
        } else if (typeof workingCanvas.toBlob === 'function') { // Check if toBlob exists (for HTMLCanvasElement)
            workingCanvas.toBlob(
                (blob) => {
                    if (blob) resolveProcess(blob);
                    else rejectProcess(new Error(`Worker: HTMLCanvasElement toBlob failed for ${targetOutputFormat}. Unsupported format or tainted canvas?`));
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
