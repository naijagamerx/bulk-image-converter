// Global state
const state = {
    selectedFiles: [],
    convertedBlobs: [],
    previewUrls: [],
    currentPreviewIndex: 0
};

// Theme handling
const themeHandlers = {
    init() {
        // Check for saved theme preference or use system preference
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById('themeToggle')?.classList.add('dark');
        }
    },

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

// Utility functions
const utils = {
    displayMessage(message, isError = true) {
        const messageArea = document.getElementById('messageArea');
        messageArea.textContent = message;
        messageArea.classList.remove('hidden');
        messageArea.classList.toggle('text-red-600', isError);
        messageArea.classList.toggle('text-green-600', !isError);
    },

    updateProgress(current, total) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const percentage = Math.round((current / total) * 100);
        progressBar.value = percentage;
        progressText.textContent = `${percentage}% (${current}/${total} files processed)`;
    },

    clearPreviewsAndResults() {
        // Revoke any existing preview URLs
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

        // Disable convert button
        const convertButton = document.getElementById('convertButton');
        if (convertButton) {
            convertButton.disabled = true;
        }
    },

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
    
    close() {
        const fullScreenContainer = document.getElementById('fullScreenPreview');
        fullScreenContainer.classList.add('hidden');
        document.body.style.overflow = '';
    },
    
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
    updateFileInputAccept() {
        const inputFormatRadios = document.getElementsByName('inputFormat');
        const fileInput = document.getElementById('fileInput');
        const selectedFormatValue = Array.from(inputFormatRadios).find(radio => radio.checked).value;
        const fileInputHint = document.getElementById('fileInputHint');

        fileInput.accept = selectedFormatValue; // Set the actual accept attribute

        let readableFormat = selectedFormatValue.split('/')[1].toUpperCase();
        if (selectedFormatValue === 'video/mp4') readableFormat = 'MP4';
        else if (selectedFormatValue === 'text/plain') readableFormat = 'TXT';
        // For image types, PNG, JPEG, WEBP is fine.

        if (fileInputHint) {
            fileInputHint.textContent = `Selected input format: ${readableFormat}. Ensure your files match this type.`;
        }
    },

    updateQualitySliderVisibility() {
        const outputFormatRadios = document.getElementsByName('outputFormat');
        const selectedFormat = Array.from(outputFormatRadios).find(radio => radio.checked).value;
        const qualityContainer = document.getElementById('qualitySlider').parentElement;
        const qualityLabel = document.getElementById('qualityLabel');
        
        // Hide quality slider for non-image formats
        if (selectedFormat === 'image/png' || selectedFormat === 'text/plain' || selectedFormat === 'video/x-matroska') {
            qualityContainer.style.display = 'none';
        } else {
            qualityContainer.style.display = 'block';
            qualityLabel.textContent = selectedFormat === 'image/jpeg' ? 'JPEG Quality:' : 'WebP Quality:';
        }
    }
};

