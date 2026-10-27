// 비행기 게임 전용 로컬 서버 (기사 쥐 데모 서버 5320 과 따로): node tools/serve.js [포트=5321]
// → http://localhost:5321/web/index.html
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.argv[2] || 5321);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') { res.writeHead(302, { Location: '/web/index.html' }); return res.end(); } // 상대 경로(../art)가 맞게 web/ 으로
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('없음 ' + p); }
    const head = { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
    // 부분 요청: 브라우저가 MP3 길이를 알고 넘겨 듣기(루프 이음매)를 하려면 필요
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (m) {
      const a = m[1] ? +m[1] : buf.length - +m[2], b = m[1] && m[2] ? +m[2] : buf.length - 1;
      res.writeHead(206, { ...head, 'Content-Range': `bytes ${a}-${b}/${buf.length}`, 'Content-Length': b - a + 1 });
      return res.end(buf.subarray(a, b + 1));
    }
    res.writeHead(200, { ...head, 'Content-Length': buf.length });
    res.end(buf);
  });
}).listen(PORT, () => console.log(`http://localhost:${PORT}/web/index.html`));
