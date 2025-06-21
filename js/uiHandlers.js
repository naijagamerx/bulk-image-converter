import { state } from './state.js';

// --- Format Definitions (moved here as they are UI related for format selection) ---
export const formatCompatibility = {
    'image/png': ['image/jpeg', 'image/webp', 'image/bmp', 'image/gif'],
    'image/jpeg': ['image/png', 'image/webp', 'image/bmp', 'image/gif'],
    'image/webp': ['image/png', 'image/jpeg', 'image/bmp', 'image/gif'],
    'image/tiff': ['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif'],
    'image/bmp': ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    'image/gif': ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'],
    'image/svg+xml': ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'],
    'image/x-icon': ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'],
    'text/markdown': ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
    'application/pdf': []
};

export const formatDisplayNames = {
    'image/png': 'PNG',
    'image/jpeg': 'JPEG',
    'image/webp': 'WEBP',
    'image/bmp': 'BMP',
    'image/gif': 'GIF (Static)',
    'image/svg+xml': 'SVG',
    'image/tiff': 'TIFF (Input only)',
    'image/x-icon': 'ICO (Input only)',
    'text/markdown': 'Markdown (.md)',
    'application/pdf': 'PDF (.pdf)'
};

// --- Utility functions (formerly utils) ---
export function displayMessage(message, isError = true) {
    const messageArea = document.getElementById('messageArea');
    if (!messageArea) return;
    messageArea.textContent = message;
    messageArea.classList.remove('hidden');
    messageArea.classList.toggle('text-red-600', isError);
    messageArea.classList.toggle('text-green-600', !isError);
}

export function updateProgress(current, total) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    if (!progressBar || !progressText) return;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    progressBar.value = percentage;
    progressText.textContent = `${percentage}% (${current}/${total} files processed)`;
}

export function clearPreviewsAndResults() {
    state.previewUrls.forEach(url => URL.revokeObjectURL(url));
    state.selectedFiles = [];
    state.convertedBlobs = [];
    state.previewUrls = [];

    const originalPreviewArea = document.getElementById('originalPreviewArea');
    if (originalPreviewArea) originalPreviewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center flex items-center justify-center h-full"><i class="fas fa-arrow-up-from-bracket mr-2"></i> Select images to see previews.</p>';

    const convertedPreviewArea = document.getElementById('convertedPreviewArea');
    if (convertedPreviewArea) convertedPreviewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center flex items-center justify-center h-full"><i class="fas fa-wand-magic-sparkles mr-2"></i> Converted previews will appear here.</p>';

    const individualLinksArea = document.getElementById('individualLinksArea');
    if (individualLinksArea) individualLinksArea.innerHTML = '';

    const downloadArea = document.getElementById('downloadArea');
    if (downloadArea) downloadArea.classList.add('hidden');

    const downloadZipButton = document.getElementById('downloadZipButton');
    if (downloadZipButton) downloadZipButton.disabled = true;

    const progressArea = document.getElementById('progressArea');
    if (progressArea) progressArea.classList.add('hidden');

    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.value = 0;

    const progressText = document.getElementById('progressText');
    if (progressText) progressText.textContent = '';

    const messageArea = document.getElementById('messageArea');
    if (messageArea) {
        messageArea.textContent = '';
        messageArea.classList.add('hidden');
    }
    // Reset dropzone placeholder if it exists
    const dropZonePlaceholder = document.getElementById('dropZonePlaceholder');
    if (dropZonePlaceholder) {
        dropZonePlaceholder.innerHTML = '<i class="fas fa-cloud-upload-alt text-4xl mb-3"></i><p class="text-lg">Drag & Drop images here</p><p class="text-sm">or use the selection button below</p>';
        dropZonePlaceholder.classList.remove('hidden');
    }
    // Disable convert button
    const convertButton = document.getElementById('convertButton');
    if (convertButton) convertButton.disabled = true;
}

export function createIndividualDownloadLink(blob, filename) {
    const url = URL.createObjectURL(blob);
    state.previewUrls.push(url);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.className = 'text-sm bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded transition-colors flex items-center justify-center';
    link.innerHTML = `<i class="fas fa-download mr-2"></i>${filename}`;

    const individualLinksArea = document.getElementById('individualLinksArea');
    if (individualLinksArea) individualLinksArea.appendChild(link);
}

