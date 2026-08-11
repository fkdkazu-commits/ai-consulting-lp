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

  /* 接地影 */
  const shadow = (x, y, w, d, o = 0.16) =>
    poly([[x, y + d / 2, 0], [x + w / 2, y, 0], [x + w, y + d / 2, 0], [x + w / 2, y + d, 0]],
      `rgba(0,0,0,${o})`, 'filter="url(#soft)"');

  /* アイソメ空間の点を基点に、画面座標でそのまま描く（人物・吹き出しなど立ち物用） */
  const at = (x, y, z, inner, sc = 1) => {
    const [ax, ay] = XY(x, y, z);
    return add(`<g transform="translate(${ax.toFixed(1)} ${ay.toFixed(1)}) scale(${(s / 13 * sc).toFixed(3)})">${inner}</g>`);
  };

  /* 画面上の見え方で置くための座標。u=左右（+で右）／v=奥行き（+で手前＝下）／z=高さ */
  const toXY = (u, v) => [(u + v) / 2, (v - u) / 2];
  const XYuv = (u, v, z = 0) => { const [x, y] = toXY(u, v); return XY(x, y, z); };
  const atUV = (u, v, z, inner, sc = 1) => { const [x, y] = toXY(u, v); return at(x, y, z, inner, sc); };
  const shadowUV = (u, v, w = 2.2, d = 1.6, o = 0.2) => { const [x, y] = toXY(u, v); return shadow(x - w / 2, y - d / 2, w, d, o); };

  return { out, P, XY, XYuv, toXY, add, poly, box, floor, faceL, faceR, faceT, shadow, shadowUV, at, atUV, svg: () => out.join('\n') };
}

/* ── 人物 ────────────────────────────────────
   足元(0,0)原点・身長約80の立ち絵。右向き基準で描き、dir:'l' は左右反転。
   pose: stand / point(指差し) / talk(片手を上げて話す) / shake(握手) / present(手のひらで示す) / type(両手を前へ)
   hairStyle: short / long / bun / cap                                        */
const POSES = {
  stand: { near: [13, -33, 14.5, -44], far: [-13, -33, -14.5, -44] },
  point: { near: [23, -64, 18, -52], far: [-12.5, -33, -14, -44] },
  talk: { near: [18, -59, 17.5, -49], far: [-12.5, -33, -14, -44] },
  shake: { near: [22, -44, 16, -49], far: [-12.5, -33, -14, -44] },
  present: { near: [20, -46, 13.5, -52], far: [-12.5, -33, -14, -44] },
  type: { near: [17, -38, 15, -46], far: [-15, -38, -14, -46] },
};

