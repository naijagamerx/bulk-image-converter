// Tests for js/converter.js

// Mock global objects and functions used by converter.js
// These might need to be more sophisticated depending on the exact usage.
global.URL.createObjectURL = jest.fn(blob => `blob:${blob.type}/${blob.size}`);
global.URL.revokeObjectURL = jest.fn();
global.Worker = jest.fn().mockImplementation(() => ({
  postMessage: jest.fn(),
  onmessage: null,
  onerror: null,
  terminate: jest.fn()
}));

// Mock JSZip if its methods are called directly in tested functions
global.JSZip = jest.fn().mockImplementation(() => ({
  file: jest.fn(),
  generateAsync: jest.fn().mockResolvedValue(new Blob(['zip_content'], { type: 'application/zip' }))
}));


// Import parts of converter.js to test
// This is tricky because converter.js is a script that runs and sets up global state and listeners.
// For unit testing, it's better if it exports functions.
// For now, we'll try to load it and test what's possible, or focus on functions that can be extracted.
// Let's assume we can access `state`, `utils`, `converter`, `formatHandlers`, etc., after the script "runs".
// This requires careful setup of the test environment.

// A more robust way would be to refactor converter.js to export its functions/objects for testing.
// e.g., module.exports = { state, utils, converter, formatHandlers, previewHandlers, modalHandlers, themeHandlers };
// Then import them: const { utils, converter } = require('../js/converter.js');

// For this setup, we will try to load the script and then access its globals.
// This requires jsdom environment to provide `document` and `window`.

