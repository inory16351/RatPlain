// 쥐 해적을 단일 HTML 로: 스크립트를 안에 넣고 그림 · 리깅 파츠 · BGM 은 data URI, Jua 글꼴도 품음 (서버 · 인터넷 없이 더블클릭)
// 사용: node tools/build_pirate.js  → build/쥐해적_일곱바다.html
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'pirate');
const OUT = path.join(ROOT, 'build', '쥐해적_일곱바다.html');

const read = (p) => fs.readFileSync(p, 'utf8');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const b64 = (buf, ext) => `data:${MIME[ext]};base64,` + buf.toString('base64');
const dataUri = (p) => b64(fs.readFileSync(p), path.extname(p));
const get = (url, ua) => new Promise((ok, no) => https.get(url, { headers: { 'User-Agent': ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' } }, (r) => {
  if (r.statusCode !== 200) return no(new Error(url + ' ' + r.statusCode));
  const c = []; r.on('data', (d) => c.push(d)); r.on('end', () => ok(Buffer.concat(c)));
}).on('error', no));

// Jua: Google Fonts CSS 의 글꼴 파일(브라우저 UA 면 woff2 조각 여러 개, 아니면 ttf 하나)을 전부 받아 CSS 안에 넣음. 못 받으면 원래 링크 그대로
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
async function juaCss() {
  try {
    let css = (await get('https://fonts.googleapis.com/css2?family=Jua&display=swap', CHROME)).toString();
    const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com[^)'"]+/g) || [])];
    for (const u of urls) css = css.split(u).join(b64(await get(u, CHROME), path.extname(u)));
    return `<style>\n${css}</style>`;
  } catch (e) { console.warn('Jua 글꼴 못 받음 → 링크로 둠:', e.message); return null; }
}

(async () => {
  const assets = {};
  // 그림 (sprites.js 가 쓰는 것만)
  const sprites = JSON.parse(read(path.join(DIR, 'art/sprites/sprites.json')));
  for (const frames of Object.values(sprites)) for (const f of frames) assets['art/sprites/' + f.img] = dataUri(path.join(DIR, 'art/sprites', f.img));
  // 리깅 파츠 (rigs.js 의 src 만 — compare · whole 같은 확인용 그림은 뺌)
  const rigs = read(path.join(DIR, 'art/rig/rigs.js'));
  for (const [, src] of rigs.matchAll(/"src": "([^"]+)"/g)) assets[src] ||= dataUri(path.join(DIR, src));
  // BGM (효과음은 game.js 가 합성)
  for (const f of fs.readdirSync(path.join(ROOT, 'audio/bgm'))) if (f.endsWith('.mp3')) assets['../audio/bgm/' + f] = dataUri(path.join(ROOT, 'audio/bgm', f));

  let html = read(path.join(DIR, 'index.html'));
  const font = await juaCss();
  if (font) html = html.replace(/<link rel="preconnect"[^>]*>\r?\n/g, '').replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, font);
  let first = true;
  html = html.replace(/<script src="([^"]+)"[^>]*><\/script>/g, (m, src) => {
    const code = read(path.join(DIR, src)).replace(/<\/script/gi, '<\/script');
    const pre = first ? `<script>window.__ASSETS = ${JSON.stringify(assets)};</script>\n` : '';
    first = false;
    return `${pre}<script>\n${code}\n</script>`;
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html);
  console.log(OUT, (fs.statSync(OUT).size / 1048576).toFixed(1) + ' MB', Object.keys(assets).length + '개 그림 · 소리', font ? '+ Jua' : '');
})();