// --- FullScreenPreview Handler (formerly fullScreenPreview object) ---
export const fullScreenPreview = {
    show(imgElement) {
        if (!imgElement) return;
        const fullScreenContainer = document.getElementById('fullScreenPreview');
        const fullScreenImage = document.getElementById('fullScreenImage');
        if (!fullScreenContainer || !fullScreenImage) return;

        const container = imgElement.closest('.preview-grid');
        if (!container) return;

        const allImages = Array.from(container.querySelectorAll('img'));
        state.currentPreviewIndex = allImages.indexOf(imgElement);

        fullScreenImage.src = imgElement.src;
        fullScreenContainer.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },
    close() {
        const fullScreenContainer = document.getElementById('fullScreenPreview');
        if (fullScreenContainer) fullScreenContainer.classList.add('hidden');
        document.body.style.overflow = '';
    },
    navigate(direction) {
        const container = document.querySelector('.preview-grid.has-items'); // This might need to be more specific if multiple grids exist
        if (!container) return;

        const allImages = Array.from(container.querySelectorAll('img'));
        if (allImages.length === 0) return;

        state.currentPreviewIndex += direction;
        if (state.currentPreviewIndex < 0) state.currentPreviewIndex = allImages.length - 1;
        if (state.currentPreviewIndex >= allImages.length) state.currentPreviewIndex = 0;

        const fullScreenImage = document.getElementById('fullScreenImage');
        if (fullScreenImage) fullScreenImage.src = allImages[state.currentPreviewIndex].src;
    }
};


