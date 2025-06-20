// Global state for the simplified converter
const state = {
    selectedFiles: [],
    convertedBlobs: [] // To hold blobs for download
};

// Utility functions
const utils = {
    displayMessage(message, isError = true) {
        const messageArea = document.getElementById('messageArea');
        if (messageArea) {
            messageArea.textContent = message;
            messageArea.classList.remove('hidden');
            messageArea.classList.toggle('text-red-600', isError);
            messageArea.classList.toggle('text-green-600', !isError);
        } else {
            console.error('Message area not found. Message:', message);
        }
    },

    clearPreviewsAndResults() {
        state.selectedFiles = [];
        state.convertedBlobs = [];
        
        const messageArea = document.getElementById('messageArea');
        if (messageArea) {
            messageArea.textContent = '';
            messageArea.classList.add('hidden');
        }

        const convertButton = document.getElementById('convertButton');
        if (convertButton) {
            convertButton.disabled = true;
        }

        const individualLinksArea = document.getElementById('individualLinksArea');
        if (individualLinksArea) {
            individualLinksArea.innerHTML = '';
        }
    },

    createIndividualDownloadLink(blob, filename) {
        const url = URL.createObjectURL(blob);
        // Note: No state.previewUrls to push to in this simplified version for this specific link,
        // as it's assumed the link itself is the main way to access the blob, and full page clears will occur.
        // For a more robust app with previews, managing these URLs would be important.

        const individualLinksArea = document.getElementById('individualLinksArea');
        if (!individualLinksArea) {
            console.error("individualLinksArea not found. Cannot create download link.");
            return;
        }
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.className = 'text-sm bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded transition-colors flex items-center justify-center';
        link.innerHTML = `<i class="fas fa-download mr-2"></i>${filename}`;
        
        const wrapper = document.createElement('div');
        wrapper.appendChild(link);
        individualLinksArea.appendChild(wrapper);
    }
};

// Format handling (simplified)
const formatHandlers = {
    updateFileInputAccept() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.accept = 'image/png'; // Hardcoded for PNG input
        }
        // Static hint in HTML, no dynamic update needed here.
    }
};

// Conversion logic (simplified for PNG to JPG)
const converter = {
    generateOutputFilename(originalName, index) {
        // index is not used in this simplified version but kept for signature compatibility if needed later
        const baseName = originalName.replace(/\.[^/.]+$/, '');
        return `${baseName}_converted.jpg`; // Fixed output extension
    },

    convertFile(file, index) { // quality parameter removed
        return new Promise((resolve, reject) => {
            if (file.type !== 'image/png') {
                return reject(new Error('Invalid file type. Only PNG is supported for conversion to JPG.'));
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    
                    // Draw white background for JPG transparency
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const newName = converter.generateOutputFilename(file.name, index);
                                resolve({ blob: blob, originalName: newName });
                            } else {
                                reject(new Error('Canvas to Blob conversion failed for JPG.'));
                            }
                        },
                        'image/jpeg', // Hardcoded to JPG output
                        0.85 // Default quality for JPG (0.8 was used before, 0.85 is a common good default)
                    );
                };
                img.onerror = () => reject(new Error(`Failed to load image: ${file.name}. Please ensure it's a valid PNG file.`));
                img.src = event.target.result;
            };
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsDataURL(file);
        });
    }
};

// Event handlers setup
document.addEventListener('DOMContentLoaded', () => {
    console.log('Attempting to find convertButton on DOMContentLoaded. Element found:', document.getElementById('convertButton'));
    
    const fileInput = document.getElementById('fileInput');
    const convertButton = document.getElementById('convertButton');

    if (!fileInput || !convertButton) {
        console.error('Essential elements (fileInput or convertButton) not found. App may not function.');
        return;
    }

    // File input handler
    fileInput.addEventListener('change', (event) => {
        utils.clearPreviewsAndResults(); // Clear previous state & disable convert button

        const allFiles = Array.from(event.target.files);
        // Filter for PNG files only, as this is a PNG-to-JPG converter now
        state.selectedFiles = allFiles.filter(file => file.type === 'image/png');

        if (allFiles.length > 0 && state.selectedFiles.length === 0) {
            utils.displayMessage('Please select PNG files only.', true);
            return; // convertButton remains disabled
        }

        if (state.selectedFiles.length > 0) {
            // No original previews in this simplified version.
            // Just log selected files for diagnosis.
            console.log('Selected PNG files:', state.selectedFiles.map(f => f.name));
            utils.displayMessage(`${state.selectedFiles.length} PNG file(s) selected. Ready to convert.`, false);
            convertButton.disabled = false;
        }
        // If no files selected, button remains disabled via clearPreviewsAndResults.
    });

    // Convert button handler
    convertButton.addEventListener('click', async () => {
        if (state.selectedFiles.length === 0) {
            utils.displayMessage('Please select PNG files first.', true);
            return;
        }

        convertButton.disabled = true;
        convertButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Converting to JPG...';

        // Clear previous individual download links before new conversion
        const individualLinksArea = document.getElementById('individualLinksArea');
        if (individualLinksArea) {
            individualLinksArea.innerHTML = '';
        }
        state.convertedBlobs = []; // Clear previous blobs

        let successfulConversions = 0;
        let failedConversions = 0;

        for (let i = 0; i < state.selectedFiles.length; i++) {
            try {
                const file = state.selectedFiles[i];
                // Pass index for filename generation, quality is fixed in convertFile
                const result = await converter.convertFile(file, i);
                state.convertedBlobs.push(result); // Store for potential future use (like ZIP)
                utils.createIndividualDownloadLink(result.blob, result.originalName);
                successfulConversions++;
            } catch (error) {
                failedConversions++;
                console.error('Conversion Error:', error);
                utils.displayMessage(`Error converting ${state.selectedFiles[i] ? state.selectedFiles[i].name : 'a file'}: ${error.message}`, true);
            }
        }

        if (successfulConversions > 0) {
            utils.displayMessage(`Successfully converted ${successfulConversions} PNG file(s) to JPG.`, false);
        }
        if (failedConversions > 0 && successfulConversions === 0) {
             utils.displayMessage(`Failed to convert ${failedConversions} file(s). Check console for errors.`, true);
        } else if (failedConversions > 0) {
            // Append to success message if some succeeded
            const messageArea = document.getElementById('messageArea'); // get ref to messageArea
            const currentMessage = messageArea ? messageArea.textContent : ""; // get current text
            utils.displayMessage(`${currentMessage} ${failedConversions} file(s) failed.`, true);
        }


        convertButton.innerHTML = '<i class="fas fa-cogs mr-2"></i>Convert to JPG';
        // Re-enable only if there are still files selected that might be re-tried?
        // For simplicity now, re-enable. User can re-select if needed.
        // Or, if we want to prevent re-conversion of same set without re-selection:
        // fileInput.value = ''; // Clear file input
        // state.selectedFiles = []; // Clear selection
        // convertButton.disabled = true; // And keep it disabled
        // For now, let's just re-enable:
        if (state.selectedFiles.length > 0) { // Only re-enable if there was something to convert
             convertButton.disabled = false;
        } else {
             convertButton.disabled = true; // Should already be if selectedFiles is empty
        }

    });

    // Initialize UI state for the simplified version
    formatHandlers.updateFileInputAccept(); // Sets fileInput.accept
    utils.clearPreviewsAndResults(); // Initial clean state
});
