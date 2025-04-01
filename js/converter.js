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
        const selectedFormat = Array.from(inputFormatRadios).find(radio => radio.checked).value;
        fileInput.accept = selectedFormat;
    },

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

// Image conversion
const converter = {
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

    convertImage(file, quality, index) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const outputFormatRadios = document.getElementsByName('outputFormat');
            const outputFormat = Array.from(outputFormatRadios).find(radio => radio.checked).value;

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