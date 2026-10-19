import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');

const HANDLE = process.env.HANDLE || 'chrismat-05';
const GH_ASCII_URL = process.env.GH_ASCII_URL || 'https://gh.crafter.run';
// 70 columns gives ~30 ASCII rows, perfectly matching the 13 info rows in height
const COLS = process.env.COLS || '70';

/**
 * Cleans the gh-ascii SVG by:
 * 1. Removing the "Top repo" line
 * 2. Removing the "Last 12 Months" contribution graph & sparkline row
 * 3. Re-aligning the left ASCII art so its height and top baseline
 *    perfectly match the right-side info block in equal balance.
 * 4. Trimming the overall SVG height and viewBox to eliminate empty space.
 */
function cleanAndBalanceSvg(svgText) {
  const lines = svgText.split('\n');
  const filteredLines = [];
  let skipping = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Remove the "Top repo" line
    if (line.includes('Top repo')) {
      continue;
    }

    // Detect start of Last 12 Months section
    if (line.includes('Last 12 Months')) {
      skipping = true;
      continue;
    }

    if (skipping) {
      if (
        line.includes('Contributions') ||
        line.includes('Reviews') ||
        line.includes('Private') ||
        line.includes('#39d353') || // dark mode sparkline color
        line.includes('#2da44e') || // light mode sparkline color
        /[ ▁▂▃▄▅▆▇█]{10,}/.test(line)
      ) {
        continue;
      }
      if (line.includes('</svg>')) {
        skipping = false;
        filteredLines.push(line);
        continue;
      }
    }

    filteredLines.push(line);
  }

  // Find min/max Y for info lines and ASCII art lines
  let minInfoY = Infinity;
  let maxInfoY = -Infinity;
  let minAsciiY = Infinity;
  let maxAsciiY = -Infinity;

  for (const line of filteredLines) {
    if (line.includes('font-size="8"')) {
      const match = line.match(/y="([\d\.]+)"/);
      if (match) {
        const y = parseFloat(match[1]);
        minAsciiY = Math.min(minAsciiY, y);
        maxAsciiY = Math.max(maxAsciiY, y);
      }
    } else if (line.includes('font-size="16"')) {
      const match = line.match(/y="([\d\.]+)"/);
      if (match) {
        const y = parseFloat(match[1]);
        minInfoY = Math.min(minInfoY, y);
        maxInfoY = Math.max(maxInfoY, y);
      }
    }
  }

  // Calculate vertical shift so the top of ASCII art aligns with the top of info block
  const targetAsciiTop = minInfoY - 5;
  const shift = (minAsciiY !== Infinity && minInfoY !== Infinity) ? (minAsciiY - targetAsciiTop) : 0;

  const balancedLines = filteredLines.map((line) => {
    if (shift !== 0 && line.includes('font-size="8"')) {
      return line.replace(/y="([\d\.]+)"/, (_, y) => `y="${(parseFloat(y) - shift).toFixed(1)}"`);
    }
    return line;
  });

  // Calculate new total height
  const effectiveAsciiMaxY = maxAsciiY !== -Infinity ? (maxAsciiY - shift) : maxInfoY;
  const newMaxY = Math.max(maxInfoY, effectiveAsciiMaxY);
  const padBottom = 28;
  const newHeight = Math.round(newMaxY + padBottom);

  // Update root svg and rect height
  const result = balancedLines.map((line) => {
    if (line.startsWith('<svg')) {
      return line
        .replace(/height="\d+"/, `height="${newHeight}"`)
        .replace(/viewBox="0 0 (\d+) \d+"/, `viewBox="0 0 $1 ${newHeight}"`);
    }
    if (line.includes('<rect') && line.includes('rx="8"')) {
      return line.replace(/height="\d+(\.\d+)?"/, `height="${newHeight - 1}"`);
    }
    return line;
  }).join('\n');

  return result;
}

async function fetchTheme(theme) {
  const url = `${GH_ASCII_URL}/${HANDLE}?theme=${theme}&cols=${COLS}`;
  console.log(`Fetching ${theme} card from: ${url}`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'chrismat-05-profile-generator',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${theme} card: ${res.status} ${res.statusText}`);
  }

  const rawSvg = await res.text();
  return cleanAndBalanceSvg(rawSvg);
}

async function main() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });

  const [darkSvg, lightSvg] = await Promise.all([
    fetchTheme('dark'),
    fetchTheme('light'),
  ]);

  const darkPath = path.join(ASSETS_DIR, 'dark_mode.svg');
  const lightPath = path.join(ASSETS_DIR, 'light_mode.svg');

  await fs.writeFile(darkPath, darkSvg, 'utf-8');
  await fs.writeFile(lightPath, lightSvg, 'utf-8');

  console.log(`Saved balanced SVG: ${darkPath}`);
  console.log(`Saved balanced SVG: ${lightPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
