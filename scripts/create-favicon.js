const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sourceImage = path.join(__dirname, '../public/assets/wizard/wizard_novice.png');
const outputDir = path.join(__dirname, '../public');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function createFavicon() {
  try {
    console.log('Creating favicon files from wizard_novice.png...');
    
    // Read the source image
    const image = sharp(sourceImage);
    const metadata = await image.metadata();
    console.log(`Source image: ${metadata.width}x${metadata.height}`);
    
    // Create favicon.ico (32x32)
    await image
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(outputDir, 'favicon-32.png'));
    console.log('✓ Created favicon-32.png (32x32)');
    
    // Create favicon-16.png (16x16)
    await image
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(outputDir, 'favicon-16.png'));
    console.log('✓ Created favicon-16.png (16x16)');
    
    // Create favicon-48.png (48x48)
    await image
      .resize(48, 48, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(outputDir, 'favicon-48.png'));
    console.log('✓ Created favicon-48.png (48x48)');
    
    // Create favicon.svg (as a simple PNG embedded in SVG for better compatibility)
    const svg32 = await image
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    const base64 = svg32.toString('base64');
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <image href="data:image/png;base64,${base64}" width="32" height="32"/>
</svg>`;
    
    fs.writeFileSync(path.join(outputDir, 'favicon.svg'), svgContent);
    console.log('✓ Created favicon.svg');
    
    // Create favicon.ico (multi-size ICO file - using 32x32 PNG as fallback)
    // Note: Creating a proper ICO file requires additional libraries
    // For now, we'll copy the 32x32 PNG as favicon.ico
    fs.copyFileSync(
      path.join(outputDir, 'favicon-32.png'),
      path.join(outputDir, 'favicon.ico')
    );
    console.log('✓ Created favicon.ico (using 32x32 PNG)');
    
    console.log('\n✅ All favicon files created successfully!');
    console.log('📝 Note: favicon.ico is a PNG file. For a proper ICO file, use an online converter.');
  } catch (error) {
    console.error('❌ Error creating favicon files:', error);
    process.exit(1);
  }
}

createFavicon();
