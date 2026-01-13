const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|tiff|bmp|svg|heic|heif|avif/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  }
});

// Serve static files
app.use(express.static('public'));

// Auto-detect image format
async function detectImageFormat(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return metadata.format;
  } catch (error) {
    throw new Error('Unable to detect image format');
  }
}

// Convert image endpoint
app.post('/convert', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const outputFormat = req.body.outputFormat || 'png';
    const imageBuffer = req.file.buffer;

    // Detect input format
    const inputFormat = await detectImageFormat(imageBuffer);
    console.log(`Converting ${inputFormat} to ${outputFormat}`);

    // Convert image
    let sharpInstance = sharp(imageBuffer);

    // Apply format-specific options
    switch (outputFormat.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        sharpInstance = sharpInstance.jpeg({ quality: 90 });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ compressionLevel: 9 });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality: 90 });
        break;
      case 'avif':
        sharpInstance = sharpInstance.avif({ quality: 80 });
        break;
      case 'tiff':
        sharpInstance = sharpInstance.tiff({ compression: 'lzw' });
        break;
      case 'gif':
        sharpInstance = sharpInstance.gif();
        break;
      case 'bmp':
        // Sharp doesn't support BMP output directly, convert to PNG first
        return res.status(400).json({ error: 'BMP output format not supported. Try PNG, JPEG, WEBP, or AVIF.' });
      default:
        sharpInstance = sharpInstance.toFormat(outputFormat);
    }

    const convertedBuffer = await sharpInstance.toBuffer();

    // Set appropriate headers
    const filename = `converted-${Date.now()}.${outputFormat}`;
    res.set({
      'Content-Type': `image/${outputFormat}`,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': convertedBuffer.length
    });

    res.send(convertedBuffer);

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: error.message || 'Image conversion failed' });
  }
});

// Get supported formats
app.get('/formats', (req, res) => {
  res.json({
    input: ['jpeg', 'jpg', 'png', 'gif', 'webp', 'tiff', 'bmp', 'svg', 'heic', 'heif', 'avif'],
    output: ['jpeg', 'jpg', 'png', 'webp', 'avif', 'tiff', 'gif']
  });
});

app.listen(PORT, () => {
  console.log(`Image Conversion Server running at http://localhost:${PORT}`);
  console.log('Open your browser and navigate to the URL above');
});