// --- Preview Handlers (formerly previewHandlers object) ---
export function displayFilePreviews(files, previewArea) {
    if (!previewArea) return;
    previewArea.innerHTML = '';

    if (files.length === 0) {
        previewArea.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center flex items-center justify-center h-full"><i class="fas fa-arrow-up-from-bracket mr-2"></i> Select images to see previews.</p>';
        previewArea.classList.remove('has-items');
        return;
    }

    previewArea.classList.add('has-items');
    let processedItems = 0;
    const totalItems = files.length;
    const inputFormatSelect = document.getElementById('inputFormatSelect');

    files.forEach((file, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-item-wrapper animate-fade-in';
        // wrapper.style.animationDelay = `${index * 0.05}s`;

        const currentSelectedInputFormat = inputFormatSelect ? inputFormatSelect.value : '';
        const isMarkdownFile = (
            file.type === 'text/markdown' ||
            file.type === 'text/plain' ||
            (typeof file.name === 'string' && file.name.toLowerCase().endsWith('.md')) ||
            (typeof file.name === 'string' && file.name.toLowerCase().endsWith('.markdown'))
        );

        if (isMarkdownFile && currentSelectedInputFormat === 'text/markdown') {
            const placeholderDiv = document.createElement('div');
            placeholderDiv.className = 'markdown-preview-placeholder flex flex-col items-center justify-center text-gray-500 w-full h-32 border rounded-md shadow-sm bg-gray-50 p-2';
            const icon = document.createElement('i');
            icon.className = 'fas fa-file-alt text-4xl mb-2 text-gray-400';
            placeholderDiv.appendChild(icon);
            const nameSpan = document.createElement('span');
            nameSpan.className = 'text-xs text-center break-all w-full px-1';
            nameSpan.textContent = file.name;
            nameSpan.title = file.name;
            placeholderDiv.appendChild(nameSpan);
            wrapper.appendChild(placeholderDiv);
            previewArea.appendChild(wrapper);
            processedItems++;
            if (processedItems === totalItems && previewArea.parentElement) {
                previewArea.parentElement.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = `Preview of ${file.name}`;
                img.title = file.name;
                img.classList.add('rounded-md', 'shadow-sm', 'object-contain', 'w-full', 'h-32', 'opacity-0', 'transition-opacity', 'duration-300', 'cursor-pointer');
                img.addEventListener('click', () => fullScreenPreview.show(img));

                img.onload = () => {
                    processedItems++;
                    img.classList.remove('opacity-0');
                    if (processedItems === totalItems && previewArea.parentElement) {
                        previewArea.parentElement.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                };
                img.onerror = () => {
                    processedItems++;
                    console.error(`Preview Error: Failed to load preview for ${file.name}`);
                    const errorP = document.createElement('p');
                    errorP.textContent = `Error loading ${file.name}`;
                    errorP.className = 'text-xs text-red-500 p-1 text-center break-all';
                    wrapper.innerHTML = '';
                    wrapper.appendChild(errorP);
                    wrapper.classList.add('flex', 'items-center', 'justify-center', 'w-full', 'h-32', 'border', 'rounded-md', 'bg-gray-50');
                    if (processedItems === totalItems && previewArea.parentElement) {
                        previewArea.parentElement.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                };
                wrapper.appendChild(img);
            };
            reader.onerror = () => {
                processedItems++;
                console.error(`FileReader Error: Failed to read file ${file.name}`);
                const errorP = document.createElement('p');
                errorP.textContent = `Cannot read ${file.name}`;
                errorP.className = 'text-xs text-red-500 p-1 text-center break-all';
                wrapper.innerHTML = '';
                wrapper.appendChild(errorP);
                wrapper.classList.add('flex', 'items-center', 'justify-center', 'w-full', 'h-32', 'border', 'rounded-md', 'bg-gray-50');
                if (processedItems === totalItems && previewArea.parentElement) {
                     previewArea.parentElement.scrollTo({ top: 0, behavior: 'smooth' });
                }
            };
            previewArea.appendChild(wrapper);
            reader.readAsDataURL(file);
        }
    });
}


// --- Format Handlers (formerly formatHandlers object) ---
export function updateFileInputAccept() {
    const inputFormatSelect = document.getElementById('inputFormatSelect');
    const fileInput = document.getElementById('fileInput');
    if (!inputFormatSelect || !fileInput) return;

    const selectedFormat = inputFormatSelect.value;
    let acceptString = selectedFormat;

    if (selectedFormat === 'image/tiff') acceptString += ', .tif, .tiff';
    else if (selectedFormat === 'image/bmp') acceptString += ', .bmp';
    else if (selectedFormat === 'image/gif') acceptString += ', .gif';
    else if (selectedFormat === 'image/x-icon') acceptString += ', .ico';
    else if (selectedFormat === 'image/svg+xml') acceptString += ', .svg';
    else if (selectedFormat === 'image/jpeg') acceptString += ', .jpg, .jpeg, .jfif, .pjpeg, .pjp';
    else if (selectedFormat === 'image/png') acceptString += ', .png';
    else if (selectedFormat === 'image/webp') acceptString += ', .webp';
    else if (selectedFormat === 'text/markdown') acceptString = 'text/markdown,.md,.markdown,text/plain';
    else if (selectedFormat === 'application/pdf') acceptString += ', .pdf';

    fileInput.accept = acceptString;
}

export function updateQualitySliderVisibility() {
    const outputFormatSelect = document.getElementById('outputFormatSelect');
    if (!outputFormatSelect) return;

    const selectedFormat = outputFormatSelect.value;
    const qualitySliderParent = document.getElementById('qualitySlider')?.parentElement;
    const qualityLabel = document.getElementById('qualityLabel');

    if (!qualitySliderParent || !qualityLabel) return;

    const qualitySensitiveFormats = ['image/jpeg', 'image/webp'];

    if (qualitySensitiveFormats.includes(selectedFormat)) {
        qualitySliderParent.style.display = 'block';
        qualityLabel.textContent = selectedFormat === 'image/jpeg' ? 'JPEG Quality:' : 'WebP Quality:';
    } else {
        qualitySliderParent.style.display = 'none';
    }
}

export function updateOutputFormatDropdown() {
    const inputFormatSelect = document.getElementById('inputFormatSelect');
    const outputFormatSelect = document.getElementById('outputFormatSelect');
    if (!inputFormatSelect || !outputFormatSelect) return;

    const selectedInputFormat = inputFormatSelect.value;
    let compatibleOutputs = formatCompatibility[selectedInputFormat];

    if (!compatibleOutputs || compatibleOutputs.length === 0) {
        if (selectedInputFormat === 'application/pdf') {
             compatibleOutputs = [];
        } else {
             compatibleOutputs = ['image/png', 'image/jpeg', 'image/webp'];
        }
    }

    const currentOutputValue = outputFormatSelect.value;
    outputFormatSelect.innerHTML = '';

    if (compatibleOutputs.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No conversion available";
        option.disabled = true;
        outputFormatSelect.appendChild(option);
        outputFormatSelect.value = "";
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
            } else if (selectedInputFormat !== 'image/png' && compatibleOutputs.includes('image/png')) {
                newSelectedOutput = 'image/png';
            } else if (compatibleOutputs.includes('image/png') && selectedInputFormat === 'image/png') {
                if (compatibleOutputs.includes('image/jpeg')) newSelectedOutput = 'image/jpeg';
                else if (compatibleOutputs.includes('image/webp')) newSelectedOutput = 'image/webp';
                else newSelectedOutput = compatibleOutputs[0];
            } else {
                newSelectedOutput = compatibleOutputs[0];
            }
        }

        if (newSelectedOutput) {
            outputFormatSelect.value = newSelectedOutput;
        } else if (outputFormatSelect.options.length > 0) {
             outputFormatSelect.selectedIndex = 0;
        }
    }
    updateQualitySliderVisibility(); // Call directly
}


