/**
 * Exporter TiboFlux
 * Exporte les diagrammes en PNG, PDF, SVG via Puppeteer
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'outputs');

async function ensureOutputDir() {
  try {
    await fs.access(OUTPUT_DIR);
  } catch {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  }
}

async function exportSVG(svg) {
  await ensureOutputDir();

  const filename = `diagram-${Date.now()}.svg`;
  const filepath = path.join(OUTPUT_DIR, filename);

  await fs.writeFile(filepath, svg, 'utf-8');

  return {
    filename,
    filepath,
    url: `/outputs/${filename}`
  };
}

async function exportWithPuppeteer(svg, format) {
  await ensureOutputDir();

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Crée une page HTML avec le SVG
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; }
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              background: white;
            }
            svg {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          ${svg}
        </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Récupère les dimensions du SVG
    const dimensions = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      return {
        width: svg.viewBox.baseVal.width || svg.width.baseVal.value || 800,
        height: svg.viewBox.baseVal.height || svg.height.baseVal.value || 600
      };
    });

    await page.setViewport({
      width: Math.ceil(dimensions.width),
      height: Math.ceil(dimensions.height)
    });

    const filename = `diagram-${Date.now()}.${format}`;
    const filepath = path.join(OUTPUT_DIR, filename);

    if (format === 'png') {
      await page.screenshot({
        path: filepath,
        type: 'png',
        omitBackground: false,
        fullPage: true
      });
    } else if (format === 'pdf') {
      await page.pdf({
        path: filepath,
        width: dimensions.width,
        height: dimensions.height,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });
    }

    return {
      filename,
      filepath,
      url: `/outputs/${filename}`
    };
  } finally {
    await browser.close();
  }
}

async function exportDiagram(svg, format = 'png') {
  switch (format.toLowerCase()) {
    case 'svg':
      return exportSVG(svg);
    case 'png':
    case 'pdf':
      return exportWithPuppeteer(svg, format);
    default:
      throw new Error(`Format non supporté: ${format}. Utilisez svg, png ou pdf.`);
  }
}

module.exports = {
  exportDiagram,
  exportSVG,
  exportWithPuppeteer
};
