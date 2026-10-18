const { readFile, mkdir } = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

// Export the existing logo into installation sizes without redrawing its artwork.
async function main() {
  const directory = path.resolve(__dirname, '../public/images');
  await mkdir(directory, { recursive: true });
  const logo = await readFile(path.join(directory, 'booran-motors-logo.png'));
  const metadata = await sharp(logo).metadata();
  const dataUrl = `data:image/png;base64,${logo.toString('base64')}`;
  const write = async (filename, width, height = width, fraction = 0.86) => {
    const artworkWidth = width * fraction;
    const artworkHeight = artworkWidth * metadata.height / metadata.width;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#000000"/><image href="${dataUrl}" x="${(width - artworkWidth) / 2}" y="${(height - artworkHeight) / 2}" width="${artworkWidth}" height="${artworkHeight}" preserveAspectRatio="xMidYMid meet"/></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(directory, filename));
  };
  for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) await write(`booran-icon-${size}.png`, size);
  // Keep the complete mark within the maskable icon's circular safe area.
  for (const size of [192, 512]) await write(`booran-maskable-${size}.png`, size, size, 0.70);
  await write('booran-apple-touch-icon.png', 180);
  for (const size of [16, 32]) await write(`booran-favicon-${size}.png`, size);
  await write('booran-splash-screen.png', 1170, 2532, 0.78);
  console.log('Exported Booran PWA, maskable, Apple, favicon and splash assets.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
