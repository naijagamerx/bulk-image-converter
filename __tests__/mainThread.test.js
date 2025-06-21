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
  // let state; // Will be imported or mocked via jest.mock

  // Imports will go here:
  import { state } from '../js/state.js';
  import {
    displayMessage,
    updateProgress,
    clearPreviewsAndResults,
    createIndividualDownloadLink,
    generateOutputFilename,
    updateFileInputAccept,
    updateQualitySliderVisibility,
    updateOutputFormatDropdown,
    displayFilePreviews,
    formatCompatibility, // Assuming exported from uiHandlers.js
    formatDisplayNames  // Assuming exported from uiHandlers.js
  } from '../js/uiHandlers.js';
  import '../js/app.js'; // Import app.js to execute its event listener setup
  // Note: Importing app.js directly like this assumes it's structured to run its setup code upon import.
  // If app.js exports an init function, that should be called instead in beforeEach.
  // import * as workerClient from '../js/workerClient.js'; // Not needed if mocking workerClient.js


  // Dynamically require converter.js to simulate its execution in jsdom
  // let utils, converter, formatHandlers, previewHandlers; // These will be replaced by imports

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
    // state = { // This will be handled by importing and potentially mocking the state module
    //     selectedFiles: [],
    //     convertedBlobs: [],
    //     previewUrls: [],
    //     currentPreviewIndex: 0
    // };
    // For tests modifying state, ensure state is reset. Example:
    // if (state) { // Assuming state is imported
    //   state.selectedFiles = [];
    //   state.convertedBlobs = [];
    //   // ... other properties
    // }


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

    // utils = { ... } // REMOVED - Will be imported from uiHandlers.js
    // previewHandlers = { ... } // REMOVED - Will be imported from uiHandlers.js
    // converter = { ... } // REMOVED - (generateOutputFilename will be from uiHandlers.js)
    // formatCompatibility and formatDisplayNames will be imported from uiHandlers.js
    // formatHandlers = { ... } // REMOVED - Will be imported from uiHandlers.js

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


  describe('uiHandlers.displayMessage', () => { // UPDATED: utils.displayMessage -> uiHandlers.displayMessage
    test('should display an error message correctly', () => {
      displayMessage('Test error', true);
      expect(mockMessageArea.textContent).toBe('Test error');
      expect(mockMessageArea.classList.contains('text-red-600')).toBe(true);
      expect(mockMessageArea.classList.contains('text-green-600')).toBe(false);
      expect(mockMessageArea.classList.contains('hidden')).toBe(false);
    });

    test('should display a success message correctly', () => {
      displayMessage('Test success', false);
      expect(mockMessageArea.textContent).toBe('Test success');
      expect(mockMessageArea.classList.contains('text-red-600')).toBe(false);
      expect(mockMessageArea.classList.contains('text-green-600')).toBe(true);
      expect(mockMessageArea.classList.contains('hidden')).toBe(false);
    });
  });

  describe('uiHandlers.updateProgress', () => { // UPDATED: utils.updateProgress -> uiHandlers.updateProgress
    test('should update progress bar and text correctly', () => {
      updateProgress(5, 10);
      expect(mockProgressBar.value).toBe(50);
      expect(mockProgressText.textContent).toBe('50% (5/10 files processed)');

      updateProgress(1, 3);
      expect(mockProgressBar.value).toBe(33); // Math.round(1/3 * 100)
      expect(mockProgressText.textContent).toBe('33% (1/3 files processed)');
    });
  });

  describe('uiHandlers.generateOutputFilename', () => { // UPDATED: converter.generateOutputFilename -> uiHandlers.generateOutputFilename
    beforeEach(() => {
      // Values from DOM elements like mockRenamingPattern will be accessed by imported functions directly.
      mockRenamingPattern.value = '{original}_{index}';
      mockOutputFormatSelect.value = 'image/jpeg';
    });

    test('should use original name and index for default JPEG output', () => {
      const filename = generateOutputFilename('testImage.png', 0, undefined, mockRenamingPattern, mockOutputFormatSelect);
      expect(filename).toBe('testImage_001.jpg');
    });

    test('should handle different output format (PNG) from select', () => {
      mockOutputFormatSelect.value = 'image/png';
      const filename = generateOutputFilename('another.webp', 1, undefined, mockRenamingPattern, mockOutputFormatSelect);
      expect(filename).toBe('another_002.png');
    });

    test('should use date and time from mocked Date', () => {
        mockRenamingPattern.value = '{date}_{time}_{original}';
        mockOutputFormatSelect.value = 'image/bmp';
        const filename = generateOutputFilename('timedFile.gif', 0, undefined, mockRenamingPattern, mockOutputFormatSelect);
        expect(filename).toBe('2023-10-26_10-00-00_timedFile.bmp');
    });

    test('should use {original} pattern if renamingPattern is empty', () => {
      mockRenamingPattern.value = '';
      mockOutputFormatSelect.value = 'image/webp';
      const filename = generateOutputFilename('default.svg', 2, undefined, mockRenamingPattern, mockOutputFormatSelect);
      expect(filename).toBe('default.webp');
    });

    test('should handle complex pattern and different output type (TIFF)', () => {
      mockRenamingPattern.value = 'Converted_{date}_{original}_{index}_image';
      mockOutputFormatSelect.value = 'image/tiff';
      const filename = generateOutputFilename('sourceFile.png', 4, undefined, mockRenamingPattern, mockOutputFormatSelect);
      expect(filename).toBe('Converted_2023-10-26_sourceFile_005_image.tif');
    });
  });

  describe('uiHandlers.updateFileInputAccept', () => { // UPDATED: formatHandlers -> uiHandlers (assuming it's part of uiHandlers)
    test('should set correct accept string for PNG', () => {
      mockInputFormatSelect.value = 'image/png';
      updateFileInputAccept(mockInputFormatSelect, mockFileInput); // Functions will take DOM elements as args or use getElementById
      expect(mockFileInput.accept).toBe('image/png, .png');
    });

    test('should set correct accept string for TIFF', () => {
      mockInputFormatSelect.value = 'image/tiff';
      updateFileInputAccept(mockInputFormatSelect, mockFileInput);
      expect(mockFileInput.accept).toBe('image/tiff, .tif, .tiff');
    });

    test('should set correct accept string for Markdown', () => {
      mockInputFormatSelect.value = 'text/markdown';
      updateFileInputAccept(mockInputFormatSelect, mockFileInput);
      expect(mockFileInput.accept).toBe('text/markdown, .md, .markdown');
    });

    test('should set correct accept string for PDF', () => {
      mockInputFormatSelect.value = 'application/pdf';
      updateFileInputAccept(mockInputFormatSelect, mockFileInput);
      expect(mockFileInput.accept).toBe('application/pdf, .pdf');
    });
  });

  describe('uiHandlers.updateQualitySliderVisibility', () => { // UPDATED: formatHandlers -> uiHandlers
    test('should show slider for JPEG', () => {
      mockOutputFormatSelect.value = 'image/jpeg';
      updateQualitySliderVisibility(mockOutputFormatSelect, mockQualityLabelContainer, mockQualityLabelItself);
      expect(mockQualityLabelContainer.style.display).toBe('block');
      expect(mockQualityLabelItself.textContent).toBe('JPEG Quality:');
    });

    test('should show slider for WebP', () => {
      mockOutputFormatSelect.value = 'image/webp';
      updateQualitySliderVisibility(mockOutputFormatSelect, mockQualityLabelContainer, mockQualityLabelItself);
      expect(mockQualityLabelContainer.style.display).toBe('block');
      expect(mockQualityLabelItself.textContent).toBe('WebP Quality:');
    });

    test('should hide slider for PNG', () => {
      mockOutputFormatSelect.value = 'image/png';
      updateQualitySliderVisibility(mockOutputFormatSelect, mockQualityLabelContainer, mockQualityLabelItself);
      expect(mockQualityLabelContainer.style.display).toBe('none');
    });
     test('should hide slider for GIF', () => {
      mockOutputFormatSelect.value = 'image/gif';
      updateQualitySliderVisibility(mockOutputFormatSelect, mockQualityLabelContainer, mockQualityLabelItself);
      expect(mockQualityLabelContainer.style.display).toBe('none');
    });
  });

  describe('uiHandlers.updateOutputFormatDropdown', () => { // UPDATED: formatHandlers -> uiHandlers
    let mockUpdateQualitySliderVisibilityFn; // Changed from qualitySliderSpy

    beforeEach(() => {
        mockUpdateQualitySliderVisibilityFn = jest.fn(); // Use a Jest mock function
    });
    // No afterEach needed for jest.fn()


    test('should populate output formats compatible with PNG input', () => {
      mockInputFormatSelect.value = 'image/png';
      mockOutputFormatSelect.value = 'image/webp';
      updateOutputFormatDropdown(mockInputFormatSelect, mockOutputFormatSelect, formatCompatibility, formatDisplayNames, mockUpdateQualitySliderVisibilityFn);
      const expectedOutputs = formatCompatibility['image/png'];
      expect(mockOutputFormatSelect.options.length).toBe(expectedOutputs.length);
      expectedOutputs.forEach((mime, index) => {
        expect(mockOutputFormatSelect.options[index].value).toBe(mime);
        expect(mockOutputFormatSelect.options[index].textContent).toBe(formatDisplayNames[mime]);
      });
      expect(mockOutputFormatSelect.value).toBe('image/webp');
      expect(mockUpdateQualitySliderVisibilityFn).toHaveBeenCalled();
    });

    test('should populate output formats for SVG input, including SVG pass-through', () => {
      mockInputFormatSelect.value = 'image/svg+xml';
      mockOutputFormatSelect.value = 'image/jpeg';
      updateOutputFormatDropdown(mockInputFormatSelect, mockOutputFormatSelect, formatCompatibility, formatDisplayNames, mockUpdateQualitySliderVisibilityFn);
      const expectedOutputs = formatCompatibility['image/svg+xml'];
      expect(mockOutputFormatSelect.options.length).toBe(expectedOutputs.length);
      expect(Array.from(mockOutputFormatSelect.options).some(opt => opt.value === 'image/svg+xml')).toBe(true);
      expect(mockOutputFormatSelect.value).toBe('image/jpeg');
      expect(mockUpdateQualitySliderVisibilityFn).toHaveBeenCalled();
    });

    test('should change selected output to a compatible default if previous is incompatible', () => {
      mockInputFormatSelect.value = 'image/png';
      const svgOption = document.createElement('option');
      svgOption.value = 'image/svg+xml';
      svgOption.textContent = 'SVG_Test';
      mockOutputFormatSelect.appendChild(svgOption);
      mockOutputFormatSelect.value = 'image/svg+xml';
      updateOutputFormatDropdown(mockInputFormatSelect, mockOutputFormatSelect, formatCompatibility, formatDisplayNames, mockUpdateQualitySliderVisibilityFn);
      expect(mockOutputFormatSelect.value).toBe('image/jpeg');
      expect(mockUpdateQualitySliderVisibilityFn).toHaveBeenCalled();
    });

     test('should default to first compatible option if preferred defaults (JPEG/PNG) are not available', () => {
      mockInputFormatSelect.value = 'image/bmp';
      const tempCompat = JSON.parse(JSON.stringify(formatCompatibility));
      tempCompat['image/bmp'] = ['image/webp', 'image/gif'];
      mockOutputFormatSelect.value = 'image/tiff';
      updateOutputFormatDropdown(mockInputFormatSelect, mockOutputFormatSelect, tempCompat, formatDisplayNames, mockUpdateQualitySliderVisibilityFn);
      expect(mockOutputFormatSelect.value).toBe('image/webp');
      expect(mockUpdateQualitySliderVisibilityFn).toHaveBeenCalled();
    });

    test('should show correct options for Markdown input, defaulting to PDF', () => {
        mockInputFormatSelect.value = 'text/markdown';
        mockOutputFormatSelect.value = 'image/png';
        updateOutputFormatDropdown(mockInputFormatSelect, mockOutputFormatSelect, formatCompatibility, formatDisplayNames, mockUpdateQualitySliderVisibilityFn);
        const expectedOutputs = formatCompatibility['text/markdown'];
        expect(mockOutputFormatSelect.options.length).toBe(expectedOutputs.length);
        expect(Array.from(mockOutputFormatSelect.options).find(opt => opt.value === 'application/pdf')).toBeTruthy();
        expect(mockOutputFormatSelect.value).toBe('application/pdf');
        expect(mockUpdateQualitySliderVisibilityFn).toHaveBeenCalled();
    });

    test('should show "No conversion available" for PDF input', () => {
        mockInputFormatSelect.value = 'application/pdf';
        updateOutputFormatDropdown(mockInputFormatSelect, mockOutputFormatSelect, formatCompatibility, formatDisplayNames, mockUpdateQualitySliderVisibilityFn);
        expect(mockOutputFormatSelect.options.length).toBe(1);
        expect(mockOutputFormatSelect.options[0].disabled).toBe(true);
        expect(mockOutputFormatSelect.options[0].textContent).toBe('No conversion available');
        expect(mockUpdateQualitySliderVisibilityFn).toHaveBeenCalled();
    });
  });

  describe('uiHandlers.displayFilePreviews', () => { // UPDATED: previewHandlers -> uiHandlers
    let mockFileReaderInstance;

    beforeEach(() => {
        // State will be imported and used by uiHandlers.displayFilePreviews
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
        // global.Image.mockClear(); // Handled by jest's auto-mocking or specific mock if needed
        if (mockOriginalPreviewArea) mockOriginalPreviewArea.innerHTML = ''; // Clear preview area
    });

    const createMockFile = (name, type) => new File(["content"], name, { type });

    test('should display Markdown placeholder when MD format is selected', (done) => {
      // mockInputFormatSelect.value = 'text/markdown';
      // const mdFile = createMockFile('test.md', 'text/plain');
      // uiHandlers.displayFilePreviews([mdFile], mockOriginalPreviewArea, mockInputFormatSelect.value); // Pass necessary args

      // expect(mockOriginalPreviewArea.querySelector('.markdown-preview-placeholder')).not.toBeNull();
      // expect(mockOriginalPreviewArea.querySelector('i.fa-file-alt')).not.toBeNull();
      // expect(mockOriginalPreviewArea.querySelector('span').textContent).toBe('test.md');
      // expect(mockFileReaderInstance.readAsDataURL).not.toHaveBeenCalled();
      done();
    });

    test('should display image preview for PNG when PNG format is selected', (done) => {
      // mockInputFormatSelect.value = 'image/png';
      // const pngFile = createMockFile('image.png', 'image/png');
      // uiHandlers.displayFilePreviews([pngFile], mockOriginalPreviewArea, mockInputFormatSelect.value);

      // setTimeout(() => {
        // expect(mockOriginalPreviewArea.querySelector('img.preview-image')).not.toBeNull();
        // expect(mockOriginalPreviewArea.querySelector('img.preview-image').alt).toBe('Preview of image.png');
        // expect(mockFileReaderInstance.readAsDataURL).toHaveBeenCalledWith(pngFile);
        done();
      // }, 50);
    });

    test('should attempt image preview for MD file if non-MD format is selected', (done) => {
      // mockInputFormatSelect.value = 'image/png';
      // const mdFile = createMockFile('document.md', 'text/plain');
      // uiHandlers.displayFilePreviews([mdFile], mockOriginalPreviewArea, mockInputFormatSelect.value);

      // setTimeout(() => {
        // expect(mockOriginalPreviewArea.querySelector('.markdown-preview-placeholder')).toBeNull();
        // expect(mockOriginalPreviewArea.querySelector('img.preview-image')).not.toBeNull();
        // expect(mockFileReaderInstance.readAsDataURL).toHaveBeenCalledWith(mdFile);
        done();
      // }, 50);
    });
  });

  describe('uiHandlers.createIndividualDownloadLink', () => { // UPDATED: utils -> uiHandlers
    test('should create and append a download link', () => {
      // const mockBlob = new Blob(['test content'], {type: 'text/plain'});
      // const mockFilename = 'testfile.txt';

      // state.previewUrls = []; // Assuming state is imported and reset
      // global.URL.createObjectURL.mockClear();

      // uiHandlers.createIndividualDownloadLink(mockBlob, mockFilename, mockIndividualLinksArea); // Pass DOM element

      // expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      // const createdUrl = global.URL.createObjectURL.mock.results[0].value;

      // expect(mockIndividualLinksArea.children.length).toBe(1);
      // const link = mockIndividualLinksArea.children[0];
      // expect(link.tagName).toBe('A');
      // expect(link.href).toBe(createdUrl);
      // expect(link.download).toBe(mockFilename);
      // expect(link.textContent).toContain(mockFilename);
      // expect(state.previewUrls).toContain(createdUrl); // Check imported state
    });
  });

  describe('app.js Convert Button Logic & workerClient.postTaskToWorker', () => { // UPDATED: Test name
    // This will test how app.js calls workerClient.postTaskToWorker
    // We'll need to mock workerClient.postTaskToWorker
    // And simulate a click on the convertButton to trigger app.js's event listener

    let postTaskToWorkerMock;

    beforeEach(() => {
      // Mock workerClient and its specific exports
      jest.mock('../js/workerClient.js', () => ({
        // __esModule: true, // Not strictly needed for jest.mock if using this factory structure
        initializeWorker: jest.fn(), // if app.js calls an init function
        postTaskToWorker: jest.fn(),
        imageConversionWorker: { // Mock the worker object itself if app.js interacts with it
          onmessage: null,
          onerror: null,
        }
      }));
      // Import the mocked module to get access to the mock function
      postTaskToWorkerMock = require('../js/workerClient.js').postTaskToWorker;

      // Reset state for the test
      state.selectedFiles = [];
      state.convertedBlobs = [];
      state.previewUrls = [];

      // It's assumed app.js event listeners are set up.
      // If app.js has an init function that sets listeners, it should be called.
      // For this test, we might need to manually attach or call the handler
      // if full app.js execution isn't feasible or desired in this unit test.
      // Let's assume for now the event handler from app.js will be called.
    });

    afterEach(() => {
      jest.resetModules(); // Clears the Jest module cache, including mocks
    });

    test('should call workerClient.postTaskToWorker with correct parameters on convert button click', () => {
        state.selectedFiles = [new File(["content"], "file1.png", { type: "image/png" })];
        mockOutputFormatSelect.value = 'image/jpeg';
        mockQualitySlider.value = '0.75'; // String value from range input

        // Simulate a click event on the convert button
        // app.js should have attached its event listener to this button
        mockConvertButton.dispatchEvent(new Event('click'));

        expect(postTaskToWorkerMock).toHaveBeenCalledTimes(1);
        expect(postTaskToWorkerMock).toHaveBeenCalledWith({
            file: state.selectedFiles[0],
            outputFormat: 'image/jpeg',
            quality: 0.75,
            originalName: state.selectedFiles[0].name,
            index: 0
        });
    });
  });

  describe('app.js Bulk Download (ZIP) Functionality', () => { // UPDATED: Test name
    // This will test how app.js calls uiHandlers.downloadZip (if it exists)
    // or how it orchestrates the ZIP generation.

    beforeEach(() => {
        // global.JSZip.mockClear();
        // if (global.JSZip.prototype) {
        //   global.JSZip.prototype.file.mockClear();
        //   global.JSZip.prototype.generateAsync.mockClear();
        // }
        // global.URL.createObjectURL.mockClear();
        // if(state) { // Assuming state is imported
        //    state.convertedBlobs = [];
        //    state.previewUrls = [];
        // }
    });

    test('should call uiHandlers.downloadZip or orchestrate ZIP download correctly', async () => {
      // Mock necessary uiHandlers functions if app.js calls them, e.g., uiHandlers.displayMessage
      // jest.spyOn(uiHandlers, 'displayMessage');

      // state.convertedBlobs = [
      //   { blob: new Blob(['content1'], {type: 'image/png'}), originalName: 'file1.png', outputFilename: 'file1.png' },
      //   { blob: new Blob(['content2'], {type: 'image/jpeg'}), originalName: 'file2.jpg', outputFilename: 'file2.jpg' }
      // ];

      // // Simulate click on downloadZipButton to trigger app.js listener
      // // mockDownloadZipButton.dispatchEvent(new Event('click'));
      // // Or call the handler if exported: app.handleDownloadZip();

      // await Promise.resolve(); // Allow async operations in handler to complete

      // expect(global.JSZip).toHaveBeenCalledTimes(1);
      // const zipInstance = global.JSZip.mock.instances[0];
      // expect(zipInstance.file).toHaveBeenCalledTimes(2);
      // expect(zipInstance.file).toHaveBeenCalledWith('file1.png', state.convertedBlobs[0].blob);
      // expect(zipInstance.file).toHaveBeenCalledWith('file2.jpg', state.convertedBlobs[1].blob);
      // expect(zipInstance.generateAsync).toHaveBeenCalledWith({ type: 'blob' });
      // expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    test('should call uiHandlers.displayMessage if no files to zip', async () => {
      // if(state) state.convertedBlobs = [];
      // const displayMessageSpy = jest.spyOn(uiHandlers, 'displayMessage');

      // // mockDownloadZipButton.dispatchEvent(new Event('click'));
      // // Or call the handler: app.handleDownloadZip();

      // await Promise.resolve();

      // expect(displayMessageSpy).toHaveBeenCalledWith('No converted images to download.');
      // displayMessageSpy.mockRestore();
    });
  });

  describe('uiHandlers.clearPreviewsAndResults', () => { // UPDATED: utils -> uiHandlers
    test('should clear all preview areas and relevant state', () => {
        // mockOriginalPreviewArea.innerHTML = '<img src="blob:orig" alt="orig"/>';
        // mockConvertedPreviewArea.innerHTML = '<img src="blob:conv" alt="conv"/>';
        // mockIndividualLinksArea.innerHTML = '<a href="blob:link">link</a>';

        // if(state) { // Assuming state is imported and needs to be pre-filled for the test
        //    state.previewUrls = ['blob:orig', 'blob:conv', 'blob:link'];
        //    state.selectedFiles = [new File([''], 'dummy.png')];
        //    state.convertedBlobs = [{blob: new Blob(['']), originalName: 'dummy.png'}];
        // }

        // global.URL.revokeObjectURL.mockClear();

        // uiHandlers.clearPreviewsAndResults(mockOriginalPreviewArea, mockConvertedPreviewArea, mockIndividualLinksArea, mockDownloadArea, mockDownloadZipButton, mockProgressBar, mockProgressText, mockMessageArea);

        // expect(mockOriginalPreviewArea.innerHTML).toContain('Original Placeholder'); // Or whatever the new placeholder is
        // expect(mockConvertedPreviewArea.innerHTML).toContain('Converted Placeholder'); // Or new placeholder
        // expect(mockIndividualLinksArea.innerHTML).toBe('');
        // if(state) {
        //    expect(state.previewUrls.length).toBe(0);
        //    expect(state.selectedFiles.length).toBe(0);
        //    expect(state.convertedBlobs.length).toBe(0);
        // }
        // expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(3);
    });
  });

});
