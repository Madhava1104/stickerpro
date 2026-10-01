const http = require('http');
const fs = require('fs');
const path = require('path');

const cliPort = process.argv[2] && !isNaN(process.argv[2]) ? parseInt(process.argv[2]) : null;
const PORT = cliPort || process.env.PORT || 1234;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/') reqUrl = '/index.html';

  // API Endpoint: POST /api/upload
  // Saves original uploaded sticker image directly to public/ folder
  if (reqUrl === '/api/upload' && req.method === 'POST') {
    const rawFilename = req.headers['x-filename']
      ? decodeURIComponent(req.headers['x-filename'])
      : `artwork_${Date.now()}.png`;
    const cleanFilename = path.basename(rawFilename);
    const ext = path.extname(cleanFilename).toLowerCase();
    const ALLOWED_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];

    if (!ALLOWED_EXTS.includes(ext)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Invalid file format. Only JPG, PNG, WEBP, and SVG image files are allowed.'
      }));
      return;
    }

    const publicDir = path.join(ROOT_DIR, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const targetFilePath = path.join(publicDir, cleanFilename);
    const writeStream = fs.createWriteStream(targetFilePath);

    let totalBytes = 0;
    req.on('data', (chunk) => {
      totalBytes += chunk.length;
    });

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        filename: cleanFilename,
        path: `/public/${cleanFilename}`,
        size: totalBytes
      }));
    });

    writeStream.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to write file to public directory: ' + err.message
      }));
    });
    return;
  }

  const filePath = path.join(ROOT_DIR, decodeURIComponent(reqUrl));

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end('<h1>404 Not Found</h1><p>The requested file does not exist.</p>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('\n======================================================');
  console.log('🚀 StickerPro Studio Server is running!');
  console.log(`📡 Local URL: http://localhost:${PORT}`);
  console.log('======================================================\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = Number(PORT) + 1;
    console.log(`⚠️ Port ${PORT} is busy, retrying on http://localhost:${nextPort}...`);
    server.listen(nextPort);
  } else {
    console.error('Server error:', err);
  }
});