// Preview handling
const previewHandlers = {
    displayFilePreviews(files, previewArea) {
        previewArea.innerHTML = '';
        
        if (files.length === 0) {
            previewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center flex items-center justify-center h-full"><i class="fas fa-arrow-up-from-bracket mr-2"></i> Select images to see previews.</p>';
            previewArea.classList.remove('has-items');
            return;
        }

        previewArea.classList.add('has-items');
        let loadedFiles = 0;
        const totalFiles = files.length;

        files.forEach((file, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'animate-fade-in';
            wrapper.style.animationDelay = `${index * 0.1}s`;

            if (file.type === 'text/plain') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const pre = document.createElement('pre');
                    const fullText = e.target.result;
                    let previewText = fullText.substring(0, 500);
                    if (fullText.length > 500) {
                        previewText += '\n... (file truncated for preview)';
                    }
                    pre.textContent = previewText;
                    pre.title = file.name;
                    pre.classList.add('rounded-md', 'shadow-sm', 'p-2', 'bg-gray-50', 'dark:bg-gray-700', 'text-xs', 'overflow-y-auto', 'w-full', 'h-32', 'font-mono');
                    wrapper.appendChild(pre);
                    previewArea.appendChild(wrapper);
                    loadedFiles++;
                    if (loadedFiles === totalFiles) previewArea.scrollTo({ top: 0, behavior: 'smooth' });
                };
                reader.readAsText(file);
            } else if (file.type === 'video/mp4') {
                const video = document.createElement('video');
                const videoUrl = URL.createObjectURL(file);
                state.previewUrls.push(videoUrl); // For later revocation
                video.src = videoUrl;
                video.controls = true;
                video.title = file.name;
                video.classList.add('rounded-md', 'shadow-sm', 'object-contain', 'w-full', 'h-32');
                wrapper.appendChild(video);
                previewArea.appendChild(wrapper);
                loadedFiles++;
                if (loadedFiles === totalFiles) previewArea.scrollTo({ top: 0, behavior: 'smooth' });
            } else { // Assume image
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.alt = `Preview of ${file.name}`;
                    img.title = file.name;
                    img.classList.add('rounded-md', 'shadow-sm', 'object-contain', 'w-full', 'h-32', 'opacity-0', 'transition-opacity', 'duration-300', 'cursor-pointer');
                    img.addEventListener('click', () => fullScreenPreview.show(img));
                    img.onload = () => {
                        img.classList.remove('opacity-0');
                        loadedFiles++;
                        if (loadedFiles === totalFiles) previewArea.scrollTo({ top: 0, behavior: 'smooth' });
                    };
                    wrapper.appendChild(img);
                    previewArea.appendChild(wrapper);
                };
                reader.readAsDataURL(file);
            }
        });
    }
};