function human(o) {
  const {
    skin = '#f6c9a6', hair = '#26303f', top = '#3b82f6', bottom = '#22304a', shoe = '#141c29',
    dir = 'f', pose = 'stand', h = 1, hairStyle = 'short'
  } = o;
  const S = (n) => +(n * h).toFixed(2);
  const m = dir === 'l' ? -1 : 1;
  const eo = dir === 'f' ? 0 : 2.6;      // 目の寄せ（半身向き）
  const p = POSES[pose] || POSES.stand;
  const g = [];

  const arm = (sx, [ex, ey, cx, cy]) =>
    `<path d="M${S(sx)} ${S(-52)} Q${S(cx)} ${S(cy)} ${S(ex)} ${S(ey)}" stroke="${top}" stroke-width="${S(6.6)}" fill="none" stroke-linecap="round"/>` +
    `<circle cx="${S(ex)}" cy="${S(ey)}" r="${S(3.9)}" fill="${skin}"/>`;

  g.push(`<g transform="scale(${m} 1)">`);
  g.push(arm(-10.5, p.far));                                                    // 奥の腕
  // 脚と靴
  g.push(`<rect x="${S(-9.4)}" y="${S(-34)}" width="${S(8.2)}" height="${S(31)}" rx="${S(3.6)}" fill="${bottom}"/>`);
  g.push(`<rect x="${S(1.2)}" y="${S(-34)}" width="${S(8.2)}" height="${S(31)}" rx="${S(3.6)}" fill="${bottom}"/>`);
  g.push(`<rect x="${S(-10)}" y="${S(-5.6)}" width="${S(9.4)}" height="${S(5.6)}" rx="${S(2.6)}" fill="${shoe}"/>`);
  g.push(`<rect x="${S(1.8)}" y="${S(-5.6)}" width="${S(9.4)}" height="${S(5.6)}" rx="${S(2.6)}" fill="${shoe}"/>`);
  // 胴
  g.push(`<path d="M${S(-11)} ${S(-55)} q${S(11)} ${S(-4.5)} ${S(22)} 0 l${S(-1.6)} ${S(27)} q${S(-9.4)} ${S(3)} ${S(-18.8)} 0 z" fill="${top}"/>`);
  g.push(arm(10.5, p.near));                                                    // 手前の腕
  // 首・頭
  g.push(`<rect x="${S(-3.6)}" y="${S(-61)}" width="${S(7.2)}" height="${S(7)}" fill="${skin}"/>`);
  g.push(`<circle cx="0" cy="${S(-69)}" r="${S(11)}" fill="${skin}"/>`);
  // 髪
  if (hairStyle !== 'none') {
    if (hairStyle === 'long') {
      // 後頭部側（-x）にだけ髪を下ろす
      g.push(`<path d="M${S(-11.8)} ${S(-72)} q${S(-3.4)} ${S(9)} ${S(-1.6)} ${S(19)} q${S(3.6)} ${S(2.4)} ${S(7.2)} 0 q${S(-1.4)} ${S(-10)} ${S(0.6)} ${S(-19)} z" fill="${hair}"/>`);
    }
    if (hairStyle === 'bun') g.push(`<circle cx="${S(-11)}" cy="${S(-77)}" r="${S(5)}" fill="${hair}"/>`);
    if (hairStyle === 'cap') {
      g.push(`<path d="M${S(-11.6)} ${S(-70)} a${S(11.6)} ${S(11.6)} 0 0 1 ${S(23.2)} 0 z" fill="${top}"/>`);
      g.push(`<path d="M${S(4)} ${S(-70.5)} h${S(13)} a${S(2)} ${S(2)} 0 0 1 0 ${S(3.6)} h${S(-13)} z" fill="${top}"/>`);
    } else {
      g.push(`<path d="M${S(-11.6)} ${S(-69)} a${S(11.6)} ${S(11.6)} 0 0 1 ${S(23.2)} 0 l0 ${S(-1.6)} c${S(-3.4)} ${S(-0.4)} ${S(-5.6)} ${S(-4.4)} ${S(-13.4)} ${S(-3.2)} c${S(-4.6)} ${S(0.7)} ${S(-7)} ${S(2.2)} ${S(-9.8)} ${S(3.2)} z" fill="${hair}"/>`);
    }
  }
  // 目
  g.push(`<circle cx="${S(-3.5 + eo)}" cy="${S(-64.5)}" r="${S(1.5)}" fill="#1b2430"/><circle cx="${S(3.5 + eo)}" cy="${S(-64.5)}" r="${S(1.5)}" fill="#1b2430"/>`);
  g.push(`</g>`);
  return g.join('');
}

