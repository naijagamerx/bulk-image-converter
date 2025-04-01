# Bulk Image Converter

📸 A powerful, browser-based tool for converting images between different formats (PNG, JPEG, WEBP) with batch processing and quality control.

## Description

Bulk Image Converter is a modern, client-side web application that allows users to convert multiple images between different formats simultaneously. It features a clean, responsive interface and handles all conversions locally in the browser, ensuring your images never leave your device.

### Key Features

- ✨ Multiple Format Support:
  - Convert PNG to JPEG/WEBP
  - Convert JPEG to PNG/WEBP
  - Convert WEBP to PNG/JPEG
- 🎛️ Quality Control Settings
- 📦 Batch Processing
- 🏷️ Custom File Renaming Options
- 💾 Individual or Bulk ZIP Downloads
- 📱 Mobile-Friendly Design
- 🔒 Client-Side Processing (100% Private)
- 🖼️ Live Preview

## Technologies Used

- HTML5 Canvas for image processing
- TailwindCSS for styling
- JavaScript (ES6+)
- JSZip for ZIP file creation
- Font Awesome icons

## Installation

1. Clone the repository:
```bash
git clone https://github.com/naijagamerx/bulk-image-converter.git
```

2. Open `index.html` in your web browser

No additional installation or server setup required!

## Usage

1. Select your desired input format (PNG, JPEG, or WEBP)
2. Choose the output format
3. Adjust quality settings (for JPEG/WEBP output)
4. Select one or multiple images to convert
5. (Optional) Set a custom rename pattern
6. Click "Convert Images"
7. Download individually or as a ZIP file

### File Renaming Options

Use these patterns in the rename field:
- `{original}` - Keep original filename
- `{index}` - Add sequential numbering
- `{date}` - Add current date
- `{time}` - Add current time

Example: `vacation_{index}` produces: vacation_001.jpg, vacation_002.jpg, etc.

## Privacy

All image processing is done entirely in your browser. Your images are never uploaded to any server.

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add YourFeature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Created by [naijagamerx](https://github.com/naijagamerx)

## Support

- Star this repository
- Report bugs via Issues
- Suggest features via Pull Requests

## Acknowledgments

- TailwindCSS team for the awesome CSS framework
- JSZip for ZIP file functionality
- Font Awesome for the beautiful icons