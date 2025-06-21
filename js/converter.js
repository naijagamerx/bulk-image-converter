/**
 * Bulk Image Converter Pro - Main JavaScript
 * 
 * This file contains the core functionality for the Bulk Image Converter Pro application.
 * It handles image format conversion, preview generation, theme handling, and file operations.
 * 
 * Browser Compatibility:
 * - Fully tested on Chrome 100+, Firefox 95+, Edge 100+, Safari 15+
 * - Partial support for older browsers (conversion might be slower)
 * - Not recommended for IE11 or below
 * 
 * @author DemoHomeX
 * @version 1.2.0
 * @license MIT
 */

// Global state for managing application data
const state = {
    selectedFiles: [],     // Stores the user-selected image files
    convertedBlobs: [],    // Stores the converted image blobs
    previewUrls: [],       // Stores URLs for previews (needed for cleanup)
    currentPreviewIndex: 0 // Tracks current position in preview navigation
};

// Initialize the Web Worker
let imageConversionWorker;
if (window.Worker) {
    imageConversionWorker = new Worker('js/worker.js');

    imageConversionWorker.onmessage = (event) => {
        // Worker now sends: { blob, originalFileName, outputFormat, index, success, error }
        const { blob, originalFileName, outputFormat: workerOutputFormat, index, success, error } = event.data;
        const convertButton = document.getElementById('convertButton');
        const downloadZipButton = document.getElementById('downloadZipButton');

        if (success) {
            // Generate the final filename using the main thread's function
            // originalFileName is the original name of the file, index is its index,
            // workerOutputFormat is the format it was converted to (e.g. "image/jpeg")
            // The main thread's generateOutputFilename currently reads output format from DOM,
            // but it's good practice to pass it if available, or ensure DOM is set correctly.
            // For now, converter.generateOutputFilename uses DOM state for output format.
            const finalOutputName = converter.generateOutputFilename(originalFileName, index);

            state.convertedBlobs[index] = { blob, originalName: finalOutputName }; // Store by index with final name

            // Update UI for this specific converted image
            utils.createIndividualDownloadLink(blob, finalOutputName);

            // Update converted preview area for this image
            const convertedPreviewArea = document.getElementById('convertedPreviewArea');
            if (index === 0 && convertedPreviewArea.querySelector('p')) { // Clear "Converting..." or placeholder
                convertedPreviewArea.innerHTML = '';
            }
            const img = document.createElement('img');
            img.src = URL.createObjectURL(blob);
            state.previewUrls.push(img.src); // Keep track for cleanup
            img.classList.add('rounded-md', 'shadow-sm', 'object-contain', 'w-full', 'h-32', 'animate-fade-in');
            img.alt = `Converted ${finalOutputName}`;
            img.title = finalOutputName;
            // Potentially add click for full screen preview if desired for converted images
            convertedPreviewArea.appendChild(img);


            // Check if all files are processed
            const totalFiles = state.selectedFiles.length;
            const processedFiles = state.convertedBlobs.filter(b => b).length; // Count non-empty slots
            utils.updateProgress(processedFiles, totalFiles);

            if (processedFiles === totalFiles) {
                document.getElementById('downloadArea').classList.remove('hidden');
                downloadZipButton.disabled = false;
                utils.displayMessage(`Successfully converted ${processedFiles} of ${totalFiles} images.`, false);
                convertButton.disabled = false;
                if (processedFiles === 0) {
                     convertedPreviewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center">No images were converted successfully.</p>';
                }
            }
        } else {
            console.error('Worker Error:', error);
            utils.displayMessage(`Error converting ${originalFileName || `file at index ${index}`}: ${error}`);
            state.convertedBlobs[index] = null; // Mark as failed

            const totalFiles = state.selectedFiles.length;
            const processedFiles = state.convertedBlobs.filter(b => b !== undefined).length; // Count processed (success or fail)
            utils.updateProgress(processedFiles, totalFiles);

            if (processedFiles === totalFiles) {
                convertButton.disabled = false;
                if (state.convertedBlobs.filter(b => b).length > 0) { // If some succeeded
                    document.getElementById('downloadArea').classList.remove('hidden');
                    downloadZipButton.disabled = false;
                } else {
                     document.getElementById('convertedPreviewArea').innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center">No images were converted successfully.</p>';
                }
            }
        }
    };

    imageConversionWorker.onerror = (error) => {
        console.error('Worker onerror:', error);
        utils.displayMessage(`Worker error: ${error.message}. Conversion process halted.`);
        const convertButton = document.getElementById('convertButton');
        if(convertButton) convertButton.disabled = false;
        // Potentially reset progress and UI further if a catastrophic worker error occurs
        const progressArea = document.getElementById('progressArea');
        if(progressArea) progressArea.classList.add('hidden');
        const convertedPreviewArea = document.getElementById('convertedPreviewArea');
        if(convertedPreviewArea) convertedPreviewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center">Conversion failed due to a worker error.</p>';
    };

} else {
    console.warn('Web Workers are not supported in this browser. Conversion will run on the main thread.');
    // Fallback logic or UI message can be placed here if desired
    utils.displayMessage('Web Workers not supported. Conversions will be slower.', true);
}

// Theme handling
const themeHandlers = {
    /**
     * Initialize theme based on user preference or system settings
     * Uses localStorage for persistence between sessions
     */
    init() {
        // Check for saved theme preference or use system preference
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById('themeToggle')?.classList.add('dark');
        }
    },

    /**
     * Toggle between light and dark themes
     * Updates localStorage and DOM elements
     */
    toggle() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const themeToggle = document.getElementById('themeToggle');
        
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            themeToggle?.classList.remove('dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeToggle?.classList.add('dark');
        }
    }
};

