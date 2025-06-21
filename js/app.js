import { state } from './state.js';
import {
    displayMessage,
    updateProgress,
    clearPreviewsAndResults,
    createIndividualDownloadLink,
    displayFilePreviews,
    updateFileInputAccept,
    updateQualitySliderVisibility,
    updateOutputFormatDropdown,
    generateOutputFilename,
    themeHandlers,
    modalHandlers,
    fullScreenPreview
} from './uiHandlers.js';
import { imageConversionWorker, postTaskToWorker } from './workerClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    themeHandlers.init();

    // Element aefinitions (moved from global in converter.js to local in DOMContentLoaded)
    const themeToggleBtn = document.getElementById('themeToggle');
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    const prevImageBtn = document.getElementById('prevImageBtn');
    const nextImageBtn = document.getElementById('nextImageBtn');
    const inputFormatSelect = document.getElementById('inputFormatSelect');
    const outputFormatSelect = document.getElementById('outputFormatSelect');
    const fileInput = document.getElementById('fileInput');
    const convertButton = document.getElementById('convertButton');
    const qualitySlider = document.getElementById('qualitySlider');
    const qualityValue = document.getElementById('qualityValue'); // Assuming this is just a span for text
    const downloadZipButton = document.getElementById('downloadZipButton');
    const aboutBtn = document.getElementById('aboutBtn');
    const mobileAboutBtn = document.getElementById('mobileAboutBtn'); // Assuming this is for mobile version of about
    const closeModalBtn = document.getElementById('closeModalBtn');
    const aboutModal = document.getElementById('aboutModal');
    const dropZoneArea = document.getElementById('dropZoneArea');
    const dropZonePlaceholder = document.getElementById('dropZonePlaceholder');
    const originalPreviewArea = document.getElementById('originalPreviewArea');
    // const convertedPreviewArea = document.getElementById('convertedPreviewArea'); // Used in workerClient
    // const individualLinksArea = document.getElementById('individualLinksArea'); // Used in uiHandlers
    // const downloadArea = document.getElementById('downloadArea'); // Used in workerClient & uiHandlers

    // Theme toggle
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', themeHandlers.toggle);

    // Full screen preview handlers
    if (closePreviewBtn) closePreviewBtn.addEventListener('click', fullScreenPreview.close);
    if (prevImageBtn) prevImageBtn.addEventListener('click', () => fullScreenPreview.navigate(-1));
    if (nextImageBtn) nextImageBtn.addEventListener('click', () => fullScreenPreview.navigate(1));

    document.addEventListener('keydown', (e) => {
        if (document.getElementById('fullScreenPreview') && !document.getElementById('fullScreenPreview').classList.contains('hidden')) {
            if (e.key === 'Escape') fullScreenPreview.close();
            else if (e.key === 'ArrowLeft') fullScreenPreview.navigate(-1);
            else if (e.key === 'ArrowRight') fullScreenPreview.navigate(1);
        }
        if (aboutModal && aboutModal.classList.contains('show') && e.key === 'Escape') {
            modalHandlers.hideModal();
        }
    });

    // Format selection handlers
    if (inputFormatSelect) {
        inputFormatSelect.addEventListener('change', () => {
            updateFileInputAccept();
            updateOutputFormatDropdown();
            if (fileInput) fileInput.value = '';
            clearPreviewsAndResults();
            if (dropZonePlaceholder) {
                 dropZonePlaceholder.innerHTML = '<i class="fas fa-cloud-upload-alt text-4xl mb-3"></i><p class="text-lg">Drag & Drop images here</p><p class="text-sm">or use the selection button below</p>';
                 dropZonePlaceholder.classList.remove('hidden');
            }
            if(convertButton) convertButton.disabled = true;
        });
    }

    if (outputFormatSelect) {
        outputFormatSelect.addEventListener('change', updateQualitySliderVisibility);
    }

    // Modal handlers
    if (aboutBtn) aboutBtn.addEventListener('click', modalHandlers.showModal);
    if (mobileAboutBtn) mobileAboutBtn.addEventListener('click', modalHandlers.showModal); // Assuming this is the mobile about button
    if (closeModalBtn) closeModalBtn.addEventListener('click', modalHandlers.hideModal);
    if (aboutModal) {
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) modalHandlers.hideModal();
        });
    }

    // Mobile navigation (simple class toggle, no major logic from converter.js)
    const mobileNavBtns = document.querySelectorAll('.mobile-app-icon');
    mobileNavBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Allow default behavior for actual navigation if href="#" is changed
            // e.preventDefault();
            mobileNavBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });

    // File input handler
    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            const currentInputFormat = inputFormatSelect.value;
            const originalNumberOfFilesSelected = event.target.files.length;
            let newFiles;

            if (currentInputFormat === 'text/markdown') {
                newFiles = Array.from(event.target.files).filter(file =>
                    file.type === 'text/markdown' ||
                    file.type === 'text/plain' ||
                    (typeof file.name === 'string' && file.name.toLowerCase().endsWith('.md')) ||
                    (typeof file.name === 'string' && file.name.toLowerCase().endsWith('.markdown'))
                );
            } else {
                newFiles = Array.from(event.target.files).filter(file => file.type === currentInputFormat);
            }

            if (newFiles.length === 0) {
                clearPreviewsAndResults();
                if (originalNumberOfFilesSelected > 0) {
                    displayMessage(`Please select valid ${formatDisplayNames[currentInputFormat] || currentInputFormat.split('/')[1] || 'files'}. Some files were ignored.`);
                }
                if (dropZonePlaceholder) dropZonePlaceholder.classList.remove('hidden');
                if (convertButton) convertButton.disabled = true;
                return;
            }

            clearPreviewsAndResults();
            state.selectedFiles = newFiles;

            if (originalPreviewArea) {
                displayFilePreviews(state.selectedFiles, originalPreviewArea);
            }

            if (convertButton) convertButton.disabled = false;
            if (dropZonePlaceholder) dropZonePlaceholder.classList.add('hidden');
            if (originalNumberOfFilesSelected > newFiles.length) {
                displayMessage(`${newFiles.length} valid file(s) selected. ${originalNumberOfFilesSelected - newFiles.length} file(s) ignored.`, false);
            } else {
                displayMessage(`${state.selectedFiles.length} file(s) selected. Ready to convert.`, false);
            }
        });
    }

    // Drag and Drop handlers
    if (dropZoneArea && dropZonePlaceholder && originalPreviewArea && convertButton) {
        dropZoneArea.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dropZoneArea.classList.add('border-blue-600', 'bg-blue-50');
            if (dropZonePlaceholder) dropZonePlaceholder.textContent = 'Release to drop images';
        });

        dropZoneArea.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        dropZoneArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!dropZoneArea.contains(e.relatedTarget)) {
                dropZoneArea.classList.remove('border-blue-600', 'bg-blue-50');
                if (state.selectedFiles.length === 0 && dropZonePlaceholder) {
                    dropZonePlaceholder.innerHTML = '<i class="fas fa-cloud-upload-alt text-4xl mb-3"></i><p class="text-lg">Drag & Drop images here</p><p class="text-sm">or use the selection button below</p>';
                }
            }
        });

        dropZoneArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZoneArea.classList.remove('border-blue-600', 'bg-blue-50');

            const originalNumberOfFilesDropped = e.dataTransfer.files.length;
            const currentInputFormat = inputFormatSelect.value;
            let newlySelectedFiles;

            if (currentInputFormat === 'text/markdown') {
                newlySelectedFiles = Array.from(e.dataTransfer.files).filter(file =>
                    file.type === 'text/markdown' ||
                    file.type === 'text/plain' ||
                    (typeof file.name === 'string' && file.name.toLowerCase().endsWith('.md')) ||
                    (typeof file.name === 'string' && file.name.toLowerCase().endsWith('.markdown'))
                );
            } else {
                newlySelectedFiles = Array.from(e.dataTransfer.files).filter(file => file.type === currentInputFormat);
            }

            if (newlySelectedFiles.length === 0) {
                clearPreviewsAndResults();
                if (originalNumberOfFilesDropped > 0) {
                    displayMessage(`Please drop valid ${formatDisplayNames[currentInputFormat] || currentInputFormat.split('/')[1] || 'files'}. ${originalNumberOfFilesDropped} file(s) were ignored.`);
                }
                if (dropZonePlaceholder) {
                    dropZonePlaceholder.innerHTML = '<i class="fas fa-cloud-upload-alt text-4xl mb-3"></i><p class="text-lg">Drag & Drop images here</p><p class="text-sm">or use the selection button below</p>';
                    dropZonePlaceholder.classList.remove('hidden');
                }
                convertButton.disabled = true;
                return;
            }

            clearPreviewsAndResults();
            state.selectedFiles = newlySelectedFiles;

            if (originalPreviewArea) {
                displayFilePreviews(state.selectedFiles, originalPreviewArea);
            }

            convertButton.disabled = false;
            if (dropZonePlaceholder) dropZonePlaceholder.classList.add('hidden');

            if (originalNumberOfFilesDropped > newlySelectedFiles.length) {
                 displayMessage(`${newlySelectedFiles.length} valid file(s) selected. ${originalNumberOfFilesDropped - newlySelectedFiles.length} file(s) ignored.`, false);
            } else {
                displayMessage(`${state.selectedFiles.length} file(s) selected. Ready to convert.`, false);
            }
        });
    }


    // Quality slider
    if (qualitySlider && qualityValue) {
        qualitySlider.addEventListener('input', (e) => {
            qualityValue.textContent = e.target.value;
        });
    }

    // Convert button handler
    if (convertButton) {
        convertButton.addEventListener('click', async () => {
            if (state.selectedFiles.length === 0) {
                displayMessage('Please select files first.');
                return;
            }

            if (!imageConversionWorker) { // Check if worker was initialized
                displayMessage('Web Worker not available. Cannot convert images.', true);
                console.error("Web Worker not initialized. Fallback to main thread or error out.");
                return;
            }

            convertButton.disabled = true;
            if (downloadZipButton) downloadZipButton.disabled = true;

            // Targeted reset for conversion results area
            const convertedPreviewArea = document.getElementById('convertedPreviewArea');
            if (convertedPreviewArea) convertedPreviewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center flex items-center justify-center h-full"><i class="fas fa-wand-magic-sparkles mr-2"></i> Converted previews will appear here.</p>';
            const individualLinksArea = document.getElementById('individualLinksArea');
            if (individualLinksArea) individualLinksArea.innerHTML = '';
            const downloadArea = document.getElementById('downloadArea');
            if (downloadArea) downloadArea.classList.add('hidden');

            state.convertedBlobs = new Array(state.selectedFiles.length).fill(undefined);
            state.previewUrls.forEach(url => URL.revokeObjectURL(url)); // Revoke old converted image URLs
            state.previewUrls = []; // Reset for new converted images

            // Display original previews (if they were somehow cleared, though current logic shouldn't)
            if (originalPreviewArea) displayFilePreviews(state.selectedFiles, originalPreviewArea);

            if (convertedPreviewArea) convertedPreviewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center flex items-center justify-center h-full"><i class="fas fa-spinner fa-spin mr-2"></i>Converting images...</p>';
            const progressArea = document.getElementById('progressArea');
            if (progressArea) progressArea.classList.remove('hidden');
            updateProgress(0, state.selectedFiles.length);

            const quality = parseFloat(qualitySlider.value);
            const selectedOutputFormat = outputFormatSelect.value;

            state.selectedFiles.forEach((file, index) => {
                postTaskToWorker(file, selectedOutputFormat, quality, file.name, index);
            });
        });
    }

    // Download ZIP handler
    if (downloadZipButton) {
        downloadZipButton.addEventListener('click', async () => {
            const validBlobs = state.convertedBlobs.filter(b => b && b.blob);
            if (validBlobs.length === 0) {
                displayMessage('No converted images to download.');
                return;
            }

            const zip = new JSZip(); // JSZip is global via CDN
            validBlobs.forEach((result) => {
                zip.file(result.originalName, result.blob);
            });

            try {
                const content = await zip.generateAsync({ type: 'blob' });
                const zipUrl = URL.createObjectURL(content);
                state.previewUrls.push(zipUrl); // Track for cleanup

                const link = document.createElement('a');
                link.href = zipUrl;
                link.download = 'converted_images.zip';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                // URL.revokeObjectURL(zipUrl); // Revoke immediately after click if not needed for long
                displayMessage('ZIP file download started!', false);
            } catch (error) {
                console.error('Error creating ZIP:', error);
                displayMessage('Error creating ZIP file. Please try downloading images individually.', true);
            }
        });
    }

    // Initialize UI state
    updateFileInputAccept();
    updateOutputFormatDropdown();
    // updateQualitySliderVisibility(); // Called by updateOutputFormatDropdown

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js') // Path relative to origin
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
