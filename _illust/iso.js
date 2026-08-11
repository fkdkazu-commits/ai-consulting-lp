/* アイソメトリック描画ヘルパ
   3D(x,y,z) → 画面: sx=(x-y)*0.866, sy=(x+y)*0.5-z
   x軸=右下 / y軸=左下 / z軸=上。立方体は「上面・右面(x=const)・左面(y=const)」が見える。 */

function mk(cx, cy, s) {
  const out = [];
  const px = (x, y, z) => cx + (x - y) * 0.866 * s;
  const py = (x, y, z) => cy + ((x + y) * 0.5 - z) * s;
  const P = (x, y, z = 0) => px(x, y, z).toFixed(1) + ',' + py(x, y, z).toFixed(1);
  const XY = (x, y, z = 0) => [px(x, y, z), py(x, y, z)];

  const add = (str) => { out.push(str); return str; };
  const poly = (pts, fill, a = '') =>
    add(`<polygon points="${pts.map(q => P(q[0], q[1], q[2] || 0)).join(' ')}" fill="${fill}" ${a}/>`);

  /* 直方体。c = {t: 上面, r: 右面, l: 左面} */
  const box = (x, y, z, w, d, h, c, a = '') => {
    poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], c.r, a);
    poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], c.l, a);
    poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], c.t, a);
  };

  /* 床（z=const の水平面） */
  const floor = (x, y, w, d, z, fill, a = '') =>
    poly([[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]], fill, a);

  /* y=yc の垂直面（＝画面左向きの面）に置く矩形。u は x方向、v は z方向 */
  const rectL = (x0, yc, z0, u, v, w, h, fill, a = '') =>
    poly([[x0 + u, yc, z0 + v], [x0 + u + w, yc, z0 + v], [x0 + u + w, yc, z0 + v + h], [x0 + u, yc, z0 + v + h]], fill, a);

  /* x=xc の垂直面（＝画面右向きの面）に置く矩形。u は y方向、v は z方向 */
  const rectR = (xc, y0, z0, u, v, w, h, fill, a = '') =>
    poly([[xc, y0 + u, z0 + v], [xc, y0 + u + w, z0 + v], [xc, y0 + u + w, z0 + v + h], [xc, y0 + u, z0 + v + h]], fill, a);

  /* z=zc の水平面に置く矩形 */
  const rectT = (x0, y0, zc, u, v, w, d, fill, a = '') =>
    poly([[x0 + u, y0 + v, zc], [x0 + u + w, y0 + v, zc], [x0 + u + w, y0 + v + d, zc], [x0 + u, y0 + v + d, zc]], fill, a);

  /* 接地影 */
  const shadow = (x, y, w, d, o = 0.16) =>
    poly([[x, y + d / 2, 0], [x + w / 2, y, 0], [x + w, y + d / 2, 0], [x + w / 2, y + d, 0]],
      `rgba(0,0,0,${o})`, 'filter="url(#soft)"');

  /* 面に「左上原点・下向きy」の平面を貼る。inner は普通の2D SVG として書ける。
     faceL: y=yc の面（画面左向き）／ faceR: x=xc の面（画面右向き）／ faceT: z=zc の水平面 */
  const faceL = (x0, yc, zTop, inner, a = '') => {
    const [e, f] = XY(x0, yc, zTop);
    return add(`<g transform="matrix(${(0.866 * s).toFixed(4)} ${(0.5 * s).toFixed(4)} 0 ${s.toFixed(4)} ${e.toFixed(2)} ${f.toFixed(2)})" ${a}>${inner}</g>`);
  };
  const faceR = (xc, y0, zTop, inner, a = '') => {
    const [e, f] = XY(xc, y0, zTop);
    return add(`<g transform="matrix(${(-0.866 * s).toFixed(4)} ${(0.5 * s).toFixed(4)} 0 ${s.toFixed(4)} ${e.toFixed(2)} ${f.toFixed(2)})" ${a}>${inner}</g>`);
  };
  const faceT = (x0, y0, zc, inner, a = '') => {
    const [e, f] = XY(x0, y0, zc);
    return add(`<g transform="matrix(${(0.866 * s).toFixed(4)} ${(0.5 * s).toFixed(4)} ${(-0.866 * s).toFixed(4)} ${(0.5 * s).toFixed(4)} ${e.toFixed(2)} ${f.toFixed(2)})" ${a}>${inner}</g>`);
  };

  /* アイソメ空間の点を基点に、画面座標でそのまま描く（人物・吹き出しなど立ち物用） */
  const at = (x, y, z, inner, sc = 1) => {
    const [ax, ay] = XY(x, y, z);
    return add(`<g transform="translate(${ax.toFixed(1)} ${ay.toFixed(1)}) scale(${(s / 13 * sc).toFixed(3)})">${inner}</g>`);
  };

  return { out, P, XY, add, poly, box, floor, rectL, rectR, rectT, faceL, faceR, faceT, shadow, at, svg: () => out.join('\n') };
}

