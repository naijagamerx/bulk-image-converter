// js/worker.js

self.onmessage = async function(event) {
  const { file, outputFormat, quality, originalName, index } = event.data; // originalName here is file.name

  try {
    const convertedBlob = await convertImageOnWorker(file, outputFormat, quality);
    self.postMessage({
      blob: convertedBlob,
      originalFileName: originalName, // Send back the original file name
      outputFormat: outputFormat, // Send back output format for main thread's generateOutputFilename
      index: index,
      success: true
    });
  } catch (error) {
    self.postMessage({
      error: error.message,
      originalFileName: originalName, // Send back the original file name
      index: index,
      success: false
    });
  }
};

// Actual image conversion logic using Canvas API (or OffscreenCanvas if preferred and available)
function convertImageOnWorker(file, outputFormat, quality) {
  return new Promise(async (resolve, reject) => {
    const { type: inputFileType, name: inputFileName } = file;

    // Early exit for SVG to SVG (pass-through)
    if (inputFileType === 'image/svg+xml' && outputFormat === 'image/svg+xml') {
      console.log(`Worker: Passing through SVG ${inputFileName}`);
      resolve(file); // Resolve with the original File object (which is a Blob)
      return;
    }

    // Handle specific output format rejections first
    if (outputFormat === 'image/tiff') {
      return reject(new Error(`Worker: Conversion to TIFF output is not implemented yet.`));
    }
    if (outputFormat === 'image/x-icon') {
      return reject(new Error(`Worker: Conversion to ICO output is not implemented yet.`));
    }
    // Note: GIF output from non-GIF input (or animated to static) is handled by canvas toBlob if browser supports 'image/gif'
    // TIFF input is handled below.

    let sourceCanvas; // This will hold the canvas derived from input (either from TIFF or Image element)

    if (inputFileType === 'image/tiff') {
      try {
        console.log(`Worker: Decoding TIFF ${inputFileName}`);
        const arrayBuffer = await file.arrayBuffer();
        const tiff = new Tiff({ buffer: arrayBuffer });
        // Assuming we use the first image/page in the TIFF
        if (!tiff.countDirectory()) {
            return reject(new Error(`Worker: No image directory found in TIFF file ${inputFileName}.`));
        }
        tiff.setDirectory(0); // Set to the first directory/image
        sourceCanvas = tiff.toCanvas(); // This creates a new canvas element with the TIFF image
        if (!sourceCanvas) {
            return reject(new Error(`Worker: Failed to convert TIFF to canvas for ${inputFileName}.`));
        }
      } catch (err) {
        console.error(`Worker: Error decoding TIFF ${inputFileName}:`, err);
        return reject(new Error(`Worker: Error decoding TIFF ${inputFileName}: ${err.message}`));
      }
    }

    // For non-TIFF inputs or after TIFF is decoded to sourceCanvas
    const processWithCanvas = (imageSource) => { // imageSource can be an HTMLImageElement or an HTMLCanvasElement (from TIFF)
        let mainCanvas; // The canvas we will perform final operations on
        let ctx;

        if (imageSource instanceof HTMLCanvasElement) { // If input was TIFF, sourceCanvas is already a canvas
            mainCanvas = imageSource; // Use TIFF canvas directly if output is same size or no specific resize needed
                                      // Or, if resizing/compositing needed, copy from it:
            // mainCanvas = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(imageSource.width, imageSource.height) : document.createElement('canvas');
            // mainCanvas.width = imageSource.width;
            // mainCanvas.height = imageSource.height;
            // ctx = mainCanvas.getContext('2d');
            // ctx.drawImage(imageSource, 0, 0);
            // For simplicity, if sourceCanvas is the TIFF canvas, we use it directly.
            // This means output size will be TIFF original size.
        } else { // HTMLImageElement for PNG, JPG, GIF, BMP, SVG etc.
            if (typeof OffscreenCanvas !== 'undefined') {
                mainCanvas = new OffscreenCanvas(imageSource.naturalWidth || imageSource.width, imageSource.naturalHeight || imageSource.height);
            } else {
                mainCanvas = document.createElement('canvas');
                mainCanvas.width = imageSource.naturalWidth || imageSource.width;
                mainCanvas.height = imageSource.naturalHeight || imageSource.height;
            }
        }

        ctx = mainCanvas.getContext('2d');
        if (!ctx) { // Should not happen if canvas is obtained correctly
            return reject(new Error('Worker: Could not get 2D context from canvas.'));
        }

        // If imageSource was an HTMLImageElement, draw it to mainCanvas
        // If it was a TIFF canvas (sourceCanvas === mainCanvas), this drawImage is redundant if no processing is done.
        // However, if mainCanvas was created anew from sourceCanvas dimensions, this draw is necessary.
        // For simplicity in this refactor, let's assume if sourceCanvas (TIFF) is used, it IS mainCanvas.
        // If imageSource is an HTMLImageElement, it needs to be drawn.
        if (imageSource instanceof HTMLImageElement) {
             ctx.drawImage(imageSource, 0, 0);
        }


        // Apply white background if output format doesn't support transparency (JPEG, BMP)
        if (outputFormat === 'image/jpeg' || outputFormat === 'image/bmp') {
            // Create a temporary canvas to draw current mainCanvas content over white
            let tempCanvas;
            if (typeof OffscreenCanvas !== 'undefined') {
                tempCanvas = new OffscreenCanvas(mainCanvas.width, mainCanvas.height);
            } else {
                tempCanvas = document.createElement('canvas');
                tempCanvas.width = mainCanvas.width;
                tempCanvas.height = mainCanvas.height;
            }
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.fillStyle = '#FFFFFF';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(mainCanvas, 0, 0); // Draw existing content (which might be transparent) over white
            mainCanvas = tempCanvas; // Replace mainCanvas with this new one
        }

        const qualityArgument = (outputFormat === 'image/jpeg' || outputFormat === 'image/webp') ? quality : undefined;

        // Convert final mainCanvas to Blob
        if (mainCanvas.convertToBlob) { // OffscreenCanvas path
            mainCanvas.convertToBlob({ type: outputFormat, quality: qualityArgument })
                .then(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error(`Worker: OffscreenCanvas toBlob failed for ${outputFormat}. Unsupported format?`));
                })
                .catch(err => reject(new Error(`Worker: OffscreenCanvas toBlob error for ${outputFormat}: ${err.message}`)));
        } else { // HTMLCanvasElement path
            mainCanvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error(`Worker: HTMLCanvasElement toBlob failed for ${outputFormat}. Unsupported format or tainted canvas?`));
                },
                outputFormat,
                qualityArgument
            );
        }
    };

    if (sourceCanvas) { // If TIFF input was processed
      processWithCanvas(sourceCanvas);
    } else { // For all other inputs (PNG, JPG, WebP, GIF, BMP, SVG that's not SVG->SVG)
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        // Potentially enable crossOrigin for SVGs if they might contain external refs and are loaded from data URLs
        // However, for File objects, this is usually not an issue.
        // img.crossOrigin = "anonymous";
        img.onload = function() {
          processWithCanvas(img);
        };
        img.onerror = () => reject(new Error(`Worker: Failed to load image data for ${inputFileName} (type: ${inputFileType}). Corrupt or unsupported by Image element.`));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error(`Worker: FileReader failed for ${inputFileName}.`));
      reader.readAsDataURL(file);
    }
  });
}