// Utility functions for common tasks
const utils = {
    /**
     * Display a message to the user (error or success)
     * 
     * @param {string} message - The message to display
     * @param {boolean} isError - Whether this is an error message (affects styling)
     */
    displayMessage(message, isError = true) {
        const messageArea = document.getElementById('messageArea');
        messageArea.textContent = message;
        messageArea.classList.remove('hidden');
        messageArea.classList.toggle('text-red-600', isError);
        messageArea.classList.toggle('text-green-600', !isError);
    },

    /**
     * Update the progress bar and text during batch operations
     * 
     * @param {number} current - Current item number
     * @param {number} total - Total number of items
     */
    updateProgress(current, total) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const percentage = Math.round((current / total) * 100);
        progressBar.value = percentage;
        progressText.textContent = `${percentage}% (${current}/${total} files processed)`;
    },

    /**
     * Clear all previews and reset UI elements to initial state
     * Also performs memory cleanup by revoking object URLs
     */
    clearPreviewsAndResults() {
        // Revoke any existing preview URLs to prevent memory leaks
        state.previewUrls.forEach(url => URL.revokeObjectURL(url));

        // Clear state arrays
        state.selectedFiles = [];
        state.convertedBlobs = [];
        state.previewUrls = [];
        
        // Reset preview areas
        const originalPreviewArea = document.getElementById('originalPreviewArea');
        const convertedPreviewArea = document.getElementById('convertedPreviewArea');
        originalPreviewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center flex items-center justify-center h-full"><i class="fas fa-arrow-up-from-bracket mr-2"></i> Select images to see previews.</p>';
        convertedPreviewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center flex items-center justify-center h-full"><i class="fas fa-wand-magic-sparkles mr-2"></i> Converted previews will appear here.</p>';
        
        // Reset download area
        const individualLinksArea = document.getElementById('individualLinksArea');
        const downloadArea = document.getElementById('downloadArea');
        const downloadZipButton = document.getElementById('downloadZipButton');
        individualLinksArea.innerHTML = '';
        downloadArea.classList.add('hidden');
        downloadZipButton.disabled = true;
        
        // Reset progress
        const progressArea = document.getElementById('progressArea');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        progressArea.classList.add('hidden');
        progressBar.value = 0;
        progressText.textContent = '';
        
        // Clear message area
        const messageArea = document.getElementById('messageArea');
        messageArea.textContent = '';
        messageArea.classList.add('hidden');
    },

    /**
     * Create download link for an individual converted image
     * 
     * @param {Blob} blob - The image blob
     * @param {string} filename - Filename to use for download
     */
    createIndividualDownloadLink(blob, filename) {
        const url = URL.createObjectURL(blob);
        state.previewUrls.push(url);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.className = 'text-sm bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded transition-colors flex items-center justify-center';
        link.innerHTML = `<i class="fas fa-download mr-2"></i>${filename}`;
        
        document.getElementById('individualLinksArea').appendChild(link);
    }
};

// Full-screen preview handler
const fullScreenPreview = {
    /**
     * Display an image in full screen mode
     * 
     * @param {HTMLImageElement} imgElement - The image element to show full screen
     */
    show(imgElement) {
        if (!imgElement) return;
        
        const fullScreenContainer = document.getElementById('fullScreenPreview');
        const fullScreenImage = document.getElementById('fullScreenImage');
        
        // Find all images in the current preview container and determine index
        const container = imgElement.closest('.preview-grid');
        if (!container) return;
        
        const allImages = Array.from(container.querySelectorAll('img'));
        state.currentPreviewIndex = allImages.indexOf(imgElement);
        
        // Set the image source and show the container
        fullScreenImage.src = imgElement.src;
        fullScreenContainer.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close the full screen preview
     */
    close() {
        const fullScreenContainer = document.getElementById('fullScreenPreview');
        fullScreenContainer.classList.add('hidden');
        document.body.style.overflow = '';
    },
    
    /**
     * Navigate between images in full screen mode
     * 
     * @param {number} direction - Direction to navigate (-1 for previous, 1 for next)
     */
    navigate(direction) {
        const container = document.querySelector('.preview-grid.has-items');
        if (!container) return;
        
        const allImages = Array.from(container.querySelectorAll('img'));
        if (allImages.length === 0) return;
        
        state.currentPreviewIndex += direction;
        
        // Wrap around if needed
        if (state.currentPreviewIndex < 0) state.currentPreviewIndex = allImages.length - 1;
        if (state.currentPreviewIndex >= allImages.length) state.currentPreviewIndex = 0;
        
        const fullScreenImage = document.getElementById('fullScreenImage');
        fullScreenImage.src = allImages[state.currentPreviewIndex].src;
    }
};

// Format handling

const formatCompatibility = {
    'image/png': ['image/jpeg', 'image/webp', 'image/bmp', 'image/gif'], // Can also output to image/png (handled by default selection logic)
    'image/jpeg': ['image/png', 'image/webp', 'image/bmp', 'image/gif'],
    'image/webp': ['image/png', 'image/jpeg', 'image/bmp', 'image/gif'],
    'image/tiff': ['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif'], // Input only, worker rejects tiff output
    'image/bmp': ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    'image/gif': ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'], // Input (static or first frame), output is static
    'image/svg+xml': ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], // SVG can be passthrough or rasterized
    'image/x-icon': ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'], // Input only, worker rejects ico output
    'text/markdown': ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
    'application/pdf': [] // PDF input not supported for conversion to other formats
};