/* ── 人物（足元原点の立ち絵）────────────────────────────
   dir: 'l' = 左向き / 'r' = 右向き / 'f' = 正面
   pose: 'stand' | 'point'(指差し) | 'sit'(椅子) | 'talk'(片手を上げる) | 'shake'(握手) */
function human(o) {
  const {
    skin = '#f6c9a6', hair = '#26303f', top = '#3b82f6', bottom = '#22304a',
    dir = 'f', pose = 'stand', h = 1, hairStyle = 'short'
  } = o;
  const f = h; // 全体スケール
  const g = [];
  const S = (n) => (n * f).toFixed(1);
  const mirror = dir === 'l' ? -1 : 1;

  // 脚
  g.push(`<path d="M${S(-7)} ${S(-30)} h14 v26 a4 4 0 0 1 -4 4 h-2 a3 3 0 0 1 -3 -3 v-16 v16 a3 3 0 0 1 -3 3 h-2 a4 4 0 0 1 -4 -4 z" fill="${bottom}"/>`);
  // 胴
  g.push(`<path d="M${S(-9)} ${S(-56)} q9 -5 18 0 l2 22 q-11 4 -22 0 z" fill="${top}"/>`);
  // 腕
  if (pose === 'point') {
    g.push(`<g transform="scale(${mirror} 1)"><path d="M${S(7)} ${S(-54)} q10 4 15 -9" stroke="${top}" stroke-width="${S(6)}" fill="none" stroke-linecap="round"/><circle cx="${S(23)}" cy="${S(-64)}" r="${S(3.4)}" fill="${skin}"/></g>`);
    g.push(`<path d="M${S(-8)} ${S(-54)} q-4 8 -2 14" stroke="${top}" stroke-width="${S(6)}" fill="none" stroke-linecap="round"/>`);
  } else if (pose === 'talk') {
    g.push(`<g transform="scale(${mirror} 1)"><path d="M${S(7)} ${S(-54)} q9 2 9 -8" stroke="${top}" stroke-width="${S(6)}" fill="none" stroke-linecap="round"/><circle cx="${S(16)}" cy="${S(-64)}" r="${S(3.4)}" fill="${skin}"/></g>`);
    g.push(`<path d="M${S(-8)} ${S(-54)} q-6 6 -4 13" stroke="${top}" stroke-width="${S(6)}" fill="none" stroke-linecap="round"/>`);
  } else if (pose === 'shake') {
    g.push(`<g transform="scale(${mirror} 1)"><path d="M${S(7)} ${S(-53)} q11 1 14 4" stroke="${top}" stroke-width="${S(6)}" fill="none" stroke-linecap="round"/></g>`);
    g.push(`<path d="M${S(-8)} ${S(-53)} q-5 7 -3 13" stroke="${top}" stroke-width="${S(6)}" fill="none" stroke-linecap="round"/>`);
  } else {
    g.push(`<path d="M${S(8)} ${S(-54)} q5 7 3 14" stroke="${top}" stroke-width="${S(6)}" fill="none" stroke-linecap="round"/>`);
    g.push(`<path d="M${S(-8)} ${S(-54)} q-5 7 -3 14" stroke="${top}" stroke-width="${S(6)}" fill="none" stroke-linecap="round"/>`);
  }
  // 首・頭
  g.push(`<rect x="${S(-3)}" y="${S(-62)}" width="${S(6)}" height="${S(7)}" fill="${skin}"/>`);
  g.push(`<circle cx="0" cy="${S(-70)}" r="${S(9.5)}" fill="${skin}"/>`);
  // 髪
  if (hairStyle === 'long') {
    g.push(`<path d="M${S(-10)} ${S(-70)} a10 10 0 0 1 20 0 l1 12 q-4 -6 -3 -12 h-16 q1 6 -3 12 z" fill="${hair}"/>`);
  } else if (hairStyle === 'bun') {
    g.push(`<circle cx="${S(mirror * -9)}" cy="${S(-77)}" r="${S(4)}" fill="${hair}"/>`);
    g.push(`<path d="M${S(-10)} ${S(-71)} a10 10 0 0 1 20 0 q-6 -5 -20 0 z" fill="${hair}"/>`);
  } else {
    g.push(`<path d="M${S(-10)} ${S(-71)} a10 10 0 0 1 20 0 q-6 -6 -20 0 z" fill="${hair}"/>`);
  }
  // 目（向きに合わせて寄せる）
  const eo = dir === 'f' ? 0 : mirror * 2.2;
  g.push(`<circle cx="${S(-3.4 + eo)}" cy="${S(-69)}" r="${S(1.25)}" fill="#1b2430"/><circle cx="${S(3.4 + eo)}" cy="${S(-69)}" r="${S(1.25)}" fill="#1b2430"/>`);
  return g.join('');
}