// Image conversion
const converter = {
    generateOutputFilename(originalName, index) {
        const renamingPattern = document.getElementById('renamingPattern');
        const outputFormatRadios = document.getElementsByName('outputFormat');
        const pattern = renamingPattern.value || '{original}';
        const selectedOutputFormat = Array.from(outputFormatRadios).find(radio => radio.checked).value;
        let ext;

        // Determine extension based on output format
        if (selectedOutputFormat === 'text/plain') {
            ext = 'txt';
        } else if (selectedOutputFormat === 'video/x-matroska') {
            ext = 'mkv';
        } else {
            ext = selectedOutputFormat.split('/')[1]; // Default for image formats
        }

        const now = new Date();
        
        let filename = pattern
            .replace('{original}', originalName.replace(/\.[^/.]+$/, ''))
            .replace('{index}', String(index + 1).padStart(3, '0'))
            .replace('{date}', now.toISOString().split('T')[0])
            .replace('{time}', now.toTimeString().split(' ')[0].replace(/:/g, '-'));
        
        return `${filename}.${ext}`;
    },

    convertFile(file, quality, index) {
        const inputFormat = document.querySelector('input[name="inputFormat"]:checked').value;
        const outputFormat = document.querySelector('input[name="outputFormat"]:checked').value;

        if (outputFormat.startsWith('image/') && inputFormat.startsWith('image/')) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    
                    if (outputFormat === 'image/jpeg') {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    
                    ctx.drawImage(img, 0, 0);
                    
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
        } else if (inputFormat === 'text/plain' && outputFormat === 'text/plain') {
            return converter.convertText(file, index);
        } else if (inputFormat === 'video/mp4' && outputFormat === 'video/x-matroska') {
            return converter.convertVideo(file, index);
        } else {
            return Promise.reject(new Error(`Conversion from ${inputFormat} to ${outputFormat} is not supported.`));
        }
    },

    convertText: function(file, index) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const textContent = event.target.result;
                const textBlob = new Blob([textContent], { type: 'text/plain' });
                const outputFileName = converter.generateOutputFilename(file.name, index);
                resolve({ blob: textBlob, originalName: outputFileName });
            };
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsText(file);
        });
    },

    convertVideo: function(file, index) {
        return new Promise(async (resolve, reject) => {
            if (typeof FFmpeg === 'undefined' || typeof FFmpeg.createFFmpeg === 'undefined') {
                utils.displayMessage('FFmpeg.js is not loaded. Video conversion unavailable.', true);
                console.error('FFmpeg.js is not loaded.');
                return reject(new Error('FFmpeg.js is not loaded.'));
            }

            const { createFFmpeg, fetchFile } = FFmpeg;
            const ffmpeg = createFFmpeg({
                log: true,
                corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
            });

            try {
                utils.displayMessage(`Starting MKV conversion for '${file.name}'. This may take a while...`, false);

                if (!ffmpeg.isLoaded()) {
                    await ffmpeg.load();
                }

                ffmpeg.FS('writeFile', file.name, await fetchFile(file));

                // Attempt to copy codecs first for speed.
                // If this fails, one might try specific re-encoding, e.g., '-c:v libx264 -c:a aac'
                // However, re-encoding is much slower and more CPU intensive.
                await ffmpeg.run('-i', file.name, '-c', 'copy', 'output.mkv');

                const data = ffmpeg.FS('readFile', 'output.mkv');
                const outputBlob = new Blob([data.buffer], { type: 'video/x-matroska' });
                const outputFileName = converter.generateOutputFilename(file.name, index);

                utils.displayMessage(`Successfully converted '${file.name}' to MKV.`, false);
                resolve({ blob: outputBlob, originalName: outputFileName });

            } catch (error) {
                console.error('FFmpeg conversion error:', error);
                let userErrorMessage = `Error converting '${file.name}' to MKV. `;
                if (error.message && error.message.includes("SharedArrayBuffer")) {
                    userErrorMessage += "Browser configuration may be blocking SharedArrayBuffer, which is required for FFmpeg. Try enabling COOP/COEP headers on the server or specific browser flags.";
                } else if (error.message) {
                    userErrorMessage += error.message;
                } else {
                    userErrorMessage += 'Unknown error during conversion. Check console for details.';
                }
                utils.displayMessage(userErrorMessage, true);
                reject(new Error(`FFmpeg conversion failed: ${error.message || 'Unknown error'}`));
            } finally {
                try {
                    if (ffmpeg.FS) { // Check if FS is available, might not be if load failed.
                        ffmpeg.FS('unlink', file.name);
                        ffmpeg.FS('unlink', 'output.mkv');
                    }
                } catch (e) {
                    // console.warn('Could not unlink files from FFmpeg FS:', e);
                }
                // Terminate FFmpeg instance to free up resources, especially if errors occurred.
                // Note: Some FFmpeg.js versions/usage patterns might benefit from keeping the instance
                // if multiple conversions are done rapidly, but for one-off it's safer to terminate.
                // However, ensure this is done only if successfully loaded to avoid errors.
                // For v0.11, `ffmpeg.exit()` is not standard; termination is usually for workers.
                // The instance might self-terminate or clean up when it goes out of scope
                // or if there's a specific terminate/exit method for the `createFFmpeg` object.
                // Given the simple `createFFmpeg` usage, explicit termination might not be needed
                // or could even cause issues if called incorrectly.
                // Let's rely on browser GC for the ffmpeg object instance for now,
                // as improper termination can be problematic.
            }
        });
    }
};