const formatDisplayNames = {
    'image/png': 'PNG',
    'image/jpeg': 'JPEG',
    'image/webp': 'WEBP',
    'image/bmp': 'BMP',
    'image/gif': 'GIF (Static)', // Clarified static output
    'image/svg+xml': 'SVG',
    'image/tiff': 'TIFF (Input only)', // Clarified input only
    'image/x-icon': 'ICO (Input only)', // Clarified input only
    'text/markdown': 'Markdown (.md)',
    'application/pdf': 'PDF (.pdf)'
};

const formatHandlers = {
    /**
     * Update the file input's accept attribute based on selected input format
     * This filters the file picker dialog to show only relevant files
     */
    updateFileInputAccept() {
        const inputFormatSelect = document.getElementById('inputFormatSelect');
        const fileInput = document.getElementById('fileInput');
        if (!inputFormatSelect || !fileInput) return;

        const selectedFormat = inputFormatSelect.value;
        let acceptString = selectedFormat; // Default to MIME type

        // Add common extensions for better user experience in file dialog
        if (selectedFormat === 'image/tiff') {
            acceptString += ', .tif, .tiff';
        } else if (selectedFormat === 'image/bmp') {
            acceptString += ', .bmp';
        } else if (selectedFormat === 'image/gif') {
            acceptString += ', .gif';
        } else if (selectedFormat === 'image/x-icon') {
            acceptString += ', .ico';
        } else if (selectedFormat === 'image/svg+xml') {
            acceptString += ', .svg';
        } else if (selectedFormat === 'image/jpeg') {
            acceptString += ', .jpg, .jpeg, .jfif, .pjpeg, .pjp';
        } else if (selectedFormat === 'image/png') {
            acceptString += ', .png';
        } else if (selectedFormat === 'image/webp') {
            acceptString += ', .webp';
        } else if (selectedFormat === 'text/markdown') {
            acceptString += ', .md, .markdown';
        }
        fileInput.accept = acceptString;
    },

    /**
     * Show/hide quality slider based on output format selection
     * Quality slider is applicable mainly for JPEG and WEBP.
     */
    updateQualitySliderVisibility() {
        const outputFormatSelect = document.getElementById('outputFormatSelect');
        if (!outputFormatSelect) return;

        const selectedFormat = outputFormatSelect.value;
        const qualityContainer = document.getElementById('qualitySlider').parentElement;
        const qualityLabel = document.getElementById('qualityLabel');
        
        // Formats that typically use quality settings for lossy compression
        const qualitySensitiveFormats = ['image/jpeg', 'image/webp'];

        if (qualitySensitiveFormats.includes(selectedFormat)) {
            qualityContainer.style.display = 'block';
            qualityLabel.textContent = selectedFormat === 'image/jpeg' ? 'JPEG Quality:' : 'WebP Quality:';
        } else {
            qualityContainer.style.display = 'none';
        }
    },

    /**
     * Update the output format dropdown based on the selected input format.
     */
    updateOutputFormatDropdown() {
        const inputFormatSelect = document.getElementById('inputFormatSelect');
        const outputFormatSelect = document.getElementById('outputFormatSelect');
        if (!inputFormatSelect || !outputFormatSelect) return;

        const selectedInputFormat = inputFormatSelect.value;
        // Get compatible outputs. If input format not in map, or list is empty, provide a safe default (e.g., empty or common web formats).
        let compatibleOutputs = formatCompatibility[selectedInputFormat];

        if (!compatibleOutputs || compatibleOutputs.length === 0) {
            // If specific input type has no defined conversions (e.g. PDF input),
            // or if the input type itself isn't in formatCompatibility.
            if (selectedInputFormat === 'application/pdf') { // PDF input has no conversion targets
                 compatibleOutputs = [];
            } else { // Fallback for other unlisted inputs - allow conversion to common web formats
                 compatibleOutputs = ['image/png', 'image/jpeg', 'image/webp'];
            }
        }

        const currentOutputValue = outputFormatSelect.value;
        outputFormatSelect.innerHTML = ''; // Clear existing options

        if (compatibleOutputs.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No conversion available";
            option.disabled = true;
            outputFormatSelect.appendChild(option);
            outputFormatSelect.value = ""; // Set to the disabled option
        } else {
            compatibleOutputs.forEach(mimeType => {
                if (formatDisplayNames[mimeType]) {
                    const option = document.createElement('option');
                    option.value = mimeType;
                    option.textContent = formatDisplayNames[mimeType];
                    outputFormatSelect.appendChild(option);
                }
            });

            let newSelectedOutput = '';
            if (compatibleOutputs.includes(currentOutputValue)) {
                newSelectedOutput = currentOutputValue;
            } else if (compatibleOutputs.length > 0) {
                if (selectedInputFormat === 'text/markdown' && compatibleOutputs.includes('application/pdf')) {
                    newSelectedOutput = 'application/pdf';
                } else if (selectedInputFormat !== 'image/jpeg' && compatibleOutputs.includes('image/jpeg')) {
                    newSelectedOutput = 'image/jpeg';
                } else if (selectedInputFormat !== 'image/png' && compatibleOutputs.includes('image/png')) { // Prefer not to default to same format if others available
                    newSelectedOutput = 'image/png';
                } else if (compatibleOutputs.includes('image/png') && selectedInputFormat === 'image/png') { // If PNG is input, and PNG is an option, but others might exist
                     // Try to pick a different common format first
                    if (compatibleOutputs.includes('image/jpeg')) newSelectedOutput = 'image/jpeg';
                    else if (compatibleOutputs.includes('image/webp')) newSelectedOutput = 'image/webp';
                    else newSelectedOutput = compatibleOutputs[0]; // Fallback to first if no other common choice
                }
                 else {
                    newSelectedOutput = compatibleOutputs[0];
                }
            }

            if (newSelectedOutput) {
                outputFormatSelect.value = newSelectedOutput;
            } else if (outputFormatSelect.options.length > 0) {
                 outputFormatSelect.selectedIndex = 0; // Select first available if newSelectedOutput is somehow empty
            }
        }

        formatHandlers.updateQualitySliderVisibility();
    }
};

