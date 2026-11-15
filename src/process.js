// Петте състояния на една капачка: оригинал → облак от точки → чертеж → слоеве → готова част.
const C = 200;

function scallop(R, amp = 7, n = 10, N = 240) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = R + amp * Math.cos(a * n);
    pts.push([C + r * Math.cos(a), C + r * Math.sin(a)]);
  }
  return pts;
}
const toPath = (pts) => 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';

// детерминиран „random“, за да е еднакъв облакът при всяко зареждане
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export function buildProcessViz(el) {
  const outline = toPath(scallop(148));
  const rnd = rng(7);

  // 02 — точки
  const dots = [];
  scallop(148, 7, 10, 96).forEach((p) => dots.push(p));
  for (let i = 0; i < 44; i++) { const a = (i / 44) * 6.283; dots.push([C + 64 * Math.cos(a), C + 64 * Math.sin(a)]); }
  for (let i = 0; i < 22; i++) { const a = (i / 22) * 6.283; dots.push([C + 30 * Math.cos(a), C + 30 * Math.sin(a)]); }
  for (let i = 0; i < 150; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 138; dots.push([C + r * Math.cos(a), C + r * Math.sin(a)]); }
  dots.sort((a, b) => a[1] - b[1]);
  const dotSvg = dots.map((d, i) => `<circle cx="${d[0].toFixed(1)}" cy="${d[1].toFixed(1)}" r="${(1.3 + rnd() * 1.1).toFixed(1)}" style="--i:${i}"/>`).join('');

  // 03 — отвори по окръжност
  const holes = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * 6.283 - Math.PI / 2;
    return `<circle cx="${(C + 100 * Math.cos(a)).toFixed(1)}" cy="${(C + 100 * Math.sin(a)).toFixed(1)}" r="7" pathLength="1" class="draw"/>`;
  }).join('');

  // 04 — слоеве
  let layers = '';
  for (let y = 352, i = 0; y >= 46; y -= 6.4, i++) layers += `<line x1="30" x2="370" y1="${y}" y2="${y}" style="--i:${i}"/>`;

  el.innerHTML = `
  <svg viewBox="0 0 400 400" role="img">
    <defs><clipPath id="capClip"><path d="${outline}"/></clipPath></defs>

    <g class="st s1">
      <path d="${outline}" class="ink fillfaint"/>
      <circle cx="200" cy="200" r="64" class="ink"/><circle cx="200" cy="200" r="30" class="ink"/>
      <path d="M232 152 246 130 241 110 258 84 255 62" class="crack"/>
      <path d="M246 130 266 124" class="crack"/>
      <path d="M152 238 131 250 122 274 104 286" class="crack"/>
      <circle cx="322" cy="272" r="34" class="bite"/>
      <path d="M294 254 A34 34 0 0 0 314 304" class="bite-edge"/>
      <path d="M262 84 300 60h36" class="lead"/><text x="302" y="54">ПУКНАТИНА</text>
      <path d="M318 268 356 300v24" class="lead"/><text x="312" y="340">ЛИПСВА ПАРЧЕ</text>
      <text x="30" y="386" class="cap">ОРИГИНАЛ · СЛЕД 15 ГОДИНИ НА СЛЪНЦЕ</text>
    </g>

    <g class="st s2">
      <g class="dots">${dotSvg}</g>
      <g class="scan"><rect x="20" y="-26" width="360" height="26" class="scan__trail"/><rect x="20" y="0" width="360" height="2" class="scan__line"/></g>
      <text x="30" y="386" class="cap">СКАНИРАНЕ · ${dots.length} ТОЧКИ ОТ ${dots.length}</text>
    </g>

    <g class="st s3">
      <path d="M12 200H388M200 12V388" class="axis"/>
      <path d="${outline}" class="draw thin" pathLength="1"/>
      <circle cx="200" cy="200" r="64" class="draw thin" pathLength="1"/>
      <circle cx="200" cy="200" r="30" class="draw thin" pathLength="1"/>
      <circle cx="200" cy="200" r="100" class="axis"/>
      ${holes}
      <g class="dim">
        <path d="M45 200V372M355 200V372M45 362H355"/><path d="M45 362l9-4v8zM355 362l-9-4v8z" class="arrow"/>
        <text x="200" y="356" text-anchor="middle">Ø 148,0</text>
        <path d="M200 200 246 154 286 154"/><text x="250" y="148">Ø 60 H7</text>
        <path d="M299 163 318 126h44"/><text x="320" y="120">5 × Ø 7</text>
      </g>
      <text x="30" y="30" class="cap">ЧЕРТЕЖ · REV. C</text>
    </g>

    <g class="st s4">
      <path d="${outline}" class="ghost"/>
      <g clip-path="url(#capClip)" class="layers">${layers}</g>
      <g class="nzl"><g class="nzl__x"><path d="M-9-22h18v10L0 0-9-12z"/></g></g>
      <text x="30" y="386" class="cap">ПРОТОТИП №3 · 0,2 mm СЛОЙ</text>
    </g>

    <g class="st s5">
      <path d="${outline}" class="copy" transform="translate(22 20)"/>
      <path d="${outline}" class="copy" transform="translate(11 10)"/>
      <path d="${outline}" class="final"/>
      <circle cx="200" cy="200" r="64" class="final-ring"/>
      <circle cx="200" cy="200" r="30" class="final-hub"/>
      <use href="#cube" x="184" y="184" width="32" height="32" class="final-logo"/>
      <g clip-path="url(#capClip)"><g transform="skewX(-20)"><rect x="-140" y="0" width="90" height="400" class="shine"/></g></g>
      <text x="352" y="62" class="inf" text-anchor="end">× ∞</text>
      <text x="30" y="386" class="cap">ГОТОВА ЧАСТ · КОЛКОТО БРОЙКИ ТРЯБВАТ</text>
    </g>
  </svg>`;
}
