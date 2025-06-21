import { state } from './state.js';
import {
    createIndividualDownloadLink,
    displayMessage,
    updateProgress,
    generateOutputFilename
} from './uiHandlers.js';

// Path to the new worker entry point will be 'js/worker/mainWorker.js'
// For now, let's assume the worker script is still named 'js/worker.js'
// and will be renamed/moved in Phase 2 of refactoring.
// const workerPath = 'js/worker.js'; // Will be 'js/worker/mainWorker.js' later

// Initialize the Web Worker
let workerInstance = null;
if (window.Worker) {
    // The path will be updated in Phase 2 when worker files are refactored
    workerInstance = new Worker('js/worker/mainWorker.js'); // Updated path

    workerInstance.onmessage = (event) => {
        const { blob, originalFileName, outputFormat: workerOutputFormat, index, success, error } = event.data;
        const convertButton = document.getElementById('convertButton');
        const downloadZipButton = document.getElementById('downloadZipButton');

        if (success) {
            // Pass workerOutputFormat to generateOutputFilename if it needs to know the actual converted format
            // instead of relying solely on the outputFormatSelect.value from UI for extension.
            // For now, generateOutputFilename uses DOM state for output format if not passed.
            const finalOutputName = generateOutputFilename(originalFileName, index, workerOutputFormat);

            state.convertedBlobs[index] = { blob, originalName: finalOutputName };

            createIndividualDownloadLink(blob, finalOutputName);

            const convertedPreviewArea = document.getElementById('convertedPreviewArea');
            if (convertedPreviewArea) {
                if (processedFiles === 0 && convertedPreviewArea.querySelector('p')) { // Check processedFiles instead of index
                    convertedPreviewArea.innerHTML = '';
                }
                // Previews for actual images; MD/PDF won't create an img tag here directly
                // but the main thread might handle their specific preview if needed.
                // For blobs that are images:
                if (blob.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    const objectURL = URL.createObjectURL(blob);
                    img.src = objectURL;
                    state.previewUrls.push(objectURL); // Track for revocation
                    img.classList.add('rounded-md', 'shadow-sm', 'object-contain', 'w-full', 'h-32', 'animate-fade-in');
                    img.alt = `Converted ${finalOutputName}`;
                    img.title = finalOutputName;
                    convertedPreviewArea.appendChild(img);
                } else if (blob.type === 'application/pdf') {
                    // For PDF, we might show a generic icon or filename if not an image.
                    // This part is about the *converted* file preview.
                    // The createIndividualDownloadLink already handles the link.
                    // For now, no specific preview for converted PDF, just the download link.
                }
            }

            const totalFiles = state.selectedFiles.length;
            // Count actual successful conversions based on blob presence
            const processedFiles = state.convertedBlobs.filter(b => b && b.blob).length;
            updateProgress(processedFiles, totalFiles);

            // Check if all *selected* files have received a response (either success or failure)
            const allResponsesReceived = state.convertedBlobs.filter(b => b !== undefined).length;

            if (allResponsesReceived === totalFiles) {
                if (processedFiles > 0) {
                    const downloadArea = document.getElementById('downloadArea');
                    if (downloadArea) downloadArea.classList.remove('hidden');
                    if (downloadZipButton) downloadZipButton.disabled = false;
                }
                displayMessage(`Successfully converted ${processedFiles} of ${totalFiles} files.`, false);
                if (convertButton) convertButton.disabled = false;
                if (processedFiles === 0 && convertedPreviewArea) {
                     convertedPreviewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center">No files were converted successfully.</p>';
                }
            }
        } else {
            state.convertedBlobs[index] = null; // Mark as failed
            console.error('Worker Error for file:', originalFileName, error);
            displayMessage(`Error converting ${originalFileName || `file at index ${index}`}: ${error}`);

            const totalFiles = state.selectedFiles.length;
            const allResponsesReceived = state.convertedBlobs.filter(b => b !== undefined).length;
            const successfulConversions = state.convertedBlobs.filter(b => b && b.blob).length;

            updateProgress(allResponsesReceived, totalFiles); // Update progress based on responses received

            if (allResponsesReceived === totalFiles) {
                if (convertButton) convertButton.disabled = false;
                if (successfulConversions > 0) {
                    const downloadArea = document.getElementById('downloadArea');
                    if (downloadArea) downloadArea.classList.remove('hidden');
                    if (downloadZipButton) downloadZipButton.disabled = false;
                } else {
                    const convertedPreviewArea = document.getElementById('convertedPreviewArea');
                    if (convertedPreviewArea) convertedPreviewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center">No files were converted successfully.</p>';
                }
            }
        }
    };

    workerInstance.onerror = (error) => {
        console.error('Worker onerror:', error);
        displayMessage(`Worker error: ${error.message}. Conversion process halted.`);
        const convertButton = document.getElementById('convertButton');
        if(convertButton) convertButton.disabled = false;

        const progressArea = document.getElementById('progressArea');
        if(progressArea) progressArea.classList.add('hidden');

        const convertedPreviewArea = document.getElementById('convertedPreviewArea');
        if(convertedPreviewArea) convertedPreviewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center">Conversion failed due to a worker error.</p>';
    };

} else {
    // This case should ideally be handled in app.js before workerClient is even used.
    // For now, if worker is not supported, workerInstance remains null.
    // UI should reflect that conversions might be slower or unavailable.
    // displayMessage is not available here as it's part of utils which might not be defined yet.
    console.warn('Web Workers are not supported in this browser. Conversion will run on the main thread or be unavailable.');
}

export const imageConversionWorker = workerInstance;

// Function to post a task to the worker
export function postTaskToWorker(file, outputFormat, quality, originalName, index) {
    if (imageConversionWorker) {
        imageConversionWorker.postMessage({
            file,
            outputFormat,
            quality,
            originalName,
            index
        });
    } else {
        // Handle the case where worker is not supported - perhaps a fallback?
        // For now, log an error. Fallback logic would be more complex.
        console.error("Web Worker not available. Cannot post task.");
        displayMessage("Web Worker not supported, cannot process files.", true);
    }
}