// Preview handling
const previewHandlers = {
    /**
     * Display previews of the selected files in the UI
     * 
     * @param {FileList|Array} files - The files to preview
     * @param {HTMLElement} previewArea - The DOM element where previews should be displayed
     */
    displayFilePreviews(files, previewArea) {
        previewArea.innerHTML = '';
        
        if (files.length === 0) {
            previewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center flex items-center justify-center h-full"><i class="fas fa-arrow-up-from-bracket mr-2"></i> Select images to see previews.</p>';
            previewArea.classList.remove('has-items');
            return;
        }

        previewArea.classList.add('has-items');
        let loadedImages = 0;
        const totalImages = files.length;

        // Create preview elements for each file with fade-in animation
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = `Preview of ${file.name}`;
                img.title = file.name;
                img.classList.add('rounded-md', 'shadow-sm', 'object-contain', 'w-full', 'h-32', 'opacity-0', 'transition-opacity', 'duration-300', 'cursor-pointer');
                
                // Add click event for full screen preview
                img.addEventListener('click', () => fullScreenPreview.show(img));
                
                img.onload = () => {
                    loadedImages++;
                    img.classList.remove('opacity-0'); // Make image visible
                    if (loadedImages === totalImages && previewArea.parentElement) { // Ensure parent exists for scrolling
                        previewArea.parentElement.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                };
                // Add error handling for individual image loading
                img.onerror = () => {
                    loadedImages++; // Still count as "processed" for scroll logic
                    console.error(`Preview Error: Failed to load preview for ${file.name}`);
                    const errorP = document.createElement('p');
                    errorP.textContent = `Error loading ${file.name}`;
                    errorP.className = 'text-xs text-red-500';
                    wrapper.innerHTML = ''; // Clear the wrapper
                    wrapper.appendChild(errorP); // Show error message in its place
                    if (loadedImages === totalImages && previewArea.parentElement) {
                        previewArea.parentElement.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                };
                
                const wrapper = document.createElement('div');
                // Animate fade-in if you have such a class defined elsewhere, or use opacity transition
                // wrapper.className = 'animate-fade-in';
                // wrapper.style.animationDelay = `${loadedImages * 0.05}s`; // Stagger if using CSS animation
                wrapper.appendChild(img);
                previewArea.appendChild(wrapper);
            };
            // Add error handling for FileReader itself
            reader.onerror = () => {
                loadedImages++; // Count as "processed"
                console.error(`FileReader Error: Failed to read file ${file.name}`);
                const errorP = document.createElement('p');
                errorP.textContent = `Cannot read ${file.name}`;
                errorP.className = 'text-xs text-red-500 col-span-full text-center'; // Make it span if grid column based
                previewArea.appendChild(errorP); // Add error message to preview area
                if (loadedImages === totalImages && previewArea.parentElement) {
                     previewArea.parentElement.scrollTo({ top: 0, behavior: 'smooth' });
                }
            };
            reader.readAsDataURL(file);
        });
    }
};

