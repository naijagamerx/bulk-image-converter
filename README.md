# Bulk Image Converter Pro

📸 A powerful, browser-based tool for converting images between different formats (PNG, JPEG, WEBP) with batch processing and quality control.

![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Overview

Bulk Image Converter Pro is a modern, client-side web application that allows users to convert multiple images between different formats simultaneously. It features a clean, responsive interface and handles all conversions locally in the browser, ensuring your images never leave your device - perfect for users concerned about privacy and data security.

### Key Features

- ✨ **Multiple Format Support**:
  - Convert PNG to JPEG/WEBP
  - Convert JPEG to PNG/WEBP
  - Convert WEBP to PNG/JPEG
- 🎛️ **Advanced Quality Control Settings**
- 📦 **Fast Batch Processing**
- 🏷️ **Custom File Renaming Options**
- 💾 **Individual or Bulk ZIP Downloads**
- 📱 **Fully Responsive Design** (works on mobile, tablet, desktop)
- 🌓 **Light and Dark Themes**
- 🔒 **100% Client-Side Processing** (no data ever leaves your device)
- 🖼️ **Live Preview with Full-Screen Option**
- 🚀 **No Installation Required** - runs in any modern browser

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 100+ | ✅ Full support |
| Firefox | 95+ | ✅ Full support |
| Edge | 100+ | ✅ Full support |
| Safari | 15+ | ✅ Full support |
| Opera | 85+ | ✅ Full support |
| IE | 11 and below | ❌ Not supported |

## Technologies Used

- **HTML5 Canvas API** for image processing
- **TailwindCSS** for modern, responsive styling
- **JavaScript (ES6+)** for clean, efficient coding
- **JSZip** library for ZIP file creation
- **Font Awesome** for scalable vector icons
- **LocalStorage API** for preference persistence

## Installation

### Option 1: Simple Setup
1. Download the latest release
2. Extract the files to your web server directory
3. Open the index.html file in your browser

### Option 2: For Developers
1. Clone the repository:
```bash
git clone https://github.com/naijagamerx/bulk-image-converter.git
```
2. Navigate to the project directory:
```bash
cd bulk-image-converter
```
3. Open `index.html` in your preferred browser

**No server-side processing or complex setup required!**

## Usage Guide

### Basic Usage
1. Select your desired input format (PNG, JPEG, or WEBP)
2. Choose the output format
3. Adjust quality settings (for JPEG/WEBP output)
4. Select one or multiple images to convert
5. (Optional) Set a custom rename pattern
6. Click "Convert Images"
7. Download individually or as a ZIP file

### Advanced File Renaming System

Use these patterns in the rename field to customize your output filenames:
- `{original}` - Keep original filename
- `{index}` - Add sequential numbering (automatically padded with zeros)
- `{date}` - Add current date in YYYY-MM-DD format
- `{time}` - Add current time in HH-MM-SS format

Example patterns:
- `{original}_converted` → vacation.jpg becomes vacation_converted.webp
- `image_{index}` → produces image_001.jpg, image_002.jpg, etc.
- `{date}_{original}` → produces 2025-04-01_vacation.png
- `{original}_{date}_{time}` → vacation_2025-04-01_14-30-45.webp

### Keyboard Shortcuts

| Shortcut | Function |
|----------|----------|
| Escape | Close fullscreen preview |
| Left Arrow | Previous image in fullscreen mode |
| Right Arrow | Next image in fullscreen mode |

## Privacy & Security Features

All image processing is performed entirely within your browser:
- ✅ No server-side processing
- ✅ No image uploads to remote servers
- ✅ No tracking or analytics
- ✅ Works offline after initial page load
- ✅ All temporary data cleared when page is closed

## For Developers

### Project Structure
```
bulk-image-converter/
├── css/
│   └── styles.css         # Main stylesheet (with TailwindCSS)
├── js/
│   └── converter.js       # Core application logic
├── favicon/
│   └── manifest.json      # PWA manifest file
├── index.html             # Main application HTML
├── LICENSE                # MIT License
└── README.md              # This documentation
```

### Adding New Features
The codebase is well-organized and extensively commented to make extensions easy:
- Image handling is in the `converter` object
- UI components are modular and isolated
- Theme handling is managed through the `themeHandlers` object

## Troubleshooting

### Common Issues and Solutions

**Q: Why are my converted PNG files larger than the original JPEGs?**
A: PNG is a lossless format, while JPEG is lossy. Converting from JPEG to PNG preserves all visible detail but removes compression, resulting in larger files.

**Q: Can I use this tool offline?**
A: Yes! After loading the page once, all processing happens in your browser. No internet connection is required for conversions.

**Q: My browser crashes when converting many large images at once**
A: Browsers have memory limitations. Try converting fewer images at a time or reduce the image resolution before uploading.

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add YourFeature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

Please ensure your code adheres to the existing style guidelines and includes appropriate comments.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Created by [naijagamerx](https://github.com/naijagamerx)

## Support

- Star this repository
- Report bugs via Issues
- Suggest features via Pull Requests
- Share with others who might find it useful

## Changelog

### v1.2.0 (Current)
- Added dark/light theme toggle
- Improved mobile responsiveness
- Added fullscreen preview mode
- Enhanced error handling and user feedback

### v1.1.0
- Added WebP format support
- Implemented custom file renaming
- Added individual file downloads
- Improved preview grid layout

### v1.0.0
- Initial release with PNG and JPEG support
- Basic conversion functionality
- ZIP download option

## Acknowledgments

- TailwindCSS team for the awesome CSS framework
- JSZip for ZIP file functionality
- Font Awesome for the beautiful icons
- All contributors and testers who helped improve this tool