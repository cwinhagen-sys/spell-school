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
    console.log('Creating circular favicon files from wizard_novice.png...');
    
    // Read the source image
    const image = sharp(sourceImage);
    const metadata = await image.metadata();
    console.log(`Source image: ${metadata.width}x${metadata.height}`);
    
    // Helper function to create circular favicon
    const createCircularFavicon = async (size, filename) => {
      // Create a circular SVG that will be used as a mask
      // The SVG has the image embedded and clipped to a circle
      const radius = size / 2;
      const resizedBuffer = await image
        .clone()
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toBuffer();
      
      const base64 = resizedBuffer.toString('base64');
      
      // Create SVG with circular clip path
      const circularSvg = Buffer.from(`
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <defs>
            <clipPath id="circleClip">
              <circle cx="${radius}" cy="${radius}" r="${radius}"/>
            </clipPath>
          </defs>
          <image href="data:image/png;base64,${base64}" width="${size}" height="${size}" clip-path="url(#circleClip)"/>
        </svg>
      `);
      
      // Convert SVG to PNG
      await sharp(circularSvg)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, filename));
    };
    
    // Create favicon-16.png (16x16) - circular
    await createCircularFavicon(16, 'favicon-16.png');
    console.log('✓ Created favicon-16.png (16x16, circular)');
    
    // Create favicon-32.png (32x32) - circular
    await createCircularFavicon(32, 'favicon-32.png');
    console.log('✓ Created favicon-32.png (32x32, circular)');
    
    // Create favicon-48.png (48x48) - circular
    await createCircularFavicon(48, 'favicon-48.png');
    console.log('✓ Created favicon-48.png (48x48, circular)');
    
    // Create favicon.svg (circular SVG)
    const svg64 = await image
      .clone()
      .resize(64, 64, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toBuffer();
    
    const base64 = svg64.toString('base64');
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <clipPath id="circle">
      <circle cx="32" cy="32" r="32"/>
    </clipPath>
  </defs>
  <image href="data:image/png;base64,${base64}" width="64" height="64" clip-path="url(#circle)"/>
</svg>`;
    
    fs.writeFileSync(path.join(outputDir, 'favicon.svg'), svgContent);
    console.log('✓ Created favicon.svg (circular)');
    
    // Create favicon.ico (using 32x32 circular PNG)
    fs.copyFileSync(
      path.join(outputDir, 'favicon-32.png'),
      path.join(outputDir, 'favicon.ico')
    );
    console.log('✓ Created favicon.ico (using 32x32 circular PNG)');
    
    console.log('\n✅ All circular favicon files created successfully!');
    console.log('📝 Note: favicon.ico is a PNG file. For a proper ICO file, use an online converter.');
  } catch (error) {
    console.error('❌ Error creating favicon files:', error);
    process.exit(1);
  }
}

createFavicon();
