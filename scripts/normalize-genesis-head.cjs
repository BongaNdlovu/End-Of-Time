const fs = require('fs');
const path = 'genesis.html';
let html = fs.readFileSync(path, 'utf8');
// Build desired block for fonts and CSS
const desired = [
  '  <!-- Self-hosted fonts (match EOTA home) -->',
  '  <link rel="preload" as="font" type="font/woff2" href="/fonts/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2" crossorigin fetchpriority="high">',
  '  <link rel="preload" as="font" type="font/woff2" href="/fonts/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKeiunDXbtM.woff2" crossorigin fetchpriority="high">',
  '  <link rel="stylesheet" href="/fonts/fonts.css">',
  '  <link rel="preload" href="tailwind-output.min.css" as="style" fetchpriority="high">',
  '  <link rel="stylesheet" href="tailwind-output.min.css">'
].join('\r\n');
// Remove any existing lines referencing google fonts and tailwind-output
html = html.replace(/\s*<link[^>]*fonts\.googleapis[^>]*>\s*/g, '')
           .replace(/\s*<link[^>]*fonts\.gstatic[^>]*>\s*/g, '')
           .replace(/\s*<link[^>]*tailwind-output\.[^>]*>\s*/g, '');
// Insert desired block right after og:url meta
html = html.replace(/(\s*<meta property="og:url"[^>]*>)/, `$1\r\n${desired}\r\n`);
// Ensure genesis-styles remains present and positioned before </head>
if (!/genesis-styles\.css/.test(html)) {
  html = html.replace('</head>', '  <link rel="stylesheet" href="genesis-styles.css">\r\n</head>');
}
fs.writeFileSync(path, html, 'utf8');
console.log('genesis head normalized');
