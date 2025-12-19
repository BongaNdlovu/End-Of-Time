const fs = require('fs');
const path = 'genesis.html';
let html = fs.readFileSync(path, 'utf8');
// Remove any Google Fonts remnants (defensive)
html = html.replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*/g, '')
           .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*/g, '')
           .replace(/\s*<link href="https:\/\/fonts\.googleapis\.com[^"]+" rel="stylesheet">\s*/g, '');
// Ensure fonts.css block exists after og:url meta
const ogUrlRe = /(\s*<meta property="og:url"[^>]*>)([\s\S]*?)(?=<link rel="stylesheet" href="genesis-styles\.css">)/;
if (ogUrlRe.test(html)) {
  const fontsBlock = [
    '  <!-- Self-hosted fonts (match EOTA home) -->',
    '  <link rel="preload" as="font" type="font/woff2" href="/fonts/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2" crossorigin fetchpriority="high">',
    '  <link rel="preload" as="font" type="font/woff2" href="/fonts/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKeiunDXbtM.woff2" crossorigin fetchpriority="high">',
    '  <link rel="stylesheet" href="/fonts/fonts.css">',
    '  <link rel="preload" href="tailwind-output.min.css" as="style" fetchpriority="high">',
    '  <link rel="stylesheet" href="tailwind-output.min.css">'
  ].join('\r\n');
  html = html.replace(ogUrlRe, `$1\r\n${fontsBlock}\r\n`);
}
// Clean any stray malformed tailwind preload lines
html = html.replace(/\s*<link[^>]*tailwind-output\.min\.css[^>]*>\s*/g, (m) => {
  // keep if it's exactly the two clean lines we just inserted; we cannot easily detect, so drop duplicates
  return '';
});
// Re-add clean pair if missing
if (!html.includes('tailwind-output.min.css')) {
  html = html.replace('</head>', '  <link rel="preload" href="tailwind-output.min.css" as="style" fetchpriority="high">\r\n  <link rel="stylesheet" href="tailwind-output.min.css">\r\n</head>');
}
fs.writeFileSync(path, html, 'utf8');
console.log('genesis.html normalized');
