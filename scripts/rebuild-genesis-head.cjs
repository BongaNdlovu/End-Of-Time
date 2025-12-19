const fs = require('fs');
const path = 'genesis.html';
let html = fs.readFileSync(path, 'utf8');
const headStart = html.indexOf('<head>');
const headEnd = html.indexOf('</head>');
if (headStart === -1 || headEnd === -1) { console.error('head tags not found'); process.exit(1); }
// Extract meta values from current file to preserve any tweaks
function extract(re){ const m = html.match(re); return m ? m[0] : ''; }
const title = extract(/<title>[\s\S]*?<\/title>/) || '<title>Genesis - End of Time Academy<\/title>';
const metaDesc = extract(/<meta name="description"[\s\S]*?>/);
const metaKeywords = extract(/<meta name="keywords"[\s\S]*?>/);
const ogTitle = extract(/<meta property="og:title"[\s\S]*?>/);
const ogDesc = extract(/<meta property="og:description"[\s\S]*?>/);
const ogType = extract(/<meta property="og:type"[\s\S]*?>/);
const ogUrl = extract(/<meta property="og:url"[\s\S]*?>/);
const newHead = [
  '<head>',
  '  <meta charset="UTF-8" />',
  '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '',
  `  ${title}`,
  `  ${metaDesc}`,
  `  ${metaKeywords}`,
  `  ${ogTitle}`,
  `  ${ogDesc}`,
  `  ${ogType}`,
  `  ${ogUrl}`,
  '',
  '  <!-- Self-hosted fonts (match EOTA home) -->',
  '  <link rel="preload" as="font" type="font/woff2" href="/fonts/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2" crossorigin fetchpriority="high">',
  '  <link rel="preload" as="font" type="font/woff2" href="/fonts/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKeiunDXbtM.woff2" crossorigin fetchpriority="high">',
  '  <link rel="stylesheet" href="/fonts/fonts.css">',
  '  <link rel="preload" href="tailwind-output.min.css" as="style" fetchpriority="high">',
  '  <link rel="stylesheet" href="tailwind-output.min.css">',
  '  <link rel="stylesheet" href="genesis-styles.css">',
  '</head>'
].join('\r\n');
const before = html.slice(0, headStart);
const after = html.slice(headEnd + '</head>'.length);
html = before + newHead + after;
fs.writeFileSync(path, html, 'utf8');
console.log('genesis head rebuilt');
