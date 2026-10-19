import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');

const HANDLE = process.env.HANDLE || 'chrismat-05';
const GH_ASCII_URL = process.env.GH_ASCII_URL || 'https://gh.crafter.run';
const COLS = process.env.COLS || '100';

/**
 * Strips the "Last 12 Months" contribution graph and sparkline row
 * from the gh-ascii SVG so Skyline can serve as the sole contribution graph.
 */
function stripContributionGraph(svgText) {
  const lines = svgText.split('\n');
  const filtered = [];
  let skipping = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect start of Last 12 Months section
    if (line.includes('Last 12 Months')) {
      skipping = true;
      continue;
    }

    if (skipping) {
      // Check if this line is part of the Last 12 Months block
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
      // If closing svg tag reached, stop skipping
      if (line.includes('</svg>')) {
        skipping = false;
        filtered.push(line);
        continue;
      }
    }

    filtered.push(line);
  }

  return filtered.join('\n');
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
  return stripContributionGraph(rawSvg);
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

  console.log(`Saved: ${darkPath}`);
  console.log(`Saved: ${lightPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
