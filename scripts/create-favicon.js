const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createFavicon() {
  const svgPath = path.join(__dirname, '../public/favicon.svg');
  const icoPath = path.join(__dirname, '../public/favicon.ico');
  
  try {
    // Read SVG
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Create ICO with multiple sizes (16x16, 32x32, 48x48)
    // Note: sharp doesn't directly support ICO, so we'll create PNG first
    // and then convert. For now, let's create a high-quality PNG that works as favicon
    
    // Create 32x32 PNG (most common favicon size)
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(icoPath.replace('.ico', '-32.png'));
    
    // Create 16x16 PNG
    await sharp(svgBuffer)
      .resize(16, 16)
      .png()
      .toFile(icoPath.replace('.ico', '-16.png'));
    
    // Create 48x48 PNG
    await sharp(svgBuffer)
      .resize(48, 48)
      .png()
      .toFile(icoPath.replace('.ico', '-48.png'));
    
    // For ICO format, we'll use the 32x32 PNG as the main favicon
    // Most modern browsers accept PNG as favicon
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(icoPath);
    
    console.log('✅ Favicon created successfully!');
    console.log('Created files:');
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

