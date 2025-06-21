// Global state for managing application data
export const state = {
    selectedFiles: [],     // Stores the user-selected image files
    convertedBlobs: [],    // Stores the converted image blobs
    previewUrls: [],       // Stores URLs for previews (needed for cleanup)
    currentPreviewIndex: 0 // Tracks current position in preview navigation
};