/* 座り姿勢（椅子とセット。足元原点＝椅子の座面下） */
function humanSit(o) {
  const { skin = '#f6c9a6', hair = '#26303f', top = '#3b82f6', bottom = '#22304a', dir = 'r', h = 1, hairStyle = 'short' } = o;
  const S = (n) => (n * h).toFixed(1);
  const m = dir === 'l' ? -1 : 1;
  const g = [];
  g.push(`<g transform="scale(${m} 1)">`);
  // 太もも＋すね
  g.push(`<path d="M${S(-6)} ${S(-26)} h16 a4 4 0 0 1 0 9 h-6 v17 a4 4 0 0 1 -8 0 z" fill="${bottom}"/>`);
  // 胴
  g.push(`<path d="M${S(-9)} ${S(-52)} q9 -4 17 0 l2 22 q-10 4 -20 0 z" fill="${top}"/>`);
  // 腕（前方の机へ）
  g.push(`<path d="M${S(6)} ${S(-48)} q12 4 14 10" stroke="${top}" stroke-width="${S(6)}" fill="none" stroke-linecap="round"/>`);
  g.push(`<circle cx="${S(21)}" cy="${S(-37)}" r="${S(3.4)}" fill="${skin}"/>`);
  // 首・頭
  g.push(`<rect x="${S(-3)}" y="${S(-58)}" width="${S(6)}" height="${S(7)}" fill="${skin}"/>`);
  g.push(`<circle cx="${S(1)}" cy="${S(-66)}" r="${S(9)}" fill="${skin}"/>`);
  if (hairStyle === 'long') {
    g.push(`<path d="M${S(-9)} ${S(-66)} a9.5 9.5 0 0 1 19 0 l1 11 q-4 -5 -3 -11 h-15 q1 6 -3 11 z" fill="${hair}"/>`);
  } else {
    g.push(`<path d="M${S(-9)} ${S(-67)} a9.5 9.5 0 0 1 19 0 q-6 -6 -19 0 z" fill="${hair}"/>`);
  }
  g.push(`<circle cx="${S(6)}" cy="${S(-65)}" r="${S(1.2)}" fill="#1b2430"/>`);
  g.push(`</g>`);
  return g.join('');
}

/* オフィスチェア（足元原点） */
function chair(col = '#334155', dark = '#1e293b', h = 1) {
  const S = (n) => (n * h).toFixed(1);
  return `<g>
    <path d="M${S(-12)} ${S(-4)} h24" stroke="${dark}" stroke-width="${S(3)}" stroke-linecap="round"/>
    <path d="M0 ${S(-18)} v14" stroke="${dark}" stroke-width="${S(3.5)}"/>
    <rect x="${S(-13)}" y="${S(-24)}" width="26" height="${S(7)}" rx="${S(3)}" fill="${col}"/>
    <rect x="${S(-14)}" y="${S(-52)}" width="${S(9)}" height="${S(30)}" rx="${S(4)}" fill="${col}"/>
  </g>`.replace(/width="26"/, `width="${S(26)}"`);
}