// Image conversion functionality
const converter = {
    /**
     * Generate an output filename based on the original name and pattern
     * Supports template patterns like {original}, {index}, {date}, {time}
     * 
     * @param {string} originalFileNameInput - Original filename (e.g., "photo.JPG")
     * @param {number} index - Index of the file in the batch
     * @param {string} [outputFormatType] - Optional: target MIME type e.g., "image/jpeg". If not provided, reads from DOM.
     * @returns {string} - The generated filename with extension
     */
    generateOutputFilename(originalFileNameInput, index, outputFormatType) {
        const renamingPatternInput = document.getElementById('renamingPattern');
        const pattern = renamingPatternInput ? renamingPatternInput.value : '{original}';

        let ext;
        const mimeToExt = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/webp': 'webp',
            'image/tiff': 'tif',
            'image/bmp': 'bmp',
            'image/gif': 'gif',
            'image/x-icon': 'ico',
            'image/svg+xml': 'svg',
            'application/pdf': 'pdf' // Added PDF extension
        };

        if (outputFormatType && mimeToExt[outputFormatType]) {
            ext = mimeToExt[outputFormatType];
        } else {
            const outputFormatSelect = document.getElementById('outputFormatSelect');
            if (outputFormatSelect && mimeToExt[outputFormatSelect.value]) {
                ext = mimeToExt[outputFormatSelect.value];
            } else if (outputFormatSelect) { // Fallback for unexpected MIME types if any
                 // Ensure we handle application/pdf here if it's the value
                const valueParts = outputFormatSelect.value.split('/');
                ext = valueParts[valueParts.length - 1] || 'bin';
            } else {
                ext = 'png'; // Default if somehow outputFormatSelect is not found
            }
        }

        // Handle specific cases like jpeg -> jpg
        if (ext === 'jpeg') ext = 'jpg';
        if (ext === 'svg+xml') ext = 'svg';
        if (ext === 'tiff') ext = 'tif';
        if (ext === 'x-icon') ext = 'ico';
        // 'pdf' is already 'pdf'


        const now = new Date();
        
        let filename = pattern
            .replace('{original}', originalFileNameInput.replace(/\.[^/.]+$/, ''))
            .replace('{index}', String(index + 1).padStart(3, '0'))
            .replace('{date}', now.toISOString().split('T')[0])
            .replace('{time}', now.toTimeString().split(' ')[0].replace(/:/g, '-'));
        
        return `${filename}.${ext}`;
    },

    /**
     * Convert a single image file to the target format
     * Uses HTML5 Canvas API for the conversion process
     * 
     * @param {File} file - The image file to convert
     * @param {number} quality - Quality setting for lossy formats (0.1 to 1.0)
     * @param {number} index - Index of this file in the batch
     * @returns {Promise} - Promise that resolves to {blob, originalName}
     */
    convertImage(file, quality, index) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const outputFormatSelect = document.getElementById('outputFormatSelect');
            const outputFormat = outputFormatSelect ? outputFormatSelect.value : 'image/jpeg'; // Default if somehow not found

            // This function (converter.convertImage) is the main thread fallback.
            // It should ideally also handle new formats if worker fails,
            // but that's a larger change for next subtask.
            // For now, it will likely only succeed for canvas-drawable types.

            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    // Create a canvas with the same dimensions as the image
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    
                    // For JPEG conversion, fill with white background (JPEGs don't support transparency)
                    if (outputFormat === 'image/jpeg') {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    
                    // Draw the image on the canvas
                    ctx.drawImage(img, 0, 0);
                    
                    // Convert the canvas content to a blob of the specified format
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const newName = converter.generateOutputFilename(file.name, index);
                                resolve({ blob: blob, originalName: newName });
                            } else {
                                reject(new Error('Canvas to Blob conversion failed'));
                            }
                        },
                        outputFormat,
                        outputFormat === 'image/png' ? undefined : quality
                    );
                };
                img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
                img.src = event.target.result;
            };
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsDataURL(file);
        });
    }
};

