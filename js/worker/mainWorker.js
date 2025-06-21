// Main Worker Script: Entry point for image and document conversion tasks

// Import supporting scripts. Order might matter if one script depends on another.
// imageConverter.js defines processSourceToBlob which markdownConverter.js might use.
try {
    importScripts('imageConverter.js', 'markdownConverter.js');
} catch (e) {
    console.error("Worker: Failed to import scripts", e);
    // If scripts fail to load, the worker is likely non-functional.
    // Post an error message back or throw to make it noticeable.
    self.postMessage({ error: "Worker script initialization failed.", success: false, index: -1 });
    throw e; // Stop further execution
}


self.onmessage = async function(event) {
  const { file, outputFormat, quality, originalName, index } = event.data;
  const inputFileType = file.type; // Get file type from the File object

  console.log(`Worker (${originalName}): Received task: Convert ${inputFileType} to ${outputFormat}`);

  try {
    let convertedBlob;

    if (inputFileType === 'image/svg+xml' && outputFormat === 'image/svg+xml') {
        // SVG pass-through is simple, can be handled directly or by a helper
        if (typeof self.handleSvgPassThrough === 'function') {
            convertedBlob = await self.handleSvgPassThrough(file);
        } else {
            throw new Error("SVG pass-through handler not found.");
        }
    } else if (inputFileType === 'image/tiff') {
        if (typeof self.handleTiffInput === 'function') {
            convertedBlob = await self.handleTiffInput(file, outputFormat, quality);
        } else {
            throw new Error("TIFF input handler not found.");
        }
    } else if (inputFileType === 'text/markdown') {
        if (typeof self.handleMarkdownConversion === 'function') {
            convertedBlob = await self.handleMarkdownConversion(file, outputFormat, quality);
        } else {
            throw new Error("Markdown conversion handler not found.");
        }
    } else if (inputFileType.startsWith('image/')) { // Standard image types like PNG, JPEG, GIF, BMP, WEBP
        if (typeof self.handleStandardImageInput === 'function') {
            convertedBlob = await self.handleStandardImageInput(file, outputFormat, quality);
        } else {
            throw new Error("Standard image input handler not found.");
        }
    } else {
        throw new Error(`Worker: Unsupported input file type: ${inputFileType}`);
    }

    self.postMessage({
      blob: convertedBlob,
      originalFileName: originalName,
      outputFormat: outputFormat, // Send back the actual output format used/intended
      index: index,
      success: true
    });

  } catch (error) {
    console.error(`Worker (${originalName}): Error during conversion:`, error);
    self.postMessage({
      error: error.message || 'An unknown error occurred in the worker.',
      originalFileName: originalName,
      index: index,
      outputFormat: outputFormat, // Send back what was attempted
      success: false
    });
  }
};

console.log("Worker: mainWorker.js initialized and onmessage handler set.");