/* 着席（椅子とセット・足元原点）。デスクに向かって座る姿勢 */
function humanSit(o) {
  const {
    skin = '#f6c9a6', hair = '#26303f', top = '#3b82f6', bottom = '#22304a', shoe = '#141c29',
    dir = 'r', h = 1, hairStyle = 'short', reach = 1
  } = o;
  const S = (n) => +(n * h).toFixed(2);
  const m = dir === 'l' ? -1 : 1;
  const g = [];
  g.push(`<g transform="scale(${m} 1)">`);
  // 脚（太もも → すね → 靴）。関節を丸端の線でつないで「く」の字を明示する
  g.push(`<path d="M${S(-3)} ${S(-25)} H${S(15)}" stroke="${bottom}" stroke-width="${S(9.4)}" stroke-linecap="round" fill="none"/>`);
  g.push(`<path d="M${S(15)} ${S(-25)} V${S(-7)}" stroke="${bottom}" stroke-width="${S(8.6)}" stroke-linecap="round" fill="none"/>`);
  g.push(`<rect x="${S(9.6)}" y="${S(-5.6)}" width="${S(11.5)}" height="${S(5.6)}" rx="${S(2.6)}" fill="${shoe}"/>`);
  // 胴（やや前傾）
  g.push(`<path d="M${S(-9.5)} ${S(-52)} q${S(11)} ${S(-4.5)} ${S(21)} ${S(1)} l${S(-1.5)} ${S(25)} q${S(-9.4)} ${S(3)} ${S(-18.8)} 0 z" fill="${top}"/>`);
  // 腕（前方の机へ）
  g.push(`<path d="M${S(9)} ${S(-48)} Q${S(15 + 3 * reach)} ${S(-45)} ${S(17 + 5 * reach)} ${S(-35)}" stroke="${top}" stroke-width="${S(6.6)}" fill="none" stroke-linecap="round"/>`);
  g.push(`<circle cx="${S(17 + 5 * reach)}" cy="${S(-35)}" r="${S(3.9)}" fill="${skin}"/>`);
  // 首・頭
  g.push(`<rect x="${S(-2)}" y="${S(-58)}" width="${S(7.2)}" height="${S(7)}" fill="${skin}"/>`);
  g.push(`<circle cx="${S(2)}" cy="${S(-66)}" r="${S(11)}" fill="${skin}"/>`);
  if (hairStyle === 'long') {
    g.push(`<path d="M${S(-10)} ${S(-67)} v${S(16)} q${S(4)} ${S(2)} ${S(4.6)} 0 v${S(-16)} z" fill="${hair}"/>`);
  }
  if (hairStyle === 'bun') g.push(`<circle cx="${S(-9)}" cy="${S(-74)}" r="${S(5)}" fill="${hair}"/>`);
  g.push(`<path d="M${S(-9.6)} ${S(-66)} a${S(11.6)} ${S(11.6)} 0 0 1 ${S(23.2)} 0 l0 ${S(-1.6)} c${S(-3.4)} ${S(-0.4)} ${S(-5.6)} ${S(-4.4)} ${S(-13.4)} ${S(-3.2)} c${S(-4.6)} ${S(0.7)} ${S(-7)} ${S(2.2)} ${S(-9.8)} ${S(3.2)} z" fill="${hair}"/>`);
  g.push(`<circle cx="${S(5)}" cy="${S(-61.5)}" r="${S(1.5)}" fill="#1b2430"/><circle cx="${S(11)}" cy="${S(-61.5)}" r="${S(1.5)}" fill="#1b2430"/>`);
  g.push(`</g>`);
  return g.join('');
}

/* オフィスチェア（足元原点）。dir は座る人と揃える（背もたれが後ろ側に出る） */
function chair(col = '#334155', dark = '#1e293b', h = 1, dir = 'r') {
  const S = (n) => +(n * h).toFixed(2);
  const m = dir === 'l' ? -1 : 1;
  return `<g transform="scale(${m} 1)">
    <path d="M${S(-13)} ${S(-3)} h${S(26)}" stroke="${dark}" stroke-width="${S(3.4)}" stroke-linecap="round"/>
    <circle cx="${S(-13)}" cy="${S(-2)}" r="${S(2.4)}" fill="${dark}"/><circle cx="${S(13)}" cy="${S(-2)}" r="${S(2.4)}" fill="${dark}"/>
    <rect x="${S(-2.2)}" y="${S(-23)}" width="${S(4.4)}" height="${S(20)}" fill="${dark}"/>
    <rect x="${S(-13)}" y="${S(-28)}" width="${S(28)}" height="${S(6)}" rx="${S(3)}" fill="${col}"/>
    <rect x="${S(-19)}" y="${S(-55)}" width="${S(8)}" height="${S(30)}" rx="${S(4)}" fill="${col}"/>
  </g>`;
}