// Modal handling
const modalHandlers = {
    /**
     * Show the about modal
     * Centers the modal on mobile devices
     */
    showModal() {
        const aboutModal = document.getElementById('aboutModal');
        const modalContent = aboutModal.querySelector('.modal-content');
        
        aboutModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Center modal on mobile
        if (window.innerWidth < 640) {
            modalContent.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    },

    /**
     * Hide the about modal
     */
    hideModal() {
        const aboutModal = document.getElementById('aboutModal');
        aboutModal.classList.remove('show');
        document.body.style.overflow = '';
    }
};

// Event handlers setup
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    themeHandlers.init();
    
    // Theme toggle
    const themeToggleBtn = document.getElementById('themeToggle');
    themeToggleBtn?.addEventListener('click', themeHandlers.toggle);
    
    // Full screen preview handlers
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    const prevImageBtn = document.getElementById('prevImageBtn');
    const nextImageBtn = document.getElementById('nextImageBtn');
    
    closePreviewBtn?.addEventListener('click', fullScreenPreview.close);
    prevImageBtn?.addEventListener('click', () => fullScreenPreview.navigate(-1));
    nextImageBtn?.addEventListener('click', () => fullScreenPreview.navigate(1));
    
    // Close full screen with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            fullScreenPreview.close();
        } else if (e.key === 'ArrowLeft') {
            fullScreenPreview.navigate(-1);
        } else if (e.key === 'ArrowRight') {
            fullScreenPreview.navigate(1);
        }
    });

    // Format selection handlers
    const inputFormatSelect = document.getElementById('inputFormatSelect');
    const outputFormatSelect = document.getElementById('outputFormatSelect');
    const fileInput = document.getElementById('fileInput');
    const convertButton = document.getElementById('convertButton');
    const qualitySlider = document.getElementById('qualitySlider');
    const qualityValue = document.getElementById('qualityValue');
    const downloadZipButton = document.getElementById('downloadZipButton');

    if (inputFormatSelect) {
        inputFormatSelect.addEventListener('change', () => {
            formatHandlers.updateFileInputAccept();
            formatHandlers.updateOutputFormatDropdown(); // Update output dropdown based on new input
            if (fileInput) fileInput.value = '';
            utils.clearPreviewsAndResults();
            const dropZonePlaceholder = document.getElementById('dropZonePlaceholder');
            if (dropZonePlaceholder) {
                 dropZonePlaceholder.innerHTML = '<i class="fas fa-cloud-upload-alt text-4xl mb-3"></i><p class="text-lg">Drag & Drop images here</p><p class="text-sm">or use the selection button below</p>';
                 dropZonePlaceholder.classList.remove('hidden');
            }
            if(convertButton) convertButton.disabled = true;
        });
    }

    if (outputFormatSelect) {
        // When output format changes, only quality slider visibility needs update.
        // The actual list of options is dictated by input format.
        outputFormatSelect.addEventListener('change', formatHandlers.updateQualitySliderVisibility);
    }

    // Modal handlers
    const aboutBtn = document.getElementById('aboutBtn');
    const mobileAboutBtn = document.getElementById('mobileAboutBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const aboutModal = document.getElementById('aboutModal');

    aboutBtn?.addEventListener('click', modalHandlers.showModal);
    mobileAboutBtn?.addEventListener('click', modalHandlers.showModal);
    closeModalBtn?.addEventListener('click', modalHandlers.hideModal);

    aboutModal?.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
            modalHandlers.hideModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && aboutModal.classList.contains('show')) {
            modalHandlers.hideModal();
        }
    });

    // Mobile navigation
    const mobileNavBtns = document.querySelectorAll('.mobile-app-icon');
    mobileNavBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            mobileNavBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // File input handler - This is now part of the Drag and Drop handler section to ensure DOM elements are loaded
    // The original fileInput listener is modified and integrated within the DOMContentLoaded's Drag and Drop section further down.
    // Quality slider
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = e.target.value;
    });

    // Convert button handler
    convertButton.addEventListener('click', async () => {
        if (state.selectedFiles.length === 0) {
            utils.displayMessage('Please select files first.');
            return;
        }

        if (!imageConversionWorker) {
            utils.displayMessage('Web Worker not available. Cannot convert images.');
            // Optionally, implement fallback to main thread conversion here
            // For now, we just disable and message.
            // The old code block for main thread conversion can be invoked here if desired.
            console.error("Web Worker not initialized. Fallback to main thread or error out.");
            // Example of falling back (uncomment and adapt if needed):
            /*
            convertButton.disabled = true;
            downloadZipButton.disabled = true;
            utils.clearPreviewsAndResults(); // Clear previous results before starting
            document.getElementById('convertedPreviewArea').innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center">Converting on main thread...</p>';
            document.getElementById('progressArea').classList.remove('hidden');
            utils.updateProgress(0, state.selectedFiles.length);
            const quality = parseFloat(document.getElementById('qualitySlider').value);
            let successfulCount = 0;
            state.convertedBlobs = []; // Reset for this batch

            for (let i = 0; i < state.selectedFiles.length; i++) {
                try {
                    const result = await converter.convertImage(state.selectedFiles[i], quality, i); // Original function
                    state.convertedBlobs.push(result);
                    utils.createIndividualDownloadLink(result.blob, result.originalName);
                    successfulCount++;
                    utils.updateProgress(i + 1, state.selectedFiles.length);
                } catch (error) {
                    console.error('Main Thread Conversion Error:', error);
                    utils.displayMessage(`Error converting ${state.selectedFiles[i].name}: ${error.message}`);
                }
            }
            // UI update after main thread conversion loop finishes...
            // (similar to the original block but using successfulCount and state.convertedBlobs)
            const convertedPreviewArea = document.getElementById('convertedPreviewArea');
            if (successfulCount > 0) {
                // ... populate previews ...
                document.getElementById('downloadArea').classList.remove('hidden');
                downloadZipButton.disabled = false;
                utils.displayMessage(`Successfully converted ${successfulCount} of ${state.selectedFiles.length} images on main thread.`, false);
            } else {
                convertedPreviewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center">No images were converted successfully on main thread.</p>';
            }
            convertButton.disabled = false;
            */
            return;
        }

        convertButton.disabled = true;
        downloadZipButton.disabled = true;
        // Clear previous results and previews.
        // Since utils.clearPreviewsAndResults() now also clears state.selectedFiles,
        // we must call it *before* we intend to use state.selectedFiles for displaying original previews.
        // This means the original previews will be cleared and then re-rendered if files are still "selected" conceptually.
        // However, fileInput.onchange and drop handlers *re-assign* state.selectedFiles *after* calling clearPreviewsAndResults.
        // The convertButton handler uses the *current* state.selectedFiles.
        // So, the order in convertButton should be:
        // 1. If we need to preserve original selected files for this conversion batch, ensure they are captured.
        // 2. THEN call utils.clearPreviewsAndResults() which clears DOM areas for converted results & selectedFiles state.
        // 3. THEN re-populate original previews if needed (which it does via displayFilePreviews).
        // The current `utils.clearPreviewsAndResults()` will reset `state.selectedFiles`.
        // If `convertButton` is clicked, it implies we want to convert the *currently selected files*.
        // So, `state.selectedFiles` should NOT be cleared by `utils.clearPreviewsAndResults` if it's called
        // *within* the convertButton handler before processing.
        // Let's adjust where `state.selectedFiles` is cleared.
        // It should be cleared when new files are chosen (input 'change', 'drop'), or when explicitly resetting the whole app.
        // For `convertButton` click, we only want to clear *previous conversion results*, not the current selection.

        // So, utils.clearPreviewsAndResults should only clear results, not current selection.
        // Let's refine utils.clearPreviewsAndResults to NOT clear state.selectedFiles.
        // Instead, state.selectedFiles will be explicitly cleared by file input/drop handlers.

        // In `convertButton` handler:
        // Clear only previous *converted* results and their previews/links.
        const convertedPreviewArea = document.getElementById('convertedPreviewArea');
        convertedPreviewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center flex items-center justify-center h-full"><i class="fas fa-wand-magic-sparkles mr-2"></i> Converted previews will appear here.</p>';
        const individualLinksArea = document.getElementById('individualLinksArea');
        individualLinksArea.innerHTML = '';
        document.getElementById('downloadArea').classList.add('hidden');
        document.getElementById('downloadZipButton').disabled = true;
        state.convertedBlobs = []; // Explicitly clear previous converted blobs for this new batch.
        state.previewUrls.forEach(url => URL.revokeObjectURL(url)); // Clear old blob URLs for converted images
        state.previewUrls = []; // Reset preview URLs related to converted images

        // Re-display original previews for clarity (they are not cleared here)
        previewHandlers.displayFilePreviews(state.selectedFiles, document.getElementById('originalPreviewArea'));

        document.getElementById('convertedPreviewArea').innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center flex items-center justify-center h-full"><i class="fas fa-spinner fa-spin mr-2"></i>Converting images...</p>';
        document.getElementById('progressArea').classList.remove('hidden');
        // Initialize progress based on the actual number of files to be processed in this batch
        utils.updateProgress(0, state.selectedFiles.length);

        // Ensure state.convertedBlobs is an array of the correct size for the current selection
        state.convertedBlobs = new Array(state.selectedFiles.length).fill(undefined);

        const quality = parseFloat(document.getElementById('qualitySlider').value);
        const outputFormatValue = document.getElementById('outputFormatSelect').value;

        state.selectedFiles.forEach((file, index) => {
            // Create a simple data object for the worker.
            // The File object itself cannot be cloned directly in all browsers for Web Workers.
            // We need to send its essential parts or read it as ArrayBuffer.
            // For simplicity, if File objects are problematic, consider sending Blob parts or ArrayBuffer.
            // However, modern browsers typically support sending File objects to workers.

            // To ensure compatibility if File object cloning is an issue:
            // const fileData = {
            //   name: file.name,
            //   type: file.type,
            //   size: file.size,
            //   lastModified: file.lastModified,
            //   // arrayBuffer: await file.arrayBuffer() // This would require async loop or Promise.all
            // };
            // For now, let's assume direct File object passing works. If not, this is where to adapt.

            imageConversionWorker.postMessage({
                file: file, // The File object itself
                outputFormat: outputFormat,
                quality: quality,
                originalName: file.name, // Keep original name for reference
                index: index
            });
        });
    });

    // Download ZIP handler
    downloadZipButton.addEventListener('click', async () => {
        if (state.convertedBlobs.length === 0) {
            utils.displayMessage('No converted images to download.');
            return;
        }

        const zip = new JSZip();
        state.convertedBlobs.forEach((result) => {
            if (result && result.blob) { // Ensure blob exists (it might be null if conversion failed)
                zip.file(result.originalName, result.blob);
            }
        });

        try {
            const content = await zip.generateAsync({ type: 'blob' });
            const zipUrl = URL.createObjectURL(content);
            state.previewUrls.push(zipUrl);

            const link = document.createElement('a');
            link.href = zipUrl;
            link.download = 'converted_images.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            utils.displayMessage('ZIP file download started!', false);
        } catch (error) {
            console.error('Error creating ZIP:', error);
            utils.displayMessage('Error creating ZIP file. Please try downloading images individually.');
        }
    });

    // Initialize UI state
    formatHandlers.updateFileInputAccept();
    // formatHandlers.updateQualitySliderVisibility(); // This will be called by updateOutputFormatDropdown
    formatHandlers.updateOutputFormatDropdown(); // Initial population of output dropdown

    // Drag and Drop handlers
    const dropZoneArea = document.getElementById('dropZoneArea');
    const dropZonePlaceholder = document.getElementById('dropZonePlaceholder');
    const originalPreviewArea = document.getElementById('originalPreviewArea');

    if (dropZoneArea && dropZonePlaceholder && originalPreviewArea) {
        dropZoneArea.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dropZoneArea.classList.add('border-blue-600', 'bg-blue-50'); // Example active style
            dropZonePlaceholder.textContent = 'Release to drop images';
        });

        dropZoneArea.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necessary to allow drop
        });

        dropZoneArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            // Only remove active style if not dragging over a child element
            if (!dropZoneArea.contains(e.relatedTarget)) {
                dropZoneArea.classList.remove('border-blue-600', 'bg-blue-50');
                if (state.selectedFiles.length === 0) {
                    dropZonePlaceholder.innerHTML = '<i class="fas fa-cloud-upload-alt text-4xl mb-3"></i><p class="text-lg">Drag & Drop images here</p><p class="text-sm">or use the selection button below</p>';
                } else {
                    dropZonePlaceholder.classList.add('hidden');
                }
            }
        });

        dropZoneArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZoneArea.classList.remove('border-blue-600', 'bg-blue-50');

            const droppedFiles = e.dataTransfer.files;
            const currentInputFormat = document.getElementById('inputFormatSelect').value;
            const newlySelectedFiles = Array.from(droppedFiles).filter(file => file.type === currentInputFormat);

            if (newlySelectedFiles.length === 0 && droppedFiles.length > 0) {
                utils.displayMessage(`Please drop ${currentInputFormat.split('/')[1].toUpperCase()} files only. ${droppedFiles.length - newlySelectedFiles.length} file(s) were ignored.`);
                if (state.selectedFiles.length === 0) { // If no files were previously selected
                    dropZonePlaceholder.innerHTML = '<i class="fas fa-cloud-upload-alt text-4xl mb-3"></i><p class="text-lg">Drag & Drop images here</p><p class="text-sm">or use the selection button below</p>';
                    dropZonePlaceholder.classList.remove('hidden');
                }
                return;
            }

            if (newlySelectedFiles.length > 0) {
                // Append to existing or set new files. For simplicity, let's overwrite.
                // To append: state.selectedFiles = [...state.selectedFiles, ...newlySelectedFiles];
                // Ensure no duplicates if appending:
                // const currentFileNames = new Set(state.selectedFiles.map(f => f.name));
                // newlySelectedFiles = newlySelectedFiles.filter(f => !currentFileNames.has(f.name));
                state.selectedFiles = newlySelectedFiles; // Overwriting for simplicity based on typical drag-drop UX

                utils.clearPreviewsAndResults(); // Clear previous results and previews
                previewHandlers.displayFilePreviews(state.selectedFiles, originalPreviewArea);
                convertButton.disabled = false;
                dropZonePlaceholder.classList.add('hidden'); // Hide placeholder when files are successfully dropped
                utils.displayMessage(`${state.selectedFiles.length} file(s) selected. Ready to convert.`, false);

                if (droppedFiles.length > newlySelectedFiles.length) {
                     utils.displayMessage(`${newlySelectedFiles.length} valid file(s) selected. ${droppedFiles.length - newlySelectedFiles.length} file(s) were ignored as they were not ${selectedFormat.split('/')[1].toUpperCase()}.`, false);
                }

            } else if (state.selectedFiles.length === 0) { // No valid files dropped and no previous files
                dropZonePlaceholder.innerHTML = '<i class="fas fa-cloud-upload-alt text-4xl mb-3"></i><p class="text-lg">Drag & Drop images here</p><p class="text-sm">or use the selection button below</p>';
                dropZonePlaceholder.classList.remove('hidden');
                convertButton.disabled = true;
            }
        });

        // Modify file input handler:
        if(fileInput) {
            fileInput.addEventListener('change', (event) => {
                const currentInputFormat = document.getElementById('inputFormatSelect').value;
                const originalNumberOfFilesSelected = event.target.files.length;
                const newFiles = Array.from(event.target.files).filter(file => file.type === currentInputFormat);
                const dropZonePlaceholder = document.getElementById('dropZonePlaceholder'); // Get here for use in both branches

                if (newFiles.length === 0) {
                    utils.clearPreviewsAndResults(); // Clear everything, including state.selectedFiles
                    if (originalNumberOfFilesSelected > 0) { // Files were selected, but none matched the type
                        utils.displayMessage(`Please select ${currentInputFormat.split('/')[1].toUpperCase()} files only.`);
                    }
                    // Ensure UI reflects no selection
                    if (dropZonePlaceholder) dropZonePlaceholder.classList.remove('hidden');
                    if (convertButton) convertButton.disabled = true;
                    // originalPreviewArea is already reset by clearPreviewsAndResults
                    return;
                }

                // Valid files are present
                utils.clearPreviewsAndResults();    // Clear old state & previews
                state.selectedFiles = newFiles;     // Assign new files to state

                if (originalPreviewArea) { // Ensure element exists
                    previewHandlers.displayFilePreviews(state.selectedFiles, originalPreviewArea); // Display new previews
                }

                // Update other UI elements
                if (convertButton) convertButton.disabled = false;
                if (dropZonePlaceholder) dropZonePlaceholder.classList.add('hidden');
                if (originalNumberOfFilesSelected > newFiles.length) { // Some files were filtered out
                    utils.displayMessage(`${newFiles.length} valid file(s) selected. ${originalNumberOfFilesSelected - newFiles.length} file(s) ignored due to type mismatch.`, false);
                } else {
                    utils.displayMessage(`${state.selectedFiles.length} file(s) selected. Ready to convert.`, false);
                }
            });
        }

        // Modify drop handler similarly
        dropZoneArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZoneArea.classList.remove('border-blue-600', 'bg-blue-50');
            const dropZonePlaceholder = document.getElementById('dropZonePlaceholder'); // Get here

            const originalNumberOfFilesDropped = e.dataTransfer.files.length;
            const currentInputFormat = document.getElementById('inputFormatSelect').value;
            const newlySelectedFiles = Array.from(e.dataTransfer.files).filter(file => file.type === currentInputFormat);

            if (newlySelectedFiles.length === 0) {
                utils.clearPreviewsAndResults(); // Clear everything
                if (originalNumberOfFilesDropped > 0) { // Files were dropped, but none matched
                    utils.displayMessage(`Please drop ${currentInputFormat.split('/')[1].toUpperCase()} files only. ${originalNumberOfFilesDropped} file(s) were ignored.`);
                }
                if (dropZonePlaceholder) {
                    dropZonePlaceholder.innerHTML = '<i class="fas fa-cloud-upload-alt text-4xl mb-3"></i><p class="text-lg">Drag & Drop images here</p><p class="text-sm">or use the selection button below</p>';
                    dropZonePlaceholder.classList.remove('hidden');
                }
                if (convertButton) convertButton.disabled = true;
                return;
            }

            // Valid files are present
            utils.clearPreviewsAndResults();    // Clear old state & previews
            state.selectedFiles = newlySelectedFiles; // Assign new files to state

            if (originalPreviewArea) { // Ensure element exists
                previewHandlers.displayFilePreviews(state.selectedFiles, originalPreviewArea); // Display new previews
            }

            // Update other UI elements
            if (convertButton) convertButton.disabled = false;
            if (dropZonePlaceholder) dropZonePlaceholder.classList.add('hidden');

            if (originalNumberOfFilesDropped > newlySelectedFiles.length) {
                 utils.displayMessage(`${newlySelectedFiles.length} valid file(s) selected. ${originalNumberOfFilesDropped - newlySelectedFiles.length} file(s) ignored due to type mismatch.`, false);
            } else {
                utils.displayMessage(`${state.selectedFiles.length} file(s) selected. Ready to convert.`, false);
            }
        });


    } else {
        console.warn("Drop zone elements not found. Drag and drop functionality will not be available.");
    }

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => { // Wait for page load to avoid contention for resources
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered successfully with scope:', registration.scope);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        });
    } else {
        console.warn('Service Workers are not supported in this browser.');
    }
});