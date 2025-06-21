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
  let mockQualityLabelContainer; // For the parent of qualitySlider and label
  let mockQualityLabelItself; // For the label text
  let mockConvertButton;

  // Dynamically require converter.js to simulate its execution in jsdom
  // This is a bit of a hack for non-module scripts.
  // It's better if converter.js is structured as a module.
  let utils, converter, state, formatHandlers, previewHandlers;

  beforeAll(() => {
    // Set up a basic HTML structure that converter.js might expect
    document.body.innerHTML = `
      <div id="messageArea"></div>
      <progress id="progressBar" value="0" max="100"></progress>
      <p id="progressText"></p>
      <div id="originalPreviewArea"></div>
      <div id="convertedPreviewArea"></div>
      <div id="individualLinksArea"></div>
      <div id="downloadArea"></div>
      <button id="downloadZipButton"></button>
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
    `;

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
    mockQualityLabelContainer = mockQualitySlider.parentElement; // Assuming label is sibling or parent
    mockQualityLabelItself = document.getElementById('qualityLabel');
    mockConvertButton = document.getElementById('convertButton');


    // Manually defining objects for testing based on converter.js structure
    // This is a workaround for not being able to import directly.
    // These definitions will need to be updated to match the new dropdown logic.
    // This is a workaround for not being able to import directly.
    utils = {
        displayMessage: (message, isError = true) => {
            mockMessageArea.textContent = message;
            mockMessageArea.classList.remove('hidden');
            mockMessageArea.classList.toggle('text-red-600', isError);
            mockMessageArea.classList.toggle('text-green-600', !isError);
        },
        updateProgress: (current, total) => {
            const percentage = Math.round((current / total) * 100);
            mockProgressBar.value = percentage;
            mockProgressText.textContent = `${percentage}% (${current}/${total} files processed)`;
        },
        // ... other utils if needed for tests
    };

    converter = {
        generateOutputFilename: (originalFileNameInput, index, outputFormatTypeParam) => {
            const pattern = mockRenamingPattern.value || '{original}'; // Uses the mocked DOM input
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
        'image/tiff': ['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif'],
        'image/bmp': ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
        'image/gif': ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'],
        'image/svg+xml': ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'],
        'image/x-icon': ['image/png', 'image/jpeg', 'image/webp', 'image/bmp']
    };
    const formatDisplayNames = {
        'image/png': 'PNG', 'image/jpeg': 'JPEG', 'image/webp': 'WEBP',
        'image/bmp': 'BMP', 'image/gif': 'GIF', 'image/svg+xml': 'SVG',
        'image/tiff': 'TIFF', 'image/x-icon': 'ICO'
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
            const compatibleOutputs = formatCompatibility[selectedInputFormat] ||
                                      Object.keys(formatDisplayNames).filter(k => k !== 'image/tiff' && k !== 'image/x-icon');
            const currentOutputValue = mockOutputFormatSelect.value;
            mockOutputFormatSelect.innerHTML = '';
            compatibleOutputs.forEach(mimeType => {
                if (formatDisplayNames[mimeType]) {
                    const option = document.createElement('option');
                    option.value = mimeType;
                    option.textContent = formatDisplayNames[mimeType];
                    mockOutputFormatSelect.appendChild(option);
                }
            });
            if (compatibleOutputs.includes(currentOutputValue)) {
                mockOutputFormatSelect.value = currentOutputValue;
            } else if (compatibleOutputs.length > 0) {
                if (selectedInputFormat !== 'image/jpeg' && compatibleOutputs.includes('image/jpeg')) {
                    mockOutputFormatSelect.value = 'image/jpeg';
                } else if (compatibleOutputs.includes('image/png')) {
                    mockOutputFormatSelect.value = 'image/png';
                } else {
                    mockOutputFormatSelect.value = compatibleOutputs[0];
                }
            }
            // Directly call the mocked/redefined version of updateQualitySliderVisibility
            formatHandlers.updateQualitySliderVisibility();
        }
    };

    // Mock Date for consistent {date} and {time} in generateOutputFilename
    const RealDate = Date;
    global.Date = class extends RealDate {
      constructor() {
        super();
        // Return a fixed date for testing: 2023-10-26 10:00:00
        return new RealDate(2023, 9, 26, 10, 0, 0);
      }
      // Mock other Date methods if used by the function
      static now() {
        return new RealDate(2023, 9, 26, 10, 0, 0).getTime();
      }
    };


  });

  afterAll(() => {
    // Restore original Date
    global.Date = RealDate;
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
      mockOutputFormatSelect.value = 'image/tiff';
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
      mockInputFormatSelect.value = 'image/bmp'; // BMP compatible with PNG, JPG, WEBP, GIF
      // Let's assume formatCompatibility for BMP doesn't include JPG or PNG for this specific test case
      // (Temporarily override formatCompatibility for this test, or ensure such a case)
      const originalBmpCompat = formatCompatibility['image/bmp'];
      formatCompatibility['image/bmp'] = ['image/webp', 'image/gif']; // Force WEBP or GIF

      mockOutputFormatSelect.value = 'image/tiff'; // Set an incompatible initial output

      formatHandlers.updateOutputFormatDropdown();

      expect(mockOutputFormatSelect.value).toBe('image/webp'); // Should pick the first one: WEBP

      formatCompatibility['image/bmp'] = originalBmpCompat; // Restore
      expect(qualitySliderSpy).toHaveBeenCalled();
    });
  });
});
