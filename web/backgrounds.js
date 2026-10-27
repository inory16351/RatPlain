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
  };
};