// --- Filename Generation (formerly part of converter object) ---
export function generateOutputFilename(originalFileNameInput, index, outputFormatTypeParam) {
    const renamingPatternInput = document.getElementById('renamingPattern');
    const outputFormatSelect = document.getElementById('outputFormatSelect'); // Used if outputFormatTypeParam is not given

    const pattern = renamingPatternInput ? renamingPatternInput.value : '{original}';

    let ext;
    const mimeToExt = {
        'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
        'image/tiff': 'tif', 'image/bmp': 'bmp', 'image/gif': 'gif',
        'image/x-icon': 'ico', 'image/svg+xml': 'svg', 'application/pdf': 'pdf'
    };

    let actualOutputFormat = outputFormatTypeParam;
    if (!actualOutputFormat) { // If not directly passed, get from select dropdown
        actualOutputFormat = outputFormatSelect ? outputFormatSelect.value : 'image/png'; // Default to png if select not found
    }

    if (mimeToExt[actualOutputFormat]) {
        ext = mimeToExt[actualOutputFormat];
    } else {
        const valueParts = actualOutputFormat.split('/');
        ext = valueParts[valueParts.length - 1] || 'bin';
    }

    if (ext === 'jpeg') ext = 'jpg';
    if (ext === 'svg+xml') ext = 'svg';
    if (ext === 'tiff') ext = 'tif';
    if (ext === 'x-icon') ext = 'ico';

    const now = new Date();
    let filename = pattern
        .replace('{original}', originalFileNameInput.replace(/\.[^/.]+$/, ''))
        .replace('{index}', String(index + 1).padStart(3, '0'))
        .replace('{date}', now.toISOString().split('T')[0])
        .replace('{time}', now.toTimeString().split(' ')[0].replace(/:/g, '-'));

    return `${filename}.${ext}`;
}


// --- Theme Handlers (formerly themeHandlers object) ---
export const themeHandlers = {
    init() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const themeToggle = document.getElementById('themeToggle');

        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (themeToggle) themeToggle.classList.add('dark');
        } else {
            document.documentElement.removeAttribute('data-theme'); // Ensure light theme is default if no preference
            if (themeToggle) themeToggle.classList.remove('dark');
        }
    },
    toggle() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const themeToggle = document.getElementById('themeToggle');

        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            if (themeToggle) themeToggle.classList.remove('dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            if (themeToggle) themeToggle.classList.add('dark');
        }
    }
};

// --- Modal Handlers (formerly modalHandlers object) ---
export const modalHandlers = {
    showModal() {
        const aboutModal = document.getElementById('aboutModal');
        const modalContent = aboutModal?.querySelector('.modal-content'); // Use optional chaining
        if (!aboutModal || !modalContent) return;

        aboutModal.classList.add('show');
        document.body.style.overflow = 'hidden';

        if (window.innerWidth < 640) {
            modalContent.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },
    hideModal() {
        const aboutModal = document.getElementById('aboutModal');
        if (aboutModal) aboutModal.classList.remove('show');
        document.body.style.overflow = '';
    }
};

// Note: The main convertImage function (which was part of the 'converter' object)
// is not moved here as it's primarily involved in orchestrating worker communication or fallback,
// so it will be part of app.js or workerClient.js.
// The generateOutputFilename was moved here as it's a pure utility related to naming outputs.
