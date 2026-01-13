# Image Conversion Tool

A web-based image conversion tool built with Node.js that supports multiple image formats with auto-detection.

## Features

- 🖼️ **Multiple Format Support**: Convert between PNG, JPEG, WebP, AVIF, GIF, and TIFF
- 🔍 **Auto-Detection**: Automatically detects input image format
- 📤 **Easy Upload**: Drag and drop or click to upload
- 👁️ **Live Preview**: See your image before converting
- ⚡ **Fast Conversion**: Powered by Sharp library
- 💾 **Direct Download**: Click to download converted image

## Supported Formats

### Input Formats
- JPEG/JPG
- PNG
- GIF
- WebP
- TIFF
- BMP
- SVG
- HEIC/HEIF
- AVIF

### Output Formats
- JPEG/JPG
- PNG
- WebP
- AVIF
- GIF
- TIFF

## Installation

1. Navigate to the image-conversion directory:
```bash
cd image-conversion
```

2. Install dependencies:
```bash
npm install
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Use the web interface:
   - Click "Choose an image file" or drag and drop an image
   - Select desired output format from dropdown
   - Click "Convert Image"
   - Wait for conversion to complete
   - Click "Download Converted Image"

## How It Works

1. **Upload**: The application accepts image uploads up to 50MB
2. **Auto-Detection**: Sharp library analyzes the image and detects its format
3. **Conversion**: Image is converted to the selected format with optimized settings
4. **Download**: Converted image is sent back to the browser for download

## Technical Details

- **Backend**: Node.js with Express
- **Image Processing**: Sharp library
- **File Upload**: Multer middleware
- **Frontend**: Vanilla JavaScript with modern CSS

## Requirements

- Node.js 14 or higher
- npm or yarn

## License

MIT
