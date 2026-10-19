import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');

export const THEMES = {
  neon: {
    name: 'neon', sky: '#15131c', star: '#5e5878', starHot: '#b8b2d6',
    roof: '#ff3ea5', antenna: '#2de2e6', street: '#ff3ea5', label: '#8b85a3', text: '#f1eefa',
    shades: ['#1f1b2b', '#26213a'],
    windows: ['#3b3550', '#8a3b7a', '#ff3ea5', '#2de2e6', '#f4f1ff'],
  },
  synthwave: {
    name: 'synthwave', sky: '#1a1330', star: '#6f5f9a', starHot: '#d9ccf5',
    roof: '#ff7edb', antenna: '#fede5d', street: '#f97e72', label: '#8d7fb3', text: '#f4eefe',
    shades: ['#241a3f', '#2b1f4a'],
    windows: ['#3d2d5c', '#6b4a9e', '#ff7edb', '#fede5d', '#fff4c9'],
  },
  matrix: {
    name: 'matrix', sky: '#050805', star: '#1f3a26', starHot: '#8dffb0',
    roof: '#00ff66', antenna: '#d4ff3a', street: '#00c853', label: '#4c8058', text: '#dcffe4',
    shades: ['#0b120c', '#0f1810'],
    windows: ['#163020', '#11803d', '#00e676', '#c6ff00', '#eaffef'],
  },
  amber: {
    name: 'amber', sky: '#0b0e14', star: '#363b46', starHot: '#c9c6bd',
    roof: '#ff8f40', antenna: '#ffd580', street: '#e6b450', label: '#6c7380', text: '#e6e1cf',
    shades: ['#12161e', '#171c25'],
    windows: ['#252b36', '#a3474f', '#f07178', '#ff8f40', '#ffd580'],
  },
  ice: {
    name: 'ice', sky: '#0c0f14', star: '#34404f', starHot: '#cfe6ff',
    roof: '#9ccfff', antenna: '#f2fbff', street: '#3d8bff', label: '#6b7d93', text: '#e9f3fc',
    shades: ['#131922', '#18202b'],
    windows: ['#212d3c', '#1f4e99', '#3d8bff', '#7fe3ff', '#f2fbff'],
  },
  sunset: {
    name: 'sunset', sky: '#0f0a0d', star: '#4a333d', starHot: '#f2d0c4',
    roof: '#ff5e62', antenna: '#ffe066', street: '#ff9e44', label: '#8a6c78', text: '#fbeee8',
    shades: ['#1a1116', '#21141b'],
    windows: ['#311e28', '#8c2f66', '#ff4f6d', '#ff9e44', '#ffe066'],
  },
  toxic: {
    name: 'toxic', sky: '#070906', star: '#2f3a22', starHot: '#e2f5b0',
    roof: '#b8ff00', antenna: '#c77dff', street: '#8fd400', label: '#748060', text: '#f1f8dc',
    shades: ['#0f130b', '#14190f'],
    windows: ['#212a17', '#5c8a00', '#b8ff00', '#b56cff', '#f2ffc7'],
  },
  vapor: {
    name: 'vapor', sky: '#0e0c14', star: '#3e3858', starHot: '#e2dcff',
    roof: '#ff9de2', antenna: '#7df9ff', street: '#b29dff', label: '#8580a6', text: '#f5f2ff',
    shades: ['#17141f', '#1d1927'],
    windows: ['#2b263b', '#6d5cb0', '#ff9de2', '#7df9ff', '#fff3b8'],
  },
  crimson: {
    name: 'crimson', sky: '#0a0607', star: '#3d2328', starHot: '#e8b8bf',
    roof: '#ff2e4d', antenna: '#ffb199', street: '#c4142f', label: '#7f5a60', text: '#f9e8ea',
    shades: ['#140b0d', '#1a0e11'],
    windows: ['#2a1519', '#7a1426', '#e0193a', '#ff6b3d', '#ffd9c7'],
  },
  mono: {
    name: 'mono', sky: '#0c0d0f', star: '#363940', starHot: '#d0d4db',
    roof: '#f0f2f5', antenna: '#fafbfc', street: '#9aa0aa', label: '#6b707a', text: '#eef0f4',
    shades: ['#15171a', '#1b1d21'],
    windows: ['#272a30', '#4d525b', '#8b919c', '#c9ced6', '#fafbfc'],
  },
  prism: {
    name: 'prism', sky: '#121118', star: '#4d4866', starHot: '#d6d0f0',
    roof: '#b14dff', antenna: '#ff7a00', street: '#00e5ff', label: '#8a84a3', text: '#f3f0fb',
    shades: ['#1b1924', '#221f2d'],
    windows: ['#2f2b3e', '#ff2e88', '#ffe600', '#39ff14', '#00e5ff'],
  },
  rainbow: {
    name: 'rainbow', sky: '#050505', star: '#38383e', starHot: '#d4d4dc',
    roof: '#9b5de5', antenna: '#ffd23f', street: '#ff7f2a', label: '#76767e', text: '#f2f2f2',
    shades: ['#0e0e10', '#141416'],
    windows: ['#222228', '#e63946', '#ffb627', '#3fbf5f', '#3d9bff'],
  },
};

