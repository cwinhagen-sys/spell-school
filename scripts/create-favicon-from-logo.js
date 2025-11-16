const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createFavicon() {
  // Use the favicon-correct.png as source
  const logoPath = path.join(__dirname, '../public/assets/favicon-correct.png');
  const svgPath = path.join(__dirname, '../public/favicon.svg');
  const icoPath = path.join(__dirname, '../public/favicon.ico');
  
  try {
    if (!fs.existsSync(logoPath)) {
      console.error('❌ Favicon image not found:', logoPath);
      process.exit(1);
    }
    
    // Read the favicon image and convert to base64 for inline SVG
    const logoBuffer = fs.readFileSync(logoPath);
    const logoBase64 = logoBuffer.toString('base64');
    const logoMimeType = 'image/png';
    
    // Create SVG favicon with embedded image (preserves transparency)
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" width="512" height="512">
      <image href="data:${logoMimeType};base64,${logoBase64}" width="512" height="512" preserveAspectRatio="xMidYMid meet"/>
    </svg>`;
    fs.writeFileSync(svgPath, svgContent);
    
    // Create ICO and PNG favicons from the favicon image with transparent background
    // Ensure we preserve alpha channel for transparency
    
    // Create 32x32 favicon.ico (PNG format with transparency)
    await sharp(logoBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Fully transparent background
      })
      .ensureAlpha() // Ensure alpha channel exists
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(icoPath);
    
    // Create 16x16 PNG with transparent background
    await sharp(logoBuffer)
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Fully transparent background
      })
      .ensureAlpha()
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(icoPath.replace('.ico', '-16.png'));
    
    // Create 32x32 PNG with transparent background
    await sharp(logoBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Fully transparent background
      })
      .ensureAlpha()
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(icoPath.replace('.ico', '-32.png'));
    
    // Create 48x48 PNG with transparent background
    await sharp(logoBuffer)
      .resize(48, 48, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Fully transparent background
      })
      .ensureAlpha()
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(icoPath.replace('.ico', '-48.png'));
    
    console.log('✅ Favicon created successfully from favicon-correct.png with transparent background!');
    console.log('Created files:');
    console.log('  - favicon.svg (with embedded favicon image)');
    console.log('  - favicon.ico (32x32 PNG with transparency)');
    console.log('  - favicon-16.png (with transparency)');
    console.log('  - favicon-32.png (with transparency)');
    console.log('  - favicon-48.png (with transparency)');
  } catch (error) {
    console.error('❌ Error creating favicon:', error);
    process.exit(1);
  }
}

createFavicon();
