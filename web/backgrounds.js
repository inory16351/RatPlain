// 스테이지 배경 (바다는 game.js 의 drawSea). 모두 코드로 그리는 탑뷰 땅 · 구름바다 · 도시 · 우주.
// 칸(격자)마다 고정 난수(hash)로 모양을 정해서 같은 자리는 늘 같은 모양.
// 그리기 함수는 카메라만큼 옮겨진 월드 좌표에서 불림: (bg = stages.js 의 bg, c = 카메라)
window.makeBackgrounds = function (G) {
  const { ctx, hash, TAU, VW, VH } = G;
  // 화면에 보이는 칸들 돌기
  function cells(c, size, fn, pad = 1) {
    const x0 = c.x - VW / 2, y0 = c.y - VH / 2;
    for (let gx = Math.floor(x0 / size) - pad; gx <= Math.floor((x0 + VW) / size) + pad; gx++)
      for (let gy = Math.floor(y0 / size) - pad; gy <= Math.floor((y0 + VH) / size) + pad; gy++) fn(gx, gy, gx * size, gy * size);
  }
  function fillView(c, col) { ctx.fillStyle = col; ctx.fillRect(c.x - VW / 2 - 60, c.y - VH / 2 - 60, VW + 120, VH + 120); }
  // 울퉁불퉁한 덩어리 (n 꼭짓점, 반지름 r, 들쭉날쭉 j)
  function blob(x, y, r, n, j, seed, rot = 0) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = rot + (i % n) / n * TAU, rr = r * (1 - j + j * 2 * hash(i % n, seed, 31));
      i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  return {
    // 폭풍 구름바다: 구름 덩어리(어두운 아래 + 밝은 윗면), 가끔 구름 속에서 번개가 번쩍
    storm(bg, c) {
      fillView(c, bg.color);
      cells(c, 380, (gx, gy, x, y) => {
        const h = hash(gx, gy, 1);
        const cx = x + hash(gx, gy, 2) * 380, cy = y + hash(gx, gy, 3) * 380, r = 150 + h * 140;
        ctx.fillStyle = bg.dark;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx + (hash(gx, gy, 10 + i) - 0.5) * r * 1.2, cy + (hash(gx, gy, 20 + i) - 0.5) * r * 0.9, r * (0.55 + hash(gx, gy, 30 + i) * 0.35), 0, TAU); ctx.fill(); }
        ctx.fillStyle = bg.light;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx - 18 + (hash(gx, gy, 10 + i) - 0.5) * r * 1.2, cy - 22 + (hash(gx, gy, 20 + i) - 0.5) * r * 0.9, r * (0.42 + hash(gx, gy, 30 + i) * 0.3), 0, TAU); ctx.fill(); }
        const flick = hash(gx, gy, Math.floor(G.t * 3) + 100);
        if (flick > 0.97) {
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.3);
          g.addColorStop(0, 'rgba(255,250,200,.55)'); g.addColorStop(1, 'rgba(255,250,200,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.3, 0, TAU); ctx.fill();
        }
      });
    },

    // 설산: 눈밭 + 얼어붙은 호수 + 침엽수 숲 + 바위산(눈 덮인 꼭대기, 능선)
    snow(bg, c) {
      fillView(c, bg.color);
      cells(c, 520, (gx, gy, x, y) => {
        const h = hash(gx, gy, 1);
        if (h < 0.3) { ctx.fillStyle = bg.shade; blob(x + 260, y + 260, 230 + h * 300, 10, 0.2, gx * 7 + gy); ctx.fill(); }
        if (h > 0.82) { ctx.fillStyle = bg.lake; ctx.beginPath(); ctx.ellipse(x + hash(gx, gy, 2) * 520, y + hash(gx, gy, 3) * 520, 120 + h * 90, 70 + h * 40, h * 6, 0, TAU); ctx.fill(); }
      });
      cells(c, 240, (gx, gy, x, y) => {
        if (hash(gx, gy, 5) > 0.3) return;
        // 숲 = 한 점 둘레에 작은 나무 여럿
        const n = 6 + Math.floor(hash(gx, gy, 6) * 8), fx = x + 120, fy = y + 120;
        for (let i = 0; i < n; i++) {
          const a = hash(gx, gy, 40 + i) * TAU, d = Math.sqrt(hash(gx, gy, 60 + i)) * 90;
          const px = fx + Math.cos(a) * d, py = fy + Math.sin(a) * d * 0.8, r = 8 + hash(gx, gy, 80 + i) * 7;
          ctx.fillStyle = '#4c7365'; ctx.beginPath(); ctx.arc(px + 4, py + 5, r, 0, TAU); ctx.fill();
          ctx.fillStyle = bg.pine; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(px - r * 0.3, py - r * 0.3, r * 0.4, 0, TAU); ctx.fill();
        }
      });
      cells(c, 1000, (gx, gy, x, y) => {
        const h = hash(gx, gy, 9);
        if (h > 0.55 || (gx === 0 && gy === 0)) return;
        const mx = x + 250 + hash(gx, gy, 10) * 500, my = y + 250 + hash(gx, gy, 11) * 500, r = 220 + h * 260, seed = gx * 13 + gy * 7;
        ctx.fillStyle = bg.rock; blob(mx, my, r, 9, 0.22, seed); ctx.fill();
        ctx.fillStyle = '#8697a8'; blob(mx + r * 0.12, my + r * 0.12, r * 0.75, 9, 0.22, seed + 1); ctx.fill(); // 그늘진 비탈
        ctx.fillStyle = '#ffffff'; blob(mx - r * 0.06, my - r * 0.06, r * 0.58, 8, 0.3, seed + 2, 0.4); ctx.fill(); // 눈 덮인 윗부분
        ctx.strokeStyle = 'rgba(140,160,185,.6)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + h * 3; ctx.moveTo(mx - r * 0.06, my - r * 0.06); ctx.lineTo(mx + Math.cos(a) * r * 0.55, my + Math.sin(a) * r * 0.55); }
        ctx.stroke();
      });
    },

    // 밤 도시: 길 격자 + 건물 지붕(옥상 기계 · 네온) + 가로등 + 길 위 자동차 불빛
    city(bg, c) {
      fillView(c, bg.color);
      const B = 420, ST = 70;
      cells(c, B, (gx, gy, x, y) => {
        ctx.fillStyle = bg.street; ctx.fillRect(x, y, B, ST); ctx.fillRect(x, y, ST, B);
        // 건물: 블록을 1~4 개로 나눔
        const split = Math.floor(hash(gx, gy, 1) * 3), bx = x + ST + 10, by = y + ST + 10, bw = B - ST - 20;
        const rects = split === 0 ? [[0, 0, 1, 1]] : split === 1 ? [[0, 0, 0.55, 1], [0.58, 0, 0.42, 1]] : [[0, 0, 0.48, 0.48], [0.52, 0, 0.48, 0.48], [0, 0.52, 0.48, 0.48], [0.52, 0.52, 0.48, 0.48]];
        rects.forEach(([u, v, w, h], i) => {
          const rx = bx + u * bw, ry = by + v * bw, rw = w * bw, rh = h * bw, k = hash(gx, gy, 10 + i);
          ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(rx + 10, ry + 14, rw, rh); // 건물 그림자
          ctx.fillStyle = bg.roofs[Math.floor(k * bg.roofs.length)]; ctx.fillRect(rx, ry, rw, rh);
          ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(rx + 8, ry + 8, rw - 16, rh - 16);
          ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(rx + rw * 0.2, ry + rh * 0.25, rw * 0.22, rh * 0.18); // 옥상 기계
          if (k > 0.55) { // 창문 불빛 줄 (지붕 가장자리)
            ctx.fillStyle = bg.light;
            for (let j = 0; j < 5; j++) if (hash(gx * 5 + j, gy, 20 + i) > 0.35) ctx.fillRect(rx + 10 + j * (rw - 30) / 5, ry + rh - 9, 14, 5);
          }
          if (k > 0.85) { // 네온 간판
            const col = ['#ff6fa8', '#6ff0ff', '#b98cff'][Math.floor(k * 100) % 3], on = Math.sin(G.t * 3 + k * 20) > -0.6;
            ctx.globalAlpha = on ? 0.9 : 0.25; ctx.fillStyle = col; ctx.fillRect(rx + rw * 0.55, ry + rh * 0.55, rw * 0.3, 10); ctx.globalAlpha = 1;
          }
        });
        // 가로등 + 자동차 불빛 (가산 합성으로 빛나게)
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const [lx, ly] of [[x + ST / 2, y + ST / 2], [x + B / 2, y + 8], [x + 8, y + B / 2]]) {
          const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 46); g.addColorStop(0, 'rgba(255,210,120,.45)'); g.addColorStop(1, 'rgba(255,210,120,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 46, 0, TAU); ctx.fill();
        }
        const car = (hash(gx, gy, 50) * B + G.t * (120 + hash(gx, gy, 51) * 160)) % B;
        ctx.fillStyle = 'rgba(255,240,200,.9)'; ctx.fillRect(x + car, y + 20, 7, 5); ctx.fillRect(x + car, y + 30, 7, 5);
        ctx.fillStyle = 'rgba(255,80,80,.8)'; ctx.fillRect(x + 40, y + B - car, 5, 7); ctx.fillRect(x + 50, y + B - car, 5, 7);
        ctx.restore();
      });
    },

    // 우주: 성운(아주 느림) · 별 3겹(시차) · 떠다니는 소행성(땅 높이)
    space(bg, c) {
      fillView(c, bg.color);
      const layer = (k, fn) => { ctx.save(); ctx.translate(c.x * (1 - k), c.y * (1 - k)); fn({ x: c.x * k, y: c.y * k }); ctx.restore(); };
      layer(0.08, (cc) => cells(cc, 900, (gx, gy, x, y) => {
        const h = hash(gx, gy, 1); if (h > 0.6) return;
        ctx.fillStyle = bg.nebula[Math.floor(h * 10) % bg.nebula.length];
        ctx.beginPath(); ctx.ellipse(x + hash(gx, gy, 2) * 900, y + hash(gx, gy, 3) * 900, 380 + h * 400, 220 + h * 200, h * 5, 0, TAU); ctx.fill();
      }));
      [[0.2, 1.4, 0.5], [0.45, 2, 0.7], [0.75, 2.8, 0.95]].forEach(([k, r, al], li) => layer(k, (cc) => cells(cc, 160, (gx, gy, x, y) => {
        if (hash(gx, gy, 70 + li) > 0.55) return;
        const tw = 0.6 + 0.4 * Math.sin(G.t * 2 + hash(gx, gy, 80) * 30);
        ctx.globalAlpha = al * tw; ctx.fillStyle = hash(gx, gy, 90) > 0.8 ? '#ffe7b0' : '#dfe8ff';
        ctx.beginPath(); ctx.arc(x + hash(gx, gy, 91 + li) * 160, y + hash(gx, gy, 92 + li) * 160, r, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }, 0)));
      // 멀리 있는 행성 하나
      layer(0.05, () => {
        const px = 1400, py = -900;
        ctx.fillStyle = '#c98a5a'; ctx.beginPath(); ctx.arc(px, py, 260, 0, TAU); ctx.fill();
        ctx.fillStyle = '#b07148'; ctx.beginPath(); ctx.arc(px + 50, py + 40, 230, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(230,200,160,.55)'; ctx.lineWidth = 18; ctx.beginPath(); ctx.ellipse(px, py, 420, 90, -0.3, 0, TAU); ctx.stroke();
      });
      cells(c, 700, (gx, gy, x, y) => {
        const h = hash(gx, gy, 5); if (h > 0.3 || (gx === 0 && gy === 0)) return;
        const ax = x + hash(gx, gy, 6) * 700, ay = y + hash(gx, gy, 7) * 700, r = 40 + h * 260, rot = G.t * (hash(gx, gy, 8) - 0.5) * 0.3;
        ctx.fillStyle = '#4c4a5e'; blob(ax + 8, ay + 10, r, 9, 0.2, gx * 3 + gy, rot); ctx.fill();
        ctx.fillStyle = bg.rock; blob(ax, ay, r, 9, 0.2, gx * 3 + gy, rot); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.18)';
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(ax + Math.cos(rot + i * 2.1) * r * 0.4, ay + Math.sin(rot + i * 2.1) * r * 0.4, r * (0.12 + hash(gx, gy, 20 + i) * 0.1), 0, TAU); ctx.fill(); }
      });
    },

    // 사막: 바람 물결 무늬 + 초승달 모래 언덕(바람 맞는 쪽 밝게, 반대쪽 미끄럼 면 그늘), 바위 언덕, 가끔 오아시스(물 + 야자수)
    desert(bg, c) {
      fillView(c, bg.color);
      // 바람 물결: 가늘고 옅은 물결 줄 (모두 같은 방향)
      ctx.strokeStyle = 'rgba(170,130,80,.18)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      cells(c, 140, (gx, gy, x, y) => {
        if (hash(gx, gy, 40) > 0.6) return;
        const sx = x + hash(gx, gy, 41) * 140, sy = y + hash(gx, gy, 42) * 140, l = 50 + hash(gx, gy, 43) * 60;
        ctx.beginPath(); ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(sx + l * 0.3, sy - 10, sx + l * 0.6, sy + 10, sx + l, sy); ctx.stroke();
      });
      // 초승달 언덕 (뿔이 바람 아래쪽 = 오른쪽 아래를 향함)
      cells(c, 620, (gx, gy, x, y) => {
        const h = hash(gx, gy, 1); if (h > 0.55) return;
        const cx = x + 120 + hash(gx, gy, 2) * 380, cy = y + 120 + hash(gx, gy, 3) * 380, r = 110 + h * 150, rot = 0.5 + (hash(gx, gy, 4) - 0.5) * 0.5;
        const seed = gx * 7 + gy * 13;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
        ctx.fillStyle = 'rgba(150,105,60,.22)'; blob(r * 0.2, 0, r, 11, 0.12, seed); ctx.fill();   // 바람 반대쪽 미끄럼 면 그늘
        ctx.fillStyle = bg.dune; blob(0, 0, r * 0.92, 11, 0.12, seed); ctx.fill();                 // 언덕 몸통 (바탕과 비슷한 색)
        ctx.fillStyle = bg.light; ctx.globalAlpha = 0.45; blob(-r * 0.25, 0, r * 0.55, 9, 0.15, seed + 1); ctx.fill(); ctx.globalAlpha = 1; // 바람 맞는 비탈
        ctx.strokeStyle = 'rgba(140,100,60,.35)'; ctx.lineWidth = 3; ctx.lineCap = 'round';      // 능선
        ctx.beginPath(); ctx.arc(-r * 0.15, 0, r * 0.62, -1.1, 1.1); ctx.stroke();
        ctx.restore();
      });
      cells(c, 1100, (gx, gy, x, y) => {
        const h = hash(gx, gy, 9); if (h > 0.5 || (gx === 0 && gy === 0)) return;
        const mx = x + 250 + hash(gx, gy, 10) * 600, my = y + 250 + hash(gx, gy, 11) * 600, seed = gx * 13 + gy * 7;
        if (h < 0.12) { // 오아시스
          ctx.fillStyle = '#c9b178'; blob(mx, my, 200, 10, 0.15, seed); ctx.fill();
          ctx.fillStyle = bg.oasis; blob(mx, my, 130, 10, 0.18, seed + 1); ctx.fill();
          for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + h * 9, px = mx + Math.cos(a) * 170, py = my + Math.sin(a) * 150;
            ctx.fillStyle = '#4f8a46'; for (let j = 0; j < 5; j++) { const b = j / 5 * TAU; ctx.beginPath(); ctx.ellipse(px + Math.cos(b) * 18, py + Math.sin(b) * 18, 22, 8, b, 0, TAU); ctx.fill(); }
            ctx.fillStyle = '#7a5a36'; ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.fill(); }
        } else { // 바위 언덕
          const r = 150 + h * 240;
          ctx.fillStyle = '#9a6f46'; blob(mx + 14, my + 14, r, 8, 0.25, seed); ctx.fill();
          ctx.fillStyle = bg.rock; blob(mx, my, r, 8, 0.25, seed); ctx.fill();
          ctx.fillStyle = '#cfa274'; blob(mx - r * 0.15, my - r * 0.15, r * 0.55, 7, 0.3, seed + 3); ctx.fill();
        }
      });
    },

    // 화산섬: 굳은 용암 바위 + 흐르는 용암 줄기(밝기가 일렁임) + 분화구
    volcano(bg, c) {
      fillView(c, bg.color);
      cells(c, 520, (gx, gy, x, y) => {
        const h = hash(gx, gy, 1);
        ctx.fillStyle = h < 0.5 ? bg.rock : bg.ash; blob(x + 260, y + 260, 200 + h * 160, 9, 0.25, gx * 5 + gy * 11); ctx.fill();
      });
      cells(c, 700, (gx, gy, x, y) => {
        const h = hash(gx, gy, 3); if (h > 0.45) return;
        // 용암 줄기: 구불구불한 굵은 선 (빛 · 심)
        const pts = []; let px = x + hash(gx, gy, 4) * 700, py = y, a = Math.PI / 2 + (hash(gx, gy, 5) - 0.5);
        for (let i = 0; i < 9; i++) { pts.push([px, py]); a += (hash(gx, gy, 10 + i) - 0.5) * 0.9; px += Math.cos(a) * 95; py += Math.sin(a) * 95; }
        const pulse = 0.75 + 0.25 * Math.sin(G.t * 2 + h * 20);
        for (const [w, col, al] of [[46, bg.lava, 0.35 * pulse], [22, bg.lava, 0.95], [8, bg.glow, pulse]]) {
          ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); pts.forEach(([qx, qy], i) => (i ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy))); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });
      cells(c, 1300, (gx, gy, x, y) => {
        const h = hash(gx, gy, 7); if (h > 0.35 || (gx === 0 && gy === 0)) return;
        const mx = x + 300 + hash(gx, gy, 8) * 700, my = y + 300 + hash(gx, gy, 9) * 700, r = 200 + h * 260, seed = gx * 3 + gy * 17;
        ctx.fillStyle = '#2a1e1e'; blob(mx + 16, my + 16, r, 10, 0.18, seed); ctx.fill();
        ctx.fillStyle = '#6a4c44'; blob(mx, my, r, 10, 0.18, seed); ctx.fill();
        ctx.fillStyle = '#4a3632'; blob(mx, my, r * 0.55, 9, 0.15, seed + 1); ctx.fill();
        ctx.globalAlpha = 0.8 + 0.2 * Math.sin(G.t * 3 + h * 9); ctx.fillStyle = bg.lava; blob(mx, my, r * 0.35, 9, 0.2, seed + 2); ctx.fill();
        ctx.fillStyle = bg.glow; ctx.beginPath(); ctx.arc(mx, my, r * 0.15, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      });
    },

    // 밀림: 나무 꼭대기(둥근 잎 덩어리) 빽빽이 + 굽이치는 강
    jungle(bg, c) {
      fillView(c, bg.color);
      cells(c, 900, (gx, gy, x, y) => {
        if (hash(gx, gy, 3) > 0.35) return;
        const pts = []; let px = x, py = y + hash(gx, gy, 4) * 900, a = (hash(gx, gy, 5) - 0.5) * 0.6;
        for (let i = 0; i < 8; i++) { pts.push([px, py]); a += (hash(gx, gy, 10 + i) - 0.5) * 0.8; px += Math.cos(a) * 150; py += Math.sin(a) * 150; }
        for (const [w, col] of [[110, '#3a6a4a'], [80, bg.river]]) {
          ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); pts.forEach(([qx, qy], i) => (i ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy))); ctx.stroke();
        }
      });
      cells(c, 150, (gx, gy, x, y) => {
        const h = hash(gx, gy, 1); if (h > 0.8) return;
        const cx = x + hash(gx, gy, 2) * 150, cy = y + hash(gx, gy, 6) * 150, r = 50 + h * 45;
        ctx.fillStyle = 'rgba(20,45,28,.55)'; ctx.beginPath(); ctx.arc(cx + 10, cy + 12, r, 0, TAU); ctx.fill();
        ctx.fillStyle = bg.canopy[Math.floor(h * 40) % bg.canopy.length]; blob(cx, cy, r, 8, 0.15, gx * 7 + gy * 3); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.45, 0, TAU); ctx.fill();
      });
    },

    // 하늘 요새: 구름 위에 뜬 거대한 강철 갑판(판 이음새 · 노란 줄 · 대공포 자리)
    fortress(bg, c) {
      fillView(c, bg.color);
      cells(c, 1200, (gx, gy, x, y) => {
        const h = hash(gx, gy, 1); if (h > 0.55) return;
        const w = 520 + h * 500, d = 380 + hash(gx, gy, 2) * 300, px = x + 120 + hash(gx, gy, 3) * (1080 - w * 0.6), py = y + 120 + hash(gx, gy, 4) * (1080 - d * 0.6);
        ctx.fillStyle = 'rgba(30,40,60,.25)'; ctx.fillRect(px + 30, py + 40, w, d); // 아래 구름에 지는 그림자
        ctx.fillStyle = bg.deck; ctx.fillRect(px, py, w, d);
        ctx.fillStyle = bg.plate;
        for (let i = 0; i < w / 80; i++) for (let j = 0; j < d / 80; j++) if (hash(gx * 31 + i, gy * 17 + j, 5) > 0.5) ctx.fillRect(px + i * 80 + 4, py + j * 80 + 4, 72, 72);
        ctx.fillStyle = bg.line; ctx.fillRect(px, py + d / 2 - 6, w, 12);
        for (let i = 0; i < w; i += 60) { ctx.fillStyle = '#3a4250'; ctx.fillRect(px + i, py, 30, 10); ctx.fillRect(px + i, py + d - 10, 30, 10); }
        for (const [u, v] of [[0.2, 0.2], [0.8, 0.25], [0.3, 0.78], [0.75, 0.8]]) {
          const tx = px + w * u, ty = py + d * v;
          ctx.fillStyle = '#4b5564'; ctx.beginPath(); ctx.arc(tx, ty, 34, 0, TAU); ctx.fill();
          ctx.fillStyle = '#5d6878'; ctx.beginPath(); ctx.arc(tx, ty, 24, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#2f3540'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(G.t * 0.7 + u * 9) * 46, ty + Math.sin(G.t * 0.7 + u * 9) * 46); ctx.stroke();
        }
      });
    },

    // 달 궤도: 별 + 멀리 지구, 아래로 달 표면(구덩이)이 천천히 지나감
    moon(bg, c) {
      fillView(c, bg.color);
      const layer = (k, fn) => { ctx.save(); ctx.translate(c.x * (1 - k), c.y * (1 - k)); fn({ x: c.x * k, y: c.y * k }); ctx.restore(); };
      layer(0.25, (cc) => cells(cc, 170, (gx, gy, x, y) => {
        if (hash(gx, gy, 70) > 0.5) return;
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(G.t * 2 + hash(gx, gy, 80) * 30); ctx.fillStyle = '#e6ecff';
        ctx.beginPath(); ctx.arc(x + hash(gx, gy, 71) * 170, y + hash(gx, gy, 72) * 170, 1.8, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      }, 0));
      layer(0.04, () => {
        const px = -1200, py = -700;
        ctx.fillStyle = bg.earth; ctx.beginPath(); ctx.arc(px, py, 300, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5fa860'; blob(px - 60, py - 40, 110, 9, 0.35, 3); ctx.fill(); blob(px + 120, py + 80, 80, 9, 0.35, 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; blob(px + 20, py - 160, 90, 8, 0.4, 5); ctx.fill();
        ctx.fillStyle = 'rgba(10,15,40,.45)'; ctx.beginPath(); ctx.arc(px + 90, py + 60, 290, 0, TAU); ctx.fill();
      });
      // 달 표면 조각: 구덩이 여럿
      cells(c, 800, (gx, gy, x, y) => {
        const h = hash(gx, gy, 5); if (h > 0.4) return;
        const mx = x + 400, my = y + 400, r = 260 + h * 300, seed = gx * 11 + gy * 5;
        ctx.fillStyle = '#5e5e6c'; blob(mx + 14, my + 14, r, 12, 0.12, seed); ctx.fill();
        ctx.fillStyle = bg.surface; blob(mx, my, r, 12, 0.12, seed); ctx.fill();
        for (let i = 0; i < 5; i++) {
          const a = hash(gx, gy, 20 + i) * TAU, d = hash(gx, gy, 30 + i) * r * 0.6, cr = 20 + hash(gx, gy, 40 + i) * 60;
          ctx.fillStyle = bg.crater; ctx.beginPath(); ctx.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, cr, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(mx + Math.cos(a) * d - cr * 0.2, my + Math.sin(a) * d - cr * 0.2, cr * 0.6, 0, TAU); ctx.fill();
        }
      });
    },
  };
};