function fnv1a(a, b, c) {
  let h = 2166136261;
  for (const v of [a, b, c]) {
    h ^= v;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return h >>> 0;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function fetchCalendar(username) {
  const url = `https://github-contributions-api.jogruber.de/v4/${username}?y=last`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch contributions for ${username}: ${res.statusText}`);
  }
  const data = await res.json();
  const days = data.contributions || [];

  // Group into weeks (starting Sunday)
  const weeks = [];
  let currentWeek = [];

  for (const d of days) {
    const date = new Date(d.date);
    if (date.getDay() === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push({
      date,
      count: d.count,
      level: d.level,
    });
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const total = typeof data.total === 'object' ? (data.total.lastYear || data.total['2026'] || 1200) : data.total;

  return {
    login: username,
    total: total || days.reduce((acc, curr) => acc + curr.count, 0),
    weeks,
  };
}

export function buildSkylineSvg(calendar, themeKey = 'neon', options = { height: 14, weeks: 53 }) {
  const theme = THEMES[themeKey] || THEMES.neon;
  const optHeight = Math.max(3, options.height || 14);
  let weeks = calendar.weeks;
  if (options.weeks && options.weeks > 0 && options.weeks < weeks.length) {
    weeks = weeks.slice(weeks.length - options.weeks);
  }

  const colWidth = 2;
  const widthCols = weeks.length * colWidth;
  const skyRows = optHeight + 2;
  const streetY = skyRows;
  const labelY = skyRows + 1;

  // Initialize scene grid
  const rows = Array.from({ length: skyRows + 2 }, (_, y) =>
    Array.from({ length: widthCols }, (_, x) => {
      let rune = ' ';
      let kind = 'Sky';
      if (y < streetY) {
        const h = fnv1a(x, y, 7);
        if (h % 61 === 0) {
          rune = '✦';
          kind = 'Star';
        } else if (h % 23 === 0) {
          rune = '·';
          kind = 'Star';
        }
      }
      return { rune, kind, level: 0, shade: -1, flicker: false };
    })
  );

  // Totals & record week
  const totals = weeks.map((w) => w.reduce((acc, d) => acc + d.count, 0));
  const maxTotal = Math.max(...totals, 0);
  const recordIndex = totals.indexOf(maxTotal);

  function heightFor(total) {
    if (total === 0 || maxTotal === 0) return 1;
    const scaled = Math.log1p(total) / Math.log1p(maxTotal);
    return 1 + Math.round(scaled * (optHeight - 1));
  }

  // Draw buildings
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i];
    const h = heightFor(totals[i]);
    const x0 = i * colWidth;
    const shade = i % 2;
    const top = streetY - h;

    let cellIdx = 0;
    for (let y = streetY - 1; y >= top; y--) {
      for (let dx = 0; dx < colWidth; dx++) {
        let level = 0;
        if (w.length > 0) {
          level = w[cellIdx % w.length].level;
        }
        cellIdx++;
        const flicker = level > 0 && fnv1a(i, y, dx) % 9 === 0;
        rows[y][x0 + dx] = {
          rune: level > 0 ? '▪' : '·',
          kind: 'Window',
          level,
          shade,
          flicker,
        };
      }
    }

    // Roof
    for (let dx = 0; dx < colWidth; dx++) {
      rows[top - 1][x0 + dx] = { rune: '▁', kind: 'Roof', shade: -1 };
    }

    // Antenna
    if (i === recordIndex) {
      rows[top - 2][x0] = { rune: '╻', kind: 'Antenna', shade: -1 };
    }
  }

  // Street
  for (let x = 0; x < widthCols; x++) {
    rows[streetY][x] = { rune: '━', kind: 'Street', shade: -1 };
  }

  // Month labels
  let next = 0;
  let prevMonth = -1;
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i];
    if (!w || w.length === 0) continue;
    const m = w[w.length - 1].date.getMonth();
    if (m === prevMonth) continue;
    prevMonth = m;
    const x = i * colWidth;
    const name = MONTHS[m];
    if (i === 0 || x < next || x + name.length > widthCols) continue;
    for (let j = 0; j < name.length; j++) {
      rows[labelY][x + j] = { rune: name[j], kind: 'Label', shade: -1 };
    }
    next = x + name.length + 1;
  }

  // Render SVG
  const cellW = 10;
  const cellH = 18;
  const fontSize = 15;
  const padX = 16;
  const padTop = 44;
  const padBot = 12;

  const w = widthCols * cellW + padX * 2;
  const totalHeight = rows.length * cellH + padTop + padBot;

  function fgColor(c) {
    switch (c.kind) {
      case 'Star':
        return c.rune === '✦' ? theme.starHot : theme.star;
      case 'Antenna':
        return theme.antenna;
      case 'Roof':
        return theme.roof;
      case 'Window':
        return theme.windows[c.level];
      case 'Street':
        return theme.street;
      case 'Label':
        return theme.label;
      default:
        return theme.text;
    }
  }

  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${totalHeight}" viewBox="0 0 ${w} ${totalHeight}" role="img" aria-labelledby="t">
<title id="t">Skyline of @${escapeXml(calendar.login)}'s GitHub contributions: ${calendar.total.toLocaleString()} in the last year</title>
<style>
text{font-family:ui-monospace,"SF Mono",Menlo,Consolas,"DejaVu Sans Mono",monospace;font-size:${fontSize}px;white-space:pre}
.f{animation:flick 7s infinite steps(1)}
.tw{animation:twinkle 4s infinite ease-in-out}
@keyframes flick{0%,100%{opacity:1}62%{opacity:.2}64%{opacity:1}66%{opacity:.35}70%{opacity:1}}
@keyframes twinkle{0%,100%{opacity:1}50%{opacity:.3}}
@media (prefers-reduced-motion:reduce){.f,.tw{animation:none}}
</style>
<rect width="100%" height="100%" fill="${theme.sky}" rx="8"/>
<text x="${padX}" y="28" fill="${theme.roof}" font-weight="700">@${escapeXml(calendar.login)}</text>
<text x="${padX + (calendar.login.length + 2) * cellW}" y="28" fill="${theme.label}">${calendar.total.toLocaleString()} contributions in the last year</text>
`;

  // Building backgrounds (runs of shade)
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; ) {
      if (row[x].shade < 0) {
        x++;
        continue;
      }
      let end = x;
      while (end < row.length && row[end].shade === row[x].shade) {
        end++;
      }
      const shadeColor = theme.shades[row[x].shade];
      out += `<rect x="${padX + x * cellW}" y="${padTop + y * cellH}" width="${(end - x) * cellW}" height="${cellH}" fill="${shadeColor}"/>\n`;
      x = end;
    }
  }

  // Glyphs
  for (let y = 0; y < rows.length; y++) {
    const baseline = padTop + y * cellH + cellH - 5;
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c.rune === ' ') continue;
      let classAttr = '';
      if (c.flicker) {
        const delay = -(((x * 7 + y * 13) % 70) / 10).toFixed(1);
        classAttr = ` class="f" style="animation-delay:${delay}s"`;
      } else if (c.kind === 'Star' && c.rune === '✦') {
        const delay = -(((x * 3 + y * 5) % 40) / 10).toFixed(1);
        classAttr = ` class="tw" style="animation-delay:${delay}s"`;
      }
      out += `<text x="${padX + x * cellW}" y="${baseline}" fill="${fgColor(c)}"${classAttr}>${escapeXml(c.rune)}</text>\n`;
    }
  }

  out += `</svg>\n`;
  return out;
}

async function main() {
  const themeArg = process.argv[2] || process.env.THEME || 'neon';
  const handle = process.env.HANDLE || 'chrismat-05';

  console.log(`Generating Skyline for @${handle} with theme "${themeArg}"...`);
  await fs.mkdir(ASSETS_DIR, { recursive: true });

  const calendar = await fetchCalendar(handle);
  const svg = buildSkylineSvg(calendar, themeArg);

  const outputPath = path.join(ASSETS_DIR, 'skyline.svg');
  await fs.writeFile(outputPath, svg, 'utf-8');
  console.log(`Saved Skyline SVG to: ${outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