// Modal handling
const modalHandlers = {
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
        // Get DOM elements that might be used, before any early returns or clearing operations
        const currentInputFormatRadios = document.getElementsByName('inputFormat'); // Renamed to avoid conflict with outer scope var if any
        const currentConvertButton = document.getElementById('convertButton');
        const currentOriginalPreviewArea = document.getElementById('originalPreviewArea');

        utils.clearPreviewsAndResults(); // Clears previews, results, and disables convertButton

        const selectedFormat = Array.from(currentInputFormatRadios).find(radio => radio.checked).value;
        const allFiles = Array.from(event.target.files);
        state.selectedFiles = allFiles.filter(file => file.type === selectedFormat);

        if (allFiles.length > 0 && state.selectedFiles.length === 0) {
            // User selected files, but none matched the chosen format
            utils.displayMessage(`Please select ${selectedFormat.split('/')[1].toUpperCase()} files only.`);
            // utils.clearPreviewsAndResults() already reset the preview area and disabled the button
            return;
        }

        if (state.selectedFiles.length > 0) {
            previewHandlers.displayFilePreviews(state.selectedFiles, currentOriginalPreviewArea);
            if (currentConvertButton) currentConvertButton.disabled = false;
        }
        // If state.selectedFiles.length is 0 (e.g., user de-selected files or selected no files),
        // utils.clearPreviewsAndResults() has already set the correct UI state (empty preview, disabled button).
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
        convertButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Converting...';

        const quality = parseFloat(qualitySlider.value);
        let successful = 0;

        try {
            for (let i = 0; i < state.selectedFiles.length; i++) {
                try {
                    const result = await converter.convertFile(state.selectedFiles[i], quality, i);
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
                convertedPreviewArea.innerHTML = ''; // Clear "Converting..." message
                state.convertedBlobs.forEach(({ blob, originalName }) => {
                    const wrapper = document.createElement('div');
                wrapper.className = 'animate-fade-in';

                if (blob.type === 'text/plain') {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const pre = document.createElement('pre');
                        const fullText = e.target.result;
                        let previewText = fullText.substring(0, 500);
                        if (fullText.length > 500) {
                            previewText += '\n... (file truncated for preview)';
                        }
                        pre.textContent = previewText;
                        pre.title = originalName;
                        pre.classList.add('rounded-md', 'shadow-sm', 'p-2', 'bg-gray-50', 'dark:bg-gray-700', 'text-xs', 'overflow-y-auto', 'w-full', 'h-32', 'font-mono');
                        wrapper.appendChild(pre);
                        convertedPreviewArea.appendChild(wrapper);
                    };
                    reader.readAsText(blob);
                } else if (blob.type.startsWith('video/')) {
                    const video = document.createElement('video');
                    const videoUrl = URL.createObjectURL(blob);
                    state.previewUrls.push(videoUrl); // For later revocation
                    video.src = videoUrl;
                    video.controls = true;
                    video.title = originalName;
                    video.classList.add('rounded-md', 'shadow-sm', 'object-contain', 'w-full', 'h-32');
                    wrapper.appendChild(video);
                    convertedPreviewArea.appendChild(wrapper);
                } else { // Assume image
                    const img = document.createElement('img');
                    const imgUrl = URL.createObjectURL(blob);
                    state.previewUrls.push(imgUrl); // For later revocation
                    img.src = imgUrl;
                    img.alt = `Preview of ${originalName}`;
                    img.title = originalName;
                    img.classList.add('rounded-md', 'shadow-sm', 'object-contain', 'w-full', 'h-32');
                    img.addEventListener('click', () => fullScreenPreview.show(img)); // Allow full screen for converted images too
                    wrapper.appendChild(img);
                    convertedPreviewArea.appendChild(wrapper);
                }
            });
            document.getElementById('downloadArea').classList.remove('hidden');
            downloadZipButton.disabled = false;
            utils.displayMessage(`Successfully converted ${successful} of ${state.selectedFiles.length} files.`, false);
            } else {
                convertedPreviewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center">No files were converted successfully.</p>';
            }
        } catch (criticalError) {
            console.error('A critical error occurred during the conversion process:', criticalError);
            utils.displayMessage('A critical error occurred. Please check console or try again.', true);
        } finally {
            convertButton.disabled = false; // Re-enable button regardless of outcome
            convertButton.innerHTML = '<i class="fas fa-cogs mr-2"></i>Convert Files';
        }
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