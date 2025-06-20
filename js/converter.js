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
const formatHandlers = {
    /**
     * Update the file input's accept attribute based on selected input format
     * This filters the file picker dialog to show only relevant files
     */
    updateFileInputAccept() {
        const inputFormatRadios = document.getElementsByName('inputFormat');
        const fileInput = document.getElementById('fileInput');
        const selectedFormat = Array.from(inputFormatRadios).find(radio => radio.checked).value;
        fileInput.accept = selectedFormat;
    },

    /**
     * Show/hide quality slider based on output format selection
     * PNG is lossless so quality setting is not applicable
     */
    updateQualitySliderVisibility() {
        const outputFormatRadios = document.getElementsByName('outputFormat');
        const selectedFormat = Array.from(outputFormatRadios).find(radio => radio.checked).value;
        const qualityContainer = document.getElementById('qualitySlider').parentElement;
        const qualityLabel = document.getElementById('qualityLabel');
        
        if (selectedFormat === 'image/png') {
            qualityContainer.style.display = 'none';
        } else {
            qualityContainer.style.display = 'block';
            qualityLabel.textContent = selectedFormat === 'image/jpeg' ? 'JPEG Quality:' : 'WebP Quality:';
        }
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
                    img.classList.remove('opacity-0');
                    if (loadedImages === totalImages) {
                        previewArea.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                };
                
                const wrapper = document.createElement('div');
                wrapper.className = 'animate-fade-in';
                wrapper.style.animationDelay = `${loadedImages * 0.1}s`;
                wrapper.appendChild(img);
                previewArea.appendChild(wrapper);
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
     * @param {string} originalName - Original filename 
     * @param {number} index - Index of the file in the batch
     * @returns {string} - The generated filename with extension
     */
    generateOutputFilename(originalName, index) {
        const renamingPattern = document.getElementById('renamingPattern');
        const outputFormatRadios = document.getElementsByName('outputFormat');
        const pattern = renamingPattern.value || '{original}';
        const ext = Array.from(outputFormatRadios).find(radio => radio.checked).value.split('/')[1];
        const now = new Date();
        
        let filename = pattern
            .replace('{original}', originalName.replace(/\.[^/.]+$/, ''))
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
            const outputFormatRadios = document.getElementsByName('outputFormat');
            const outputFormat = Array.from(outputFormatRadios).find(radio => radio.checked).value;

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
    const inputFormatRadios = document.getElementsByName('inputFormat');
    const outputFormatRadios = document.getElementsByName('outputFormat');
    const fileInput = document.getElementById('fileInput');
    const convertButton = document.getElementById('convertButton');
    const qualitySlider = document.getElementById('qualitySlider');
    const qualityValue = document.getElementById('qualityValue');
    const downloadZipButton = document.getElementById('downloadZipButton');

    inputFormatRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            formatHandlers.updateFileInputAccept();
            fileInput.value = '';
            utils.clearPreviewsAndResults();
        });
    });

    outputFormatRadios.forEach(radio => {
        radio.addEventListener('change', formatHandlers.updateQualitySliderVisibility);
    });

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

    // File input handler
    fileInput.addEventListener('change', (event) => {
        const selectedFormat = Array.from(inputFormatRadios).find(radio => radio.checked).value;
        state.selectedFiles = Array.from(event.target.files).filter(file => file.type === selectedFormat);
        
        utils.clearPreviewsAndResults();

        if (state.selectedFiles.length === 0 && event.target.files.length > 0) {
            utils.displayMessage(`Please select ${selectedFormat.split('/')[1].toUpperCase()} files only.`);
            return;
        }

        if (state.selectedFiles.length > 0) {
            previewHandlers.displayFilePreviews(state.selectedFiles, document.getElementById('originalPreviewArea'));
            convertButton.disabled = false;
        }
    });

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

        convertButton.disabled = true;
        downloadZipButton.disabled = true;
        utils.clearPreviewsAndResults();
        document.getElementById('convertedPreviewArea').innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center">Converting...</p>';
        document.getElementById('progressArea').classList.remove('hidden');
        utils.updateProgress(0, state.selectedFiles.length);

        const quality = parseFloat(qualitySlider.value);
        let successful = 0;

        for (let i = 0; i < state.selectedFiles.length; i++) {
            try {
                const result = await converter.convertImage(state.selectedFiles[i], quality, i);
                state.convertedBlobs.push(result);
                utils.createIndividualDownloadLink(result.blob, result.originalName);
                successful++;
                utils.updateProgress(i + 1, state.selectedFiles.length);
            } catch (error) {
                console.error('Conversion Error:', error);
                utils.displayMessage(`Error converting ${state.selectedFiles[i].name}: ${error.message}`);
            }
        }

        const convertedPreviewArea = document.getElementById('convertedPreviewArea');
        if (successful > 0) {
            convertedPreviewArea.innerHTML = '';
            state.convertedBlobs.forEach(({ blob }) => {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(blob);
                img.classList.add('rounded-md', 'shadow-sm', 'object-contain', 'w-full', 'h-32');
                convertedPreviewArea.appendChild(img);
            });
            document.getElementById('downloadArea').classList.remove('hidden');
            downloadZipButton.disabled = false;
            utils.displayMessage(`Successfully converted ${successful} of ${state.selectedFiles.length} images.`, false);
        } else {
            convertedPreviewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center">No images were converted successfully.</p>';
        }

        convertButton.disabled = false;
    });

    // Download ZIP handler
    downloadZipButton.addEventListener('click', async () => {
        if (state.convertedBlobs.length === 0) {
            utils.displayMessage('No converted images to download.');
            return;
        }

        const zip = new JSZip();
        state.convertedBlobs.forEach(({ blob, originalName }) => {
            zip.file(originalName, blob);
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
    formatHandlers.updateQualitySliderVisibility();
});