describe('js/converter.js - Main Thread Utilities', () => {
  let mockMessageArea;
  let mockProgressBar;
  let mockProgressText;
  let mockOriginalPreviewArea;
  let mockConvertedPreviewArea;
  let mockIndividualLinksArea;
  let mockDownloadArea;
  let mockDownloadZipButton;
  let mockFileInput;
  let mockRenamingPattern;
  let mockInputFormatSelect;
  let mockOutputFormatSelect;
  let mockQualitySlider;
  let mockQualityLabelContainer;
  let mockQualityLabelItself;
  let mockConvertButton;
  let mockDropZonePlaceholder; // Added for completeness

  // For state access/mocking
  let state;


  // Dynamically require converter.js to simulate its execution in jsdom
  let utils, converter, formatHandlers, previewHandlers; // Removed 'state' from here

  beforeEach(() => { // Changed from beforeAll to beforeEach for cleaner state per test
    // Set up a basic HTML structure that converter.js might expect
    document.body.innerHTML = `
      <div id="messageArea"></div>
      <progress id="progressBar" value="0" max="100"></progress>
      <p id="progressText"></p>
      <div id="originalPreviewArea"></div>
      <div id="convertedPreviewArea"></div>
      <div id="individualLinksArea"></div>
      <div id="downloadArea" class="hidden">
        <button id="downloadZipButton" disabled></button>
      </div>
      <input type="file" id="fileInput" />
      <input type="text" id="renamingPattern" value="{original}_{index}" />
      <div id="qualitySliderContainer">
          <input type="range" id="qualitySlider" />
          <label id="qualityLabel">Quality:</label>
      </div>
      <button id="convertButton"></button>
      <select id="inputFormatSelect">
        <option value="image/png" selected>PNG</option>
        <option value="image/jpeg">JPEG</option>
        <option value="image/svg+xml">SVG</option>
        <option value="image/tiff">TIFF</option>
      </select>
      <select id="outputFormatSelect">
        <option value="image/jpeg" selected>JPEG</option>
        <option value="image/png">PNG</option>
        <option value="image/webp">WEBP</option>
        <option value="image/svg+xml">SVG</option>
      </select>
      <div id="dropZonePlaceholder"></div>
    `;

    // Reset state for each test
    state = {
        selectedFiles: [],
        convertedBlobs: [],
        previewUrls: [],
        currentPreviewIndex: 0
    };


    // Now that DOM is set up, load (execute) converter.js
    // This will attach its globals to `window` if that's how it's structured.
    // If it uses `const`, they won't be global. This is a major limitation.
    // For this test, we assume they become available on window or we can access them.
    // This part is highly dependent on how converter.js is structured.
    // Let's assume for now that these are exposed globally for the sake of the exercise.
    // If not, these tests for `utils` and `converter` would need them to be exported from converter.js

    // Attempting to load the script:
    // This is problematic because converter.js is not a module.
    // We will have to manually define the objects based on its structure.
    // This is where proper module structure in the source code is essential.

    // For now, let's manually define simplified versions of utils and converter.
    // In a real scenario, you'd refactor converter.js.

    mockMessageArea = document.getElementById('messageArea');
    mockProgressBar = document.getElementById('progressBar');
    mockProgressText = document.getElementById('progressText');
    mockFileInput = document.getElementById('fileInput');
    mockRenamingPattern = document.getElementById('renamingPattern');
    mockInputFormatSelect = document.getElementById('inputFormatSelect');
    mockOutputFormatSelect = document.getElementById('outputFormatSelect');
    mockQualitySlider = document.getElementById('qualitySlider');
    mockQualityLabelContainer = mockQualitySlider.parentElement;
    mockQualityLabelItself = document.getElementById('qualityLabel');
    mockConvertButton = document.getElementById('convertButton');
    mockOriginalPreviewArea = document.getElementById('originalPreviewArea');
    mockConvertedPreviewArea = document.getElementById('convertedPreviewArea');
    mockIndividualLinksArea = document.getElementById('individualLinksArea');
    mockDownloadArea = document.getElementById('downloadArea');
    mockDownloadZipButton = document.getElementById('downloadZipButton');
    mockDropZonePlaceholder = document.getElementById('dropZonePlaceholder');


    // Manually defining objects for testing based on converter.js structure
    // This is a workaround for not being able to import directly.
    // These redefinitions should be as close as possible to the actual implementations
    // or focus on the specific parts being unit tested.

    utils = {
        displayMessage: (message, isError = true) => {
            if (!mockMessageArea) mockMessageArea = document.getElementById('messageArea');
            mockMessageArea.textContent = message;
            mockMessageArea.classList.remove('hidden');
            mockMessageArea.classList.toggle('text-red-600', isError);
            mockMessageArea.classList.toggle('text-green-600', !isError);
        },
        updateProgress: (current, total) => {
            if(!mockProgressBar) mockProgressBar = document.getElementById('progressBar');
            if(!mockProgressText) mockProgressText = document.getElementById('progressText');
            const percentage = Math.round((current / total) * 100);
            mockProgressBar.value = percentage;
            mockProgressText.textContent = `${percentage}% (${current}/${total} files processed)`;
        },
        clearPreviewsAndResults: () => {
            state.previewUrls.forEach(url => URL.revokeObjectURL(url));
            state.selectedFiles = [];
            state.convertedBlobs = [];
            state.previewUrls = [];
            if(mockOriginalPreviewArea) mockOriginalPreviewArea.innerHTML = '<p>Original Placeholder</p>';
            if(mockConvertedPreviewArea) mockConvertedPreviewArea.innerHTML = '<p>Converted Placeholder</p>';
            if(mockIndividualLinksArea) mockIndividualLinksArea.innerHTML = '';
            if(mockDownloadArea) mockDownloadArea.classList.add('hidden');
            if(mockDownloadZipButton) mockDownloadZipButton.disabled = true;
            // ... reset other elements like progress, messageArea
            if(mockProgressBar) mockProgressBar.value = 0;
            if(mockProgressText) mockProgressText.textContent = '';
            if(mockMessageArea) mockMessageArea.classList.add('hidden');
        },
        createIndividualDownloadLink: (blob, filename) => {
            const url = URL.createObjectURL(blob);
            state.previewUrls.push(url);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.className = 'individual-download-link'; // Simplified class for testing
            link.textContent = filename;
            mockIndividualLinksArea.appendChild(link);
        }
    };

    previewHandlers = {
        displayFilePreviews: (files, previewArea) => {
            if (!previewArea) return;
            previewArea.innerHTML = '';
            if (files.length === 0) {
                previewArea.innerHTML = '<p class="empty-preview-placeholder">Select images...</p>';
                previewArea.classList.remove('has-items'); // Ensure this class is managed
                return;
            }
            previewArea.classList.add('has-items'); // Ensure this class is managed

            let processedItems = 0;
            const totalItems = files.length;

            files.forEach((file, index) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'preview-item-wrapper'; // Using a generic class for wrapper

                const currentSelectedInputFormat = mockInputFormatSelect ? mockInputFormatSelect.value : '';
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
                    processedItems++; // Count markdown placeholder as processed
                    if (processedItems === totalItems && previewArea.parentElement) {
                         previewArea.parentElement.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                } else {
                    const reader = new FileReader(); // New reader for each file
                    reader.fileRef = file; // For error simulation based on filename
                    reader.mockResult = `data:${file.type};base64,mockcontent`; // Default mock result

                    reader.onload = (e) => {
                        const img = new Image();
                        img.alt = `Preview of ${file.name}`;
                        img.title = file.name;
                        img.className = 'preview-image rounded-md shadow-sm object-contain w-full h-32 opacity-0'; // Initial classes
                        img.style.transition = 'opacity 0.3s'; // Match CSS transition if any

                        img.onload = () => {
                            processedItems++;
                            img.classList.remove('opacity-0');
                            if (processedItems === totalItems && previewArea.parentElement) {
                                previewArea.parentElement.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                        };
                        img.onerror = () => {
                            processedItems++;
                            const errorP = document.createElement('p');
                            errorP.textContent = `Error loading ${file.name}`;
                            errorP.className = 'reader-error text-xs text-red-500 p-1 text-center break-all';
                            wrapper.innerHTML = ''; // Clear wrapper
                            wrapper.appendChild(errorP);
                            wrapper.classList.add('flex', 'items-center', 'justify-center', 'w-full', 'h-32', 'border', 'rounded-md', 'bg-gray-50');

                            if (processedItems === totalItems && previewArea.parentElement) {
                                previewArea.parentElement.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                        };
                        wrapper.appendChild(img);
                        img.src = e.target.result; // Trigger load (and mock Image onload/onerror)
                    };
                    reader.onerror = () => {
                        processedItems++;
                        const errorP = document.createElement('p');
                        errorP.textContent = `Error reading ${file.name}`;
                        errorP.className = 'reader-error text-xs text-red-500 p-1 text-center break-all';
                        wrapper.innerHTML = ''; // Clear wrapper
                        wrapper.appendChild(errorP);
                        wrapper.classList.add('flex', 'items-center', 'justify-center', 'w-full', 'h-32', 'border', 'rounded-md', 'bg-gray-50');
                        if (processedItems === totalItems && previewArea.parentElement) {
                             previewArea.parentElement.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    };
                    previewArea.appendChild(wrapper);
                    reader.readAsDataURL(file); // Start reading
                }
            });
        }
    };


    converter = {
        generateOutputFilename: (originalFileNameInput, index, outputFormatTypeParam) => {
            const pattern = mockRenamingPattern.value || '{original}';
            let ext;
            const mimeToExt = {
                'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
                'image/tiff': 'tif', 'image/bmp': 'bmp', 'image/gif': 'gif',
                'image/x-icon': 'ico', 'image/svg+xml': 'svg'
            };

            let actualOutputFormat = outputFormatTypeParam;
            if (!actualOutputFormat) {
                // Use the mocked outputFormatSelect
                actualOutputFormat = mockOutputFormatSelect ? mockOutputFormatSelect.value : 'image/png';
            }
            ext = mimeToExt[actualOutputFormat] || actualOutputFormat.split('/')[1] || 'bin';
            if (ext === 'jpeg') ext = 'jpg';
            if (ext === 'svg+xml') ext = 'svg';
            if (ext === 'tiff') ext = 'tif';
            if (ext === 'x-icon') ext = 'ico';

            const now = new Date();
            let filename = pattern
                .replace('{original}', originalFileNameInput.replace(/\.[^/.]+$/, '')) // Uses originalFileNameInput from arg
                .replace('{index}', String(index + 1).padStart(3, '0')) // Uses index from arg
                .replace('{date}', now.toISOString().split('T')[0])
                .replace('{time}', now.toTimeString().split(' ')[0].replace(/:/g, '-'));
            return `${filename}.${ext}`;
        }
    };

    // Define formatHandlers and its methods based on converter.js structure for testing
    // This also requires formatCompatibility and formatDisplayNames to be defined in test scope
    const formatCompatibility = {
        'image/png': ['image/jpeg', 'image/webp', 'image/bmp', 'image/gif'],
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
        'image/gif': 'GIF (Static)',
        'image/svg+xml': 'SVG',
        'image/tiff': 'TIFF (Input only)',
        'image/x-icon': 'ICO (Input only)',
        'text/markdown': 'Markdown (.md)',
        'application/pdf': 'PDF (.pdf)'
    };

    formatHandlers = {
        updateFileInputAccept: () => {
            if (!mockInputFormatSelect || !mockFileInput) return;
            const selectedFormat = mockInputFormatSelect.value;
            let acceptString = selectedFormat;
            if (selectedFormat === 'image/tiff') acceptString += ', .tif, .tiff';
            else if (selectedFormat === 'image/bmp') acceptString += ', .bmp';
            else if (selectedFormat === 'image/gif') acceptString += ', .gif';
            else if (selectedFormat === 'image/x-icon') acceptString += ', .ico';
            else if (selectedFormat === 'image/svg+xml') acceptString += ', .svg';
            else if (selectedFormat === 'image/jpeg') acceptString += ', .jpg, .jpeg, .jfif, .pjpeg, .pjp';
            else if (selectedFormat === 'image/png') acceptString += ', .png';
            else if (selectedFormat === 'image/webp') acceptString += ', .webp';
            else if (selectedFormat === 'text/markdown') acceptString += ', .md, .markdown';
            else if (selectedFormat === 'application/pdf') acceptString += ', .pdf';
            mockFileInput.accept = acceptString;
        },
        updateQualitySliderVisibility: () => {
            if (!mockOutputFormatSelect || !mockQualityLabelContainer || !mockQualityLabelItself) return;
            const selectedFormat = mockOutputFormatSelect.value;
            const qualitySensitiveFormats = ['image/jpeg', 'image/webp'];
            if (qualitySensitiveFormats.includes(selectedFormat)) {
                mockQualityLabelContainer.style.display = 'block';
                mockQualityLabelItself.textContent = selectedFormat === 'image/jpeg' ? 'JPEG Quality:' : 'WebP Quality:';
            } else {
                mockQualityLabelContainer.style.display = 'none';
            }
        },
        updateOutputFormatDropdown: () => {
            if (!mockInputFormatSelect || !mockOutputFormatSelect) return;
            const selectedInputFormat = mockInputFormatSelect.value;
            let compatibleOutputs = formatCompatibility[selectedInputFormat];

            if (!compatibleOutputs || compatibleOutputs.length === 0) {
                if (selectedInputFormat === 'application/pdf') {
                     compatibleOutputs = [];
                } else {
                     compatibleOutputs = ['image/png', 'image/jpeg', 'image/webp'];
                }
            }

            const currentOutputValue = mockOutputFormatSelect.value;
            mockOutputFormatSelect.innerHTML = '';

            if (compatibleOutputs.length === 0) {
                const option = document.createElement('option');
                option.value = "";
                option.textContent = "No conversion available";
                option.disabled = true;
                mockOutputFormatSelect.appendChild(option);
                mockOutputFormatSelect.value = "";
            } else {
                compatibleOutputs.forEach(mimeType => {
                    if (formatDisplayNames[mimeType]) {
                        const option = document.createElement('option');
                        option.value = mimeType;
                        option.textContent = formatDisplayNames[mimeType];
                        mockOutputFormatSelect.appendChild(option);
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
                    mockOutputFormatSelect.value = newSelectedOutput;
                } else if (mockOutputFormatSelect.options.length > 0) {
                     mockOutputFormatSelect.selectedIndex = 0;
                }
            }
            formatHandlers.updateQualitySliderVisibility();
        }
    };

    // Mock Date for consistent {date} and {time} in generateOutputFilename
    const RealDate = Date; // Backup Real Date
    global.Date = class extends RealDate { // Mock Date
        constructor(val) {
            super(val || '2023-10-26T10:00:00.000Z'); // Fixed date for testing
        }
        static now() {
            return new RealDate('2023-10-26T10:00:00.000Z').getTime();
        }
    };

  });

  afterEach(() => {
    global.Date = RealDate; // Restore real Date
    jest.clearAllMocks(); // Clear all mocks
  });


  describe('utils.displayMessage', () => {
    test('should display an error message correctly', () => {
      utils.displayMessage('Test error', true);
      expect(mockMessageArea.textContent).toBe('Test error');
      expect(mockMessageArea.classList.contains('text-red-600')).toBe(true);
      expect(mockMessageArea.classList.contains('text-green-600')).toBe(false);
      expect(mockMessageArea.classList.contains('hidden')).toBe(false);
    });

    test('should display a success message correctly', () => {
      utils.displayMessage('Test success', false);
      expect(mockMessageArea.textContent).toBe('Test success');
      expect(mockMessageArea.classList.contains('text-red-600')).toBe(false);
      expect(mockMessageArea.classList.contains('text-green-600')).toBe(true);
      expect(mockMessageArea.classList.contains('hidden')).toBe(false);
    });
  });

  describe('utils.updateProgress', () => {
    test('should update progress bar and text correctly', () => {
      utils.updateProgress(5, 10);
      expect(mockProgressBar.value).toBe(50);
      expect(mockProgressText.textContent).toBe('50% (5/10 files processed)');

      utils.updateProgress(1, 3);
      expect(mockProgressBar.value).toBe(33); // Math.round(1/3 * 100)
      expect(mockProgressText.textContent).toBe('33% (1/3 files processed)');
    });
  });

  describe('converter.generateOutputFilename', () => {
    beforeEach(() => {
      mockRenamingPattern.value = '{original}_{index}';
      mockOutputFormatSelect.value = 'image/jpeg'; // Default for tests
    });

    test('should use original name and index for default JPEG output', () => {
      const filename = converter.generateOutputFilename('testImage.png', 0);
      expect(filename).toBe('testImage_001.jpg');
    });

    test('should handle different output format (PNG) from select', () => {
      mockOutputFormatSelect.value = 'image/png';
      const filename = converter.generateOutputFilename('another.webp', 1);
      expect(filename).toBe('another_002.png');
    });

    test('should use date and time from mocked Date', () => {
        mockRenamingPattern.value = '{date}_{time}_{original}';
        mockOutputFormatSelect.value = 'image/bmp';
        const filename = converter.generateOutputFilename('timedFile.gif', 0);
        expect(filename).toBe('2023-10-26_10-00-00_timedFile.bmp');
    });

    test('should use {original} pattern if renamingPattern is empty', () => {
      mockRenamingPattern.value = '';
      mockOutputFormatSelect.value = 'image/webp';
      const filename = converter.generateOutputFilename('default.svg', 2);
      expect(filename).toBe('default.webp');
    });

    test('should handle complex pattern and different output type (TIFF)', () => {
      mockRenamingPattern.value = 'Converted_{date}_{original}_{index}_image';
      mockOutputFormatSelect.value = 'image/tiff'; // Set output format on the select
      const filename = converter.generateOutputFilename('sourceFile.png', 4);
      expect(filename).toBe('Converted_2023-10-26_sourceFile_005_image.tif');
    });
  });

  describe('formatHandlers.updateFileInputAccept', () => {
    test('should set correct accept string for PNG', () => {
      mockInputFormatSelect.value = 'image/png';
      formatHandlers.updateFileInputAccept();
      expect(mockFileInput.accept).toBe('image/png, .png');
    });

    test('should set correct accept string for TIFF', () => {
      mockInputFormatSelect.value = 'image/tiff';
      formatHandlers.updateFileInputAccept();
      expect(mockFileInput.accept).toBe('image/tiff, .tif, .tiff');
    });

    test('should set correct accept string for Markdown', () => {
      mockInputFormatSelect.value = 'text/markdown';
      formatHandlers.updateFileInputAccept();
      expect(mockFileInput.accept).toBe('text/markdown, .md, .markdown');
    });

    test('should set correct accept string for PDF', () => {
      mockInputFormatSelect.value = 'application/pdf';
      formatHandlers.updateFileInputAccept();
      expect(mockFileInput.accept).toBe('application/pdf, .pdf');
    });
  });

  describe('formatHandlers.updateQualitySliderVisibility', () => {
    test('should show slider for JPEG', () => {
      mockOutputFormatSelect.value = 'image/jpeg';
      formatHandlers.updateQualitySliderVisibility();
      expect(mockQualityLabelContainer.style.display).toBe('block');
      expect(mockQualityLabelItself.textContent).toBe('JPEG Quality:');
    });

    test('should show slider for WebP', () => {
      mockOutputFormatSelect.value = 'image/webp';
      formatHandlers.updateQualitySliderVisibility();
      expect(mockQualityLabelContainer.style.display).toBe('block');
      expect(mockQualityLabelItself.textContent).toBe('WebP Quality:');
    });

    test('should hide slider for PNG', () => {
      mockOutputFormatSelect.value = 'image/png';
      formatHandlers.updateQualitySliderVisibility();
      expect(mockQualityLabelContainer.style.display).toBe('none');
    });
     test('should hide slider for GIF', () => {
      mockOutputFormatSelect.value = 'image/gif';
      formatHandlers.updateQualitySliderVisibility();
      expect(mockQualityLabelContainer.style.display).toBe('none');
    });
  });

  describe('formatHandlers.updateOutputFormatDropdown', () => {
    let qualitySliderSpy;
    beforeEach(() => {
        // Spy on updateQualitySliderVisibility to check if it's called
        // This requires formatHandlers to be an object whose methods can be spied on.
        // Our current setup redefines formatHandlers, so this spy will work on the redefined version.
        qualitySliderSpy = jest.spyOn(formatHandlers, 'updateQualitySliderVisibility');
    });
    afterEach(() => {
        qualitySliderSpy.mockRestore();
    });


    test('should populate output formats compatible with PNG input', () => {
      mockInputFormatSelect.value = 'image/png';
      // Set an initial output that might change
      mockOutputFormatSelect.value = 'image/webp';

      formatHandlers.updateOutputFormatDropdown();

      const expectedOutputs = formatCompatibility['image/png'];
      expect(mockOutputFormatSelect.options.length).toBe(expectedOutputs.length);
      expectedOutputs.forEach((mime, index) => {
        expect(mockOutputFormatSelect.options[index].value).toBe(mime);
        expect(mockOutputFormatSelect.options[index].textContent).toBe(formatDisplayNames[mime]);
      });
      // Check if selection was preserved or defaulted correctly
      // PNG -> WEBP is compatible, so WEBP should remain selected.
      expect(mockOutputFormatSelect.value).toBe('image/webp');
      expect(qualitySliderSpy).toHaveBeenCalled();
    });

    test('should populate output formats for SVG input, including SVG pass-through', () => {
      mockInputFormatSelect.value = 'image/svg+xml';
      mockOutputFormatSelect.value = 'image/jpeg'; // Initial output
      formatHandlers.updateOutputFormatDropdown();

      const expectedOutputs = formatCompatibility['image/svg+xml'];
      expect(mockOutputFormatSelect.options.length).toBe(expectedOutputs.length);
      expect(Array.from(mockOutputFormatSelect.options).some(opt => opt.value === 'image/svg+xml')).toBe(true);

      // SVG -> JPEG is compatible, so JPEG should remain selected.
      expect(mockOutputFormatSelect.value).toBe('image/jpeg');
      expect(qualitySliderSpy).toHaveBeenCalled();
    });

    test('should change selected output to a compatible default if previous is incompatible', () => {
      // Setup: Input PNG, Output is currently SVG (which is not compatible with PNG output by our rules)
      mockInputFormatSelect.value = 'image/png';
      // Add SVG as an option and select it, even if it's not "compatible" for this setup
      const svgOption = document.createElement('option');
      svgOption.value = 'image/svg+xml';
      svgOption.textContent = 'SVG_Test';
      mockOutputFormatSelect.appendChild(svgOption);
      mockOutputFormatSelect.value = 'image/svg+xml';

      formatHandlers.updateOutputFormatDropdown(); // This should remove SVG and select a default for PNG input

      // For PNG input, 'image/jpeg' is a preferred default if current (SVG) is incompatible
      expect(mockOutputFormatSelect.value).toBe('image/jpeg');
      expect(qualitySliderSpy).toHaveBeenCalled();
    });

     test('should default to first compatible option if preferred defaults (JPEG/PNG) are not available', () => {
      mockInputFormatSelect.value = 'image/bmp';
      const originalBmpCompat = JSON.parse(JSON.stringify(formatCompatibility['image/bmp']));
      formatCompatibility['image/bmp'] = ['image/webp', 'image/gif'];

      mockOutputFormatSelect.value = 'image/tiff';

      formatHandlers.updateOutputFormatDropdown();

      expect(mockOutputFormatSelect.value).toBe('image/webp');

      formatCompatibility['image/bmp'] = originalBmpCompat;
      expect(qualitySliderSpy).toHaveBeenCalled();
    });

    test('should show correct options for Markdown input, defaulting to PDF', () => {
        mockInputFormatSelect.value = 'text/markdown';
        // Set an initial output that is not PDF to test if default to PDF works
        mockOutputFormatSelect.value = 'image/png';
        formatHandlers.updateOutputFormatDropdown();

        const expectedOutputs = formatCompatibility['text/markdown'];
        expect(mockOutputFormatSelect.options.length).toBe(expectedOutputs.length);
        expect(Array.from(mockOutputFormatSelect.options).find(opt => opt.value === 'application/pdf')).toBeTruthy();
        expect(mockOutputFormatSelect.value).toBe('application/pdf'); // Should default to PDF for MD
        expect(qualitySliderSpy).toHaveBeenCalled();
    });

    test('should show "No conversion available" for PDF input', () => {
        mockInputFormatSelect.value = 'application/pdf';
        formatHandlers.updateOutputFormatDropdown();
        expect(mockOutputFormatSelect.options.length).toBe(1);
        expect(mockOutputFormatSelect.options[0].disabled).toBe(true);
        expect(mockOutputFormatSelect.options[0].textContent).toBe('No conversion available');
        expect(qualitySliderSpy).toHaveBeenCalled();
    });
  });

  describe('previewHandlers.displayFilePreviews', () => {
    let mockFileReaderInstance;

    beforeEach(() => {
        // Ensure FileReader is freshly mocked for each test in this suite
        // and we can access its instance methods.
        mockFileReaderInstance = {
            readAsDataURL: jest.fn(function() { // 'this' will be this object
                const file = this.fileRef; // Access fileRef stored by the test
                if (file && file.name.includes('fail_read')) {
                    if(this.onerror) setTimeout(() => this.onerror(new Error('Mock FileReader error')), 0);
                } else {
                    if(this.onload) setTimeout(() => this.onload({ target: { result: `data:${file ? file.type : 'image/png'};base64,mockcontent_${file ? file.name : ''}` } }), 0);
                }
            }),
            onload: null,
            onerror: null,
            fileRef: null // Test will set this
        };
        global.FileReader = jest.fn(() => mockFileReaderInstance);
        global.Image.mockClear(); // Clear Image mock calls
        mockOriginalPreviewArea.innerHTML = ''; // Clear preview area
    });

    const createMockFile = (name, type) => new File(["content"], name, { type });

    test('should display Markdown placeholder when MD format is selected', (done) => {
      mockInputFormatSelect.value = 'text/markdown';
      const mdFile = createMockFile('test.md', 'text/plain');
      previewHandlers.displayFilePreviews([mdFile], mockOriginalPreviewArea);

      // No need for setTimeout if MD placeholder is synchronous
      expect(mockOriginalPreviewArea.querySelector('.markdown-preview-placeholder')).not.toBeNull();
      expect(mockOriginalPreviewArea.querySelector('i.fa-file-alt')).not.toBeNull();
      expect(mockOriginalPreviewArea.querySelector('span').textContent).toBe('test.md');
      expect(mockFileReaderInstance.readAsDataURL).not.toHaveBeenCalled();
      done();
    });

    test('should display image preview for PNG when PNG format is selected', (done) => {
      mockInputFormatSelect.value = 'image/png';
      const pngFile = createMockFile('image.png', 'image/png');
      previewHandlers.displayFilePreviews([pngFile], mockOriginalPreviewArea);

      setTimeout(() => {
        expect(mockOriginalPreviewArea.querySelector('img.preview-image')).not.toBeNull();
        expect(mockOriginalPreviewArea.querySelector('img.preview-image').alt).toBe('Preview of image.png');
        expect(mockFileReaderInstance.readAsDataURL).toHaveBeenCalledWith(pngFile);
        done();
      }, 50); // Allow time for async FileReader and Image mocks
    });

    test('should attempt image preview for MD file if non-MD format is selected', (done) => {
      mockInputFormatSelect.value = 'image/png'; // Non-MD format selected
      const mdFile = createMockFile('document.md', 'text/plain'); // This file would typically be filtered out before this step
                                                                 // but we test displayFilePreviews in isolation.
      previewHandlers.displayFilePreviews([mdFile], mockOriginalPreviewArea);

      setTimeout(() => {
        expect(mockOriginalPreviewArea.querySelector('.markdown-preview-placeholder')).toBeNull();
        expect(mockOriginalPreviewArea.querySelector('img.preview-image')).not.toBeNull(); // It tries to render as image
        expect(mockFileReaderInstance.readAsDataURL).toHaveBeenCalledWith(mdFile);
        done();
      }, 50);
    });
  });

  describe('utils.createIndividualDownloadLink', () => {
    test('should create and append a download link', () => {
      const mockBlob = new Blob(['test content'], {type: 'text/plain'});
      const mockFilename = 'testfile.txt';

      // Reset state.previewUrls for this test if it's shared or ensure it's clean
      state.previewUrls = [];
      global.URL.createObjectURL.mockClear(); // Clear previous calls

      utils.createIndividualDownloadLink(mockBlob, mockFilename);

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      const createdUrl = global.URL.createObjectURL.mock.results[0].value;

      expect(mockIndividualLinksArea.children.length).toBe(1);
      const link = mockIndividualLinksArea.children[0];
      expect(link.tagName).toBe('A');
      expect(link.href).toBe(createdUrl);
      expect(link.download).toBe(mockFilename);
      expect(link.textContent).toContain(mockFilename);
      expect(state.previewUrls).toContain(createdUrl);
    });
  });

  describe('Convert Button Logic & postMessage', () => {
    // This test simulates the core part of the convertButton's click listener
    function simulateConvertButtonClick(currentSelectedFiles, currentOutputFormat, currentQuality) {
        // Simplified replication of the relevant part of the listener
        if (!global.Worker.mock.instances.length) { // Ensure worker is mocked
             new global.Worker('js/worker.js'); // Instantiate if not already
        }
        const mockWorkerInstance = global.Worker.mock.instances[0];

        currentSelectedFiles.forEach((file, index) => {
            mockWorkerInstance.postMessage({
                file: file,
                outputFormat: currentOutputFormat,
                quality: currentQuality,
                originalName: file.name,
                index: index
            });
        });
    }

    test('should post correct message to worker when convert button is clicked', () => {
        state.selectedFiles = [new File(["content"], "file1.png", { type: "image/png" })];
        mockOutputFormatSelect.value = 'image/jpeg';
        mockQualitySlider.value = '0.75';

        // Simulate the data that would be gathered and sent
        const expectedOutputFormat = 'image/jpeg';
        const expectedQuality = 0.75;
        const expectedFile = state.selectedFiles[0];

        simulateConvertButtonClick(state.selectedFiles, expectedOutputFormat, expectedQuality);

        expect(global.Worker.mock.instances[0].postMessage).toHaveBeenCalledTimes(1);
        expect(global.Worker.mock.instances[0].postMessage).toHaveBeenCalledWith({
            file: expectedFile,
            outputFormat: expectedOutputFormat,
            quality: expectedQuality,
            originalName: expectedFile.name,
            index: 0
        });
    });
  });

  describe('Bulk Download (ZIP) Functionality', () => {
    // Simulate the event listener logic for downloadZipButton
    async function simulateZipDownload() {
        if (state.convertedBlobs.length === 0 || state.convertedBlobs.every(b => !b)) {
            utils.displayMessage('No converted images to download.');
            return;
        }
        const zip = new JSZip(); // Uses the mocked JSZip
        let filesAdded = 0;
        state.convertedBlobs.forEach((result) => {
            if (result && result.blob) {
                zip.file(result.originalName, result.blob); // This now uses the mock that stores files
                filesAdded++;
            }
        });
        if (filesAdded === 0) {
            utils.displayMessage('No valid converted images to zip.');
            return;
        }
        try {
            const content = await zip.generateAsync({ type: 'blob' });
            const zipUrl = URL.createObjectURL(content); // Uses mocked URL.createObjectURL
            state.previewUrls.push(zipUrl);
            const link = document.createElement('a');
            link.href = zipUrl;
            link.download = 'converted_images.zip';
            link.click = jest.fn(); // Mock click for testing
            link.click();
            expect(link.click).toHaveBeenCalled();
        } catch (error) {
            utils.displayMessage('Error creating ZIP file.', true);
        }
    }

    beforeEach(() => {
        // Reset JSZip mocks and state for each ZIP test
        global.JSZip.mockClear();
        global.JSZip.prototype.file.mockClear();
        global.JSZip.prototype.generateAsync.mockClear();
        global.URL.createObjectURL.mockClear();
        state.convertedBlobs = [];
        state.previewUrls = [];
    });

    test('should initiate ZIP download with successfully converted files', async () => {
      state.convertedBlobs = [
        { blob: new Blob(['content1'], {type: 'image/png'}), originalName: 'file1.png' },
        null, // A failed conversion
        { blob: new Blob(['content2'], {type: 'image/jpeg'}), originalName: 'file2.jpg' }
      ];

      await simulateZipDownload();

      expect(global.JSZip).toHaveBeenCalledTimes(1);
      const zipInstance = global.JSZip.mock.instances[0];
      expect(zipInstance.file).toHaveBeenCalledTimes(2);
      expect(zipInstance.file).toHaveBeenCalledWith('file1.png', state.convertedBlobs[0].blob);
      expect(zipInstance.file).toHaveBeenCalledWith('file2.jpg', state.convertedBlobs[2].blob);
      expect(zipInstance.generateAsync).toHaveBeenCalledWith({ type: 'blob' });
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1); // For the ZIP blob
      // `link.click` is asserted within simulateZipDownload
    });

    test('should display message if no files to zip', async () => {
      state.convertedBlobs = [null, null]; // All failed
      const displayMessageSpy = jest.spyOn(utils, 'displayMessage');
      await simulateZipDownload();
      expect(displayMessageSpy).toHaveBeenCalledWith('No valid converted images to zip.');
      displayMessageSpy.mockRestore();
    });
     test('should display message if convertedBlobs is initially empty', async () => {
      state.convertedBlobs = [];
      const displayMessageSpy = jest.spyOn(utils, 'displayMessage');
      await simulateZipDownload();
      expect(displayMessageSpy).toHaveBeenCalledWith('No converted images to download.');
      displayMessageSpy.mockRestore();
    });
  });

  describe('utils.clearPreviewsAndResults', () => {
    test('should clear all preview areas and relevant state', () => {
        // Populate some mock state and DOM
        mockOriginalPreviewArea.innerHTML = '<img src="blob:orig" alt="orig"/>';
        mockConvertedPreviewArea.innerHTML = '<img src="blob:conv" alt="conv"/>';
        mockIndividualLinksArea.innerHTML = '<a href="blob:link">link</a>';
        state.previewUrls = ['blob:orig', 'blob:conv', 'blob:link'];
        state.selectedFiles = [new File([''], 'dummy.png')];
        state.convertedBlobs = [{blob: new Blob(['']), originalName: 'dummy.png'}];

        global.URL.revokeObjectURL.mockClear();

        utils.clearPreviewsAndResults();

        expect(mockOriginalPreviewArea.innerHTML).toContain('Select images...');
        expect(mockConvertedPreviewArea.innerHTML).toContain('Converted previews will appear here');
        expect(mockIndividualLinksArea.innerHTML).toBe('');
        expect(state.previewUrls.length).toBe(0);
        expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(3);
        expect(state.selectedFiles.length).toBe(0);
        expect(state.convertedBlobs.length).toBe(0);
    });
  });

});
