const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createFavicon() {
  const logoPath = path.join(__dirname, '../public/assets/spell-school-logo.png');
  const svgPath = path.join(__dirname, '../public/favicon.svg');
  const icoPath = path.join(__dirname, '../public/favicon.ico');
  
  try {
    if (!fs.existsSync(logoPath)) {
      console.error('❌ Logo file not found:', logoPath);
      process.exit(1);
    }
    
    // Read the logo and convert to base64 for inline SVG
    const logoBuffer = fs.readFileSync(logoPath);
    const logoBase64 = logoBuffer.toString('base64');
    const logoMimeType = 'image/png';
    
    // Create SVG favicon with embedded image
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" width="512" height="512">
      <image href="data:${logoMimeType};base64,${logoBase64}" width="512" height="512"/>
    </svg>`;
    fs.writeFileSync(svgPath, svgContent);
    
    // Create ICO and PNG favicons from the logo
    // Create 32x32 favicon.ico
    await sharp(logoBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(icoPath);
    
    // Create 16x16 PNG
    await sharp(logoBuffer)
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(icoPath.replace('.ico', '-16.png'));
    
    // Create 32x32 PNG
    await sharp(logoBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(icoPath.replace('.ico', '-32.png'));
    
    // Create 48x48 PNG
    await sharp(logoBuffer)
      .resize(48, 48, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(icoPath.replace('.ico', '-48.png'));
    
    console.log('✅ Favicon created successfully from Spell School logo!');
    console.log('Created files:');
    console.log('  - favicon.svg (with embedded logo)');
    console.log('  - favicon.ico (32x32 PNG)');
    console.log('  - favicon-16.png');
    console.log('  - favicon-32.png');
    console.log('  - favicon-48.png');
  } catch (error) {
    console.error('❌ Error creating favicon:', error);
    process.exit(1);
  }
}

createFavicon();

