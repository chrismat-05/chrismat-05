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

const PALETTES = {
  dark: {
    rule: '#3d444d',
    key: '#ffa657',
    dots: '#484f58',
    number: '#79c0ff',
  },
  light: {
    rule: '#d0d7de',
    key: '#953800',
    dots: '#8c959f',
    number: '#0550ae',
  },
};

const INFO_COLS = 58;
const half = Math.floor((INFO_COLS - 3) / 2); // 27

/**
 * Formats a two-column stat line: "Key1: .... Val1 | Key2: .... Val2"
 */
function formatStatRow(k1, v1, k2, v2, x, y, theme) {
  const c = PALETTES[theme] || PALETTES.dark;
  const part = (key, value) => {
    const valStr = String(value);
    const dotCount = Math.max(2, half - key.length - valStr.length - 6);
    return `<tspan fill="${c.key}">. ${key}: </tspan><tspan fill="${c.dots}">${'.'.repeat(dotCount)}</tspan><tspan fill="${c.number}"> ${valStr}</tspan>`;
  };
  return `  <text x="${x}" y="${y}" font-family="'Consolas', 'Menlo', 'DejaVu Sans Mono', monospace" xml:space="preserve" font-size="16">${part(k1, v1)}<tspan fill="${c.rule}"> | </tspan>${part(k2, v2)}</text>`;
}

/**
 * Calculates current streak and longest streak from GitHub contribution data.
 */
export async function fetchStreaks(handle) {
  try {
    const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${handle}`);
    if (!res.ok) return { currentStreak: 0, longestStreak: 0 };
    const data = await res.json();
    const days = data.contributions || [];
    days.sort((a, b) => new Date(a.date) - new Date(b.date));

    let longestStreak = 0;
    let tempStreak = 0;
    for (const day of days) {
      if (day.count > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].count > 0) {
        currentStreak++;
      } else {
        if (i === days.length - 1 && days[i].date === today) {
          continue; // Today might not have commits yet
        }
        break;
      }
    }
    return { currentStreak, longestStreak };
  } catch (e) {
    console.error('Failed to fetch streak data:', e);
    return { currentStreak: 0, longestStreak: 0 };
  }
}

/**
 * Cleans the gh-ascii SVG by:
 * 1. Removing the "Top repo" line and "Last 12 Months" section
 * 2. Replacing the default GitHub stats (stars, forks) with:
 *    - Left: Repos, Commits, PRs, Issues
 *    - Right: Followers, Contributed, Longest streak, Current streak
 * 3. Balancing the ASCII art height and trimming overall SVG height
 */
function cleanAndBalanceSvg(svgText, streaks, theme) {
  // Extract stats from original SVG
  function extractStat(key) {
    const regex = new RegExp(`\\. ${key}:.*?([\\d,]+)</tspan>`);
    const match = svgText.match(regex);
    return match ? match[1] : '0';
  }

  const repos = extractStat('Repos');
  const followers = extractStat('Followers');
  const commits = extractStat('Commits');
  const contributed = extractStat('Contributed');
  const prs = extractStat('PRs');
  const issues = extractStat('Issues');
  const longestStreak = streaks.longestStreak.toLocaleString();
  const currentStreak = streaks.currentStreak.toLocaleString();

  const lines = svgText.split('\n');
  const filteredLines = [];
  let skipping = false;
  let statLineIndex = 0;

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
        line.includes('#39d353') ||
        line.includes('#2da44e') ||
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

    // Replace the 4 stat lines with Chris's custom layout
    if (
      line.includes('font-size="16"') &&
      (line.includes('Repos') || line.includes('Forks') || line.includes('Commits') || line.includes('PRs'))
    ) {
      const matchX = line.match(/x="([\d\.]+)"/);
      const matchY = line.match(/y="([\d\.]+)"/);
      const x = matchX ? matchX[1] : '266.4';
      const y = matchY ? matchY[1] : '263';

      if (statLineIndex === 0) {
        // Row 1: Repos | Followers
        filteredLines.push(formatStatRow('Repos', repos, 'Followers', followers, x, y, theme));
      } else if (statLineIndex === 1) {
        // Row 2: Commits | Contributed
        filteredLines.push(formatStatRow('Commits', commits, 'Contributed', contributed, x, y, theme));
      } else if (statLineIndex === 2) {
        // Row 3: PRs | Longest streak
        filteredLines.push(formatStatRow('PRs', prs, 'Longest streak', longestStreak, x, y, theme));
      } else if (statLineIndex === 3) {
        // Row 4: Issues | Current streak
        filteredLines.push(formatStatRow('Issues', issues, 'Current streak', currentStreak, x, y, theme));
      }
      statLineIndex++;
      continue;
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

async function fetchTheme(theme, streaks) {
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
  return cleanAndBalanceSvg(rawSvg, streaks, theme);
}

async function main() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });

  console.log(`Fetching streak stats for @${HANDLE}...`);
  const streaks = await fetchStreaks(HANDLE);
  console.log(`Streaks: Longest = ${streaks.longestStreak}, Current = ${streaks.currentStreak}`);

  const [darkSvg, lightSvg] = await Promise.all([
    fetchTheme('dark', streaks),
    fetchTheme('light', streaks),
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
