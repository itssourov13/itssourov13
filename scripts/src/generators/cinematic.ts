import { truncate } from '../util/escape.ts';
import { DARK, f, label, motion, panel, rng, svgDoc, text } from './svg.ts';

/**
 * "After hours" — an original, fully generated night-city frame (neon, wet asphalt, light trails, rain).
 * It is only a stand-in: when `media.cinematic_image` points at a real photo, the README uses that photo and this
 * file is no longer generated. No third-party artwork, game screenshots or logos are used or imitated.
 */
const W = 1200;
const H = 500;
const VPX = 610; // vanishing point
const VPY = 292; // horizon

const C = {
  amber: '#ffb35a',
  warm: '#ffe6bf',
  cyan: '#4fd8ea',
  magenta: '#ff4aa2',
  red: '#ff3b30',
  violet: '#8a5cff',
};

const groundYLeft = (x: number) => VPY + ((VPX - x) / 910) * 208;
const groundYRight = (x: number) => VPY + ((x - VPX) / 910) * 208;
const wallTop = (yg: number) => VPY - (yg - VPY) * 1.9;
const gy = (s: number) => VPY + 208 * s; // ground y at depth s (0 = horizon, 1 = bottom edge)

type Pt = [number, number];
const pathOf = (pts: Pt[]) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;

interface Reflection {
  x: number;
  y: number;
  color: keyof typeof C;
  w: number;
  strength: number;
}

export function renderCinematicScene(): string {
  const reflections: Reflection[] = [];
  const defs =
    `<defs>` +
    `<linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#03040b"/><stop offset=".38" stop-color="#0a0f2b"/><stop offset=".66" stop-color="#2b1547"/><stop offset=".84" stop-color="#82305a"/><stop offset="1" stop-color="#f0974e"/></linearGradient>` +
    `<radialGradient id="hglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb35a" stop-opacity=".85"/><stop offset=".45" stop-color="#ff6a7a" stop-opacity=".28"/><stop offset="1" stop-color="#ff4aa2" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="haze" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff7a6a" stop-opacity="0"/><stop offset="1" stop-color="#ffa860" stop-opacity=".55"/></linearGradient>` +
    `<linearGradient id="road" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2b1c33"/><stop offset=".22" stop-color="#150f20"/><stop offset="1" stop-color="#050509"/></linearGradient>` +
    `<linearGradient id="walk" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2a1a2f"/><stop offset=".3" stop-color="#17101f"/><stop offset="1" stop-color="#07060c"/></linearGradient>` +
    `<linearGradient id="wallL" x1="0" x2="1"><stop offset="0" stop-color="#07060f"/><stop offset=".8" stop-color="#120d25"/><stop offset="1" stop-color="#2a1646"/></linearGradient>` +
    `<linearGradient id="wallR" x1="1" x2="0"><stop offset="0" stop-color="#07060f"/><stop offset=".8" stop-color="#0d1126"/><stop offset="1" stop-color="#1b1a4a"/></linearGradient>` +
    Object.entries(C)
      .map(
        ([k, v]) =>
          `<linearGradient id="rf-${k}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${v}" stop-opacity=".95"/><stop offset=".6" stop-color="${v}" stop-opacity=".25"/><stop offset="1" stop-color="${v}" stop-opacity="0"/></linearGradient>`,
      )
      .join('') +
    `<linearGradient id="trailR" gradientUnits="userSpaceOnUse" x1="0" y1="${VPY}" x2="0" y2="${H + 20}"><stop offset="0" stop-color="${C.red}" stop-opacity="0"/><stop offset=".25" stop-color="${C.red}" stop-opacity=".9"/><stop offset="1" stop-color="${C.magenta}" stop-opacity=".55"/></linearGradient>` +
    `<linearGradient id="trailL" gradientUnits="userSpaceOnUse" x1="0" y1="${VPY}" x2="0" y2="${H + 20}"><stop offset="0" stop-color="${C.warm}" stop-opacity="0"/><stop offset=".25" stop-color="${C.warm}" stop-opacity=".95"/><stop offset="1" stop-color="${C.cyan}" stop-opacity=".5"/></linearGradient>` +
    `<radialGradient id="vig" cx="50%" cy="52%" r="72%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".78"/></radialGradient>` +
    `<linearGradient id="hood" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#14101e"/><stop offset="1" stop-color="#030307"/></linearGradient>` +
    `<linearGradient id="hoodEdge" x1="0" x2="1"><stop offset="0" stop-color="${C.magenta}" stop-opacity="0"/><stop offset=".3" stop-color="${C.amber}" stop-opacity=".55"/><stop offset=".7" stop-color="${C.cyan}" stop-opacity=".55"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/></linearGradient>` +
    `<clipPath id="ground"><path d="M0 ${f(groundYLeft(0))}L${VPX} ${VPY}L${W} ${f(groundYRight(W))}V${H}H0Z"/></clipPath>` +
    `<filter id="glow" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    `<filter id="bloom" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="12"/></filter>` +
    `<filter id="streak" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="4 15"/></filter>` +
    `<filter id="soft" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="1.6"/></filter>` +
    `<filter id="fog" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="18"/></filter>` +
    `<filter id="grain" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>` +
    `</defs>`;

  // ── sky ────────────────────────────────────────────────────────────────────
  let sky = `<rect width="${W}" height="${VPY + 8}" fill="url(#sky)"/>`;
  const rs = rng(4101);
  for (let i = 0; i < 70; i++) {
    sky += `<circle cx="${f(rs() * W)}" cy="${f(rs() * 150)}" r="${f(0.5 + rs() * 0.9)}" fill="#fff" fill-opacity="${f(0.2 + rs() * 0.5)}"/>`;
  }
  sky += `<g filter="url(#fog)" opacity=".5"><ellipse cx="250" cy="196" rx="260" ry="20" fill="#b13c82"/><ellipse cx="930" cy="170" rx="300" ry="18" fill="#5a3bb0"/><ellipse cx="620" cy="232" rx="380" ry="16" fill="#ff7a6a"/></g>`;
  sky += `<ellipse cx="${VPX}" cy="${VPY}" rx="560" ry="130" fill="url(#hglow)"/>`;

  // ── skyline layers ─────────────────────────────────────────────────────────
  const layer = (
    seed: number,
    minW: number,
    maxW: number,
    minH: number,
    maxH: number,
    fill: string,
    lit: number,
    antenna: boolean,
  ) => {
    const r = rng(seed);
    let out = '';
    let wins = '';
    let ants = '';
    let x = -20;
    while (x < W + 20) {
      const w = minW + r() * (maxW - minW);
      const canyon = 0.4 + 0.6 * Math.min(1, Math.abs(x + w / 2 - VPX) / 360);
      const h = (minH + r() * (maxH - minH)) * canyon;
      out += `<rect x="${f(x)}" y="${f(VPY + 2 - h)}" width="${f(w)}" height="${f(h)}" fill="${fill}"/>`;
      if (lit > 0) {
        for (let wy = VPY - h + 10; wy < VPY - 6; wy += 9) {
          for (let wx = x + 5; wx < x + w - 5; wx += 8) {
            if (r() < lit) {
              const col = r() < 0.55 ? '#ffc98a' : r() < 0.6 ? '#7fe6f2' : '#ff86c4';
              wins += `<rect x="${f(wx)}" y="${f(wy)}" width="3" height="4" fill="${col}" fill-opacity="${f(0.35 + r() * 0.5)}"/>`;
            }
          }
        }
      }
      if (antenna && r() < 0.32 && h > 90) {
        const ax = x + w * (0.3 + r() * 0.4);
        ants += `<path d="M${f(ax)} ${f(VPY - h)}V${f(VPY - h - 26 - r() * 20)}" stroke="${fill}" stroke-width="2"/>`;
        ants += `<circle class="beacon" cx="${f(ax)}" cy="${f(VPY - h - 28)}" r="2.2" fill="${C.red}"/>`;
      }
      x += w + r() * 4;
    }
    return out + wins + ants;
  };
  const far = layer(5001, 26, 62, 46, 120, '#1c1236', 0.05, false);
  const mid = layer(5102, 36, 78, 90, 230, '#0d0a21', 0.11, true);

  // ── canyon walls (perspective facades with lit windows + neon) ─────────────
  const wall = (side: 'L' | 'R', seed: number) => {
    const r = rng(seed);
    const x0 = side === 'L' ? 0 : 880;
    const x1 = side === 'L' ? 330 : W;
    const gyAt = side === 'L' ? groundYLeft : groundYRight;
    const edge = side === 'L' ? x1 : x0; // the end nearest to the street
    const facade = pathOf([
      [x0, wallTop(gyAt(x0))],
      [x1, wallTop(gyAt(x1))],
      [x1, gyAt(x1)],
      [x0, gyAt(x0)],
    ]);
    let out = `<path d="${facade}" fill="url(#wall${side})"/>`;
    const Y = (x: number, v: number) => gyAt(x) + (wallTop(gyAt(x)) - gyAt(x)) * v;
    const quad = (xa: number, xb: number, va: number, vb: number): Pt[] => [
      [xa, Y(xa, va)],
      [xb, Y(xb, va)],
      [xb, Y(xb, vb)],
      [xa, Y(xa, vb)],
    ];
    // windows, from the outside edge toward the street (they compress as the wall recedes)
    let x = side === 'L' ? 12 : x1 - 12;
    const dir = side === 'L' ? 1 : -1;
    let unlit = '';
    let lit = '';
    for (let k = 0; k < 17; k++) {
      const prog = Math.abs(x - (side === 'L' ? 0 : W)) / 330;
      const step = (34 - prog * 16) * dir;
      const wdt = step * 0.58;
      for (let v = 0.2; v < 0.93; v += 0.105) {
        const q = quad(Math.min(x, x + wdt), Math.max(x, x + wdt), v, v + 0.062);
        if (r() < 0.3) {
          const col = r() < 0.5 ? '#ffcf8f' : r() < 0.5 ? '#74e4f0' : '#ff7cbf';
          lit += `<path d="${pathOf(q)}" fill="${col}" fill-opacity="${f(0.45 + r() * 0.45)}"/>`;
        } else unlit += `<path d="${pathOf(q)}" fill="#171233" fill-opacity=".7"/>`;
      }
      x += step;
    }
    out += unlit + `<g filter="url(#glow)">${lit}</g>`;
    // floor-level shopfronts + neon tubes
    const shop = (xa: number, xb: number, color: string) =>
      `<path d="${pathOf(quad(xa, xb, 0.0, 0.16))}" fill="${color}" fill-opacity=".5"/>`;
    const tube = (xa: number, xb: number, v: number, color: string, wdt = 0.012) =>
      `<path d="${pathOf(quad(xa, xb, v, v + wdt))}" fill="${color}"/>`;
    let neon = '';
    if (side === 'L') {
      neon += shop(70, 150, '#ffb35a') + shop(200, 262, '#ff6bb5');
      neon += tube(40, 230, 0.34, C.cyan, 0.016) + tube(236, 298, 0.5, C.magenta, 0.014);
      neon += `<path d="${pathOf(quad(268, 276, 0.22, 0.86))}" fill="${C.magenta}"/>`;
      reflections.push(
        { x: 110, y: groundYLeft(110), color: 'amber', w: 34, strength: 0.6 },
        { x: 230, y: groundYLeft(230), color: 'magenta', w: 22, strength: 0.65 },
        { x: 150, y: groundYLeft(150), color: 'cyan', w: 16, strength: 0.4 },
      );
    } else {
      neon += shop(960, 1050, '#4fd8ea') + shop(1090, 1160, '#ffb35a');
      neon += tube(900, 1110, 0.42, C.magenta, 0.016) + tube(1120, 1180, 0.28, C.cyan, 0.014);
      neon += `<path d="${pathOf(quad(930, 938, 0.3, 0.9))}" fill="${C.cyan}"/>`;
      reflections.push(
        { x: 1005, y: groundYRight(1005), color: 'cyan', w: 32, strength: 0.55 },
        { x: 1125, y: groundYRight(1125), color: 'amber', w: 26, strength: 0.55 },
        { x: 934, y: groundYRight(934), color: 'cyan', w: 14, strength: 0.4 },
      );
    }
    // inner edge highlight (rim light from the street glow)
    out += `<g filter="url(#glow)" class="${side === 'L' ? 'flick' : 'flick2'}">${neon}</g>`;
    out += `<path d="M${edge} ${f(wallTop(gyAt(edge)))}V${f(gyAt(edge))}" stroke="${C.amber}" stroke-opacity=".35" stroke-width="2"/>`;
    return out;
  };

  const walls = wall('L', 6001) + wall('R', 6203); // also registers their wet-road reflections

  // ── ground ─────────────────────────────────────────────────────────────────
  const roadL = (s: number) => VPX - 450 * s;
  const roadR = (s: number) => VPX + 450 * s;
  const ground =
    `<path d="M0 ${f(groundYLeft(0))}L${VPX} ${VPY}L${W} ${f(groundYRight(W))}V${H}H0Z" fill="url(#walk)"/>` +
    `<path d="M${VPX} ${VPY}L${f(roadL(1))} ${H}L${f(roadR(1))} ${H}Z" fill="url(#road)"/>` +
    `<ellipse cx="${VPX}" cy="${VPY + 26}" rx="420" ry="42" fill="${C.amber}" fill-opacity=".13" filter="url(#fog)"/>`;

  // lane markings + road edges in perspective
  const lanes = `<path d="M${VPX} ${VPY}L${f(roadL(1))} ${H}" stroke="${C.warm}" stroke-opacity=".28" stroke-width="2"/><path d="M${VPX} ${VPY}L${f(roadR(1))} ${H}" stroke="${C.warm}" stroke-opacity=".28" stroke-width="2"/>`;
  let dashes = '';
  for (let k = 0; k < 9; k++) {
    const s0 = Math.pow((k + 0.2) / 9.5, 2.1);
    const s1 = Math.pow((k + 0.62) / 9.5, 2.1);
    const w0 = 0.8 + 6.5 * s0;
    const w1 = 0.8 + 6.5 * s1;
    dashes += `<path d="${pathOf([
      [VPX - w0, gy(s0)],
      [VPX + w0, gy(s0)],
      [VPX + w1, gy(s1)],
      [VPX - w1, gy(s1)],
    ])}" fill="${C.warm}" fill-opacity="${f(0.55 + s1 * 0.4)}"/>`;
  }

  // ── street lamps ───────────────────────────────────────────────────────────
  let poles = '';
  let lampGlow = '';
  let lampCore = '';
  [0.07, 0.15, 0.27, 0.45, 0.74].forEach((s, i) => {
    for (const side of [-1, 1] as const) {
      const x = VPX + side * 640 * s;
      const yb = gy(s);
      const h = 200 * s + 8;
      const arm = side * -26 * s;
      poles += `<path d="M${f(x)} ${f(yb)}V${f(yb - h)}Q${f(x)} ${f(yb - h - 12 * s)} ${f(x + arm)} ${f(yb - h - 12 * s)}" fill="none" stroke="#05040a" stroke-width="${f(1 + 4.5 * s)}" stroke-linecap="round"/>`;
      const hx = x + arm;
      const hy = yb - h - 12 * s;
      lampGlow += `<circle cx="${f(hx)}" cy="${f(hy)}" r="${f(12 + 46 * s)}" fill="${i % 2 ? C.amber : '#ffc27a'}" fill-opacity="${f(0.5 - s * 0.2)}"/>`;
      lampCore += `<circle cx="${f(hx)}" cy="${f(hy)}" r="${f(1.6 + 6 * s)}" fill="${C.warm}"/>`;
      reflections.push({ x: hx, y: yb, color: 'amber', w: 6 + 40 * s, strength: 0.75 });
    }
  });

  // ── light trails (long exposure) ───────────────────────────────────────────
  let trails = '';
  const rt = rng(777);
  for (let i = 0; i < 6; i++) {
    const endX = 760 + i * 70 + rt() * 40;
    const c1x = 650 + i * 14;
    trails += `<path d="M${VPX + 14 + i * 3} ${VPY + 6}Q${f(c1x + 40)} ${f(VPY + 80)} ${f(endX)} ${H + 20}" fill="none" stroke="url(#trailR)" stroke-width="${f(1.4 + i * 0.7)}" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < 5; i++) {
    const endX = 80 + i * 78 + rt() * 36;
    trails += `<path d="M${VPX - 14 - i * 3} ${VPY + 6}Q${f(560 - i * 12)} ${f(VPY + 80)} ${f(endX)} ${H + 20}" fill="none" stroke="url(#trailL)" stroke-width="${f(1.2 + i * 0.6)}" stroke-linecap="round"/>`;
  }

  // ── car ahead ──────────────────────────────────────────────────────────────
  const cs = 0.2;
  const cx = VPX + 92 * cs * 2.2;
  const cyb = gy(cs);
  const cw = 150 * cs;
  const ch = 54 * cs;
  const car =
    `<path d="M${f(cx - cw / 2)} ${f(cyb)}V${f(cyb - ch * 0.55)}Q${f(cx - cw / 2)} ${f(cyb - ch * 0.7)} ${f(cx - cw * 0.38)} ${f(cyb - ch * 0.74)}L${f(cx - cw * 0.26)} ${f(cyb - ch)}H${f(cx + cw * 0.26)}L${f(cx + cw * 0.38)} ${f(cyb - ch * 0.74)}Q${f(cx + cw / 2)} ${f(cyb - ch * 0.7)} ${f(cx + cw / 2)} ${f(cyb - ch * 0.55)}V${f(cyb)}Z" fill="#050409"/>` +
    `<path d="M${f(cx - cw * 0.24)} ${f(cyb - ch * 0.95)}H${f(cx + cw * 0.24)}L${f(cx + cw * 0.33)} ${f(cyb - ch * 0.74)}H${f(cx - cw * 0.33)}Z" fill="#1a1530"/>`;
  const tail = (dx: number) =>
    `<rect x="${f(cx + dx - 6)}" y="${f(cyb - ch * 0.5)}" width="12" height="4.2" rx="1.6" fill="${C.red}"/>`;
  const brake = `<g class="brake"><ellipse cx="${f(cx)}" cy="${f(cyb - ch * 0.42)}" rx="${f(cw * 0.7)}" ry="16" fill="${C.red}" fill-opacity=".45" filter="url(#bloom)"/></g>`;
  reflections.push(
    { x: cx - cw * 0.34, y: cyb, color: 'red', w: 14, strength: 0.9 },
    { x: cx + cw * 0.34, y: cyb, color: 'red', w: 14, strength: 0.9 },
  );

  // ── reflections on the wet surface (blurred streaks, clipped to the ground) ──
  let refl = '';
  for (const rf of reflections) {
    const len = (H - rf.y) * 0.95 + 24;
    refl += `<rect x="${f(rf.x - rf.w / 2)}" y="${f(rf.y)}" width="${f(rf.w)}" height="${f(len)}" fill="url(#rf-${rf.color})" opacity="${rf.strength}"/>`;
  }

  // ── bokeh + rain ───────────────────────────────────────────────────────────
  const rb = rng(9090);
  let bokeh = '';
  const bokehCols = [C.amber, C.magenta, C.cyan, '#ffd7a0', C.red, C.violet];
  for (let i = 0; i < 22; i++) {
    const x = 280 + rb() * 660;
    const y = VPY - 22 + rb() * 70;
    bokeh += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(4 + rb() * 12)}" fill="${bokehCols[Math.floor(rb() * bokehCols.length)]}" fill-opacity="${f(0.16 + rb() * 0.28)}"/>`;
  }
  for (let i = 0; i < 6; i++) {
    const left = i < 3;
    bokeh += `<circle cx="${f(left ? rb() * 220 : W - rb() * 220)}" cy="${f(380 + rb() * 100)}" r="${f(22 + rb() * 22)}" fill="${bokehCols[Math.floor(rb() * 4)]}" fill-opacity="${f(0.07 + rb() * 0.1)}"/>`;
  }
  const rr = rng(2468);
  const rain = (n: number, op: number, len: number, cls: string) => {
    let g = '';
    for (let i = 0; i < n; i++) {
      const x = -30 + rr() * (W + 60);
      const y = -90 + rr() * (H + 110);
      g += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x - len * 0.22)}" y2="${f(y + len)}" stroke="${C.warm}" stroke-opacity="${f(op * (0.5 + rr() * 0.6))}" stroke-width="${f(0.7 + rr() * 0.7)}"/>`;
    }
    return `<g class="${cls}">${g}</g>`;
  };

  // ── hood / vignette / grain ────────────────────────────────────────────────
  const hood =
    `<path d="M0 ${H}V474Q${W / 2} 452 ${W} 474V${H}Z" fill="url(#hood)"/>` +
    `<path d="M0 474Q${W / 2} 452 ${W} 474" fill="none" stroke="url(#hoodEdge)" stroke-width="2"/>`;

  const css =
    '.beacon{animation:beacon 2.6s steps(1) infinite}.brake{animation:brake 3.2s ease-in-out infinite}' +
    '.flick{animation:flick 7s steps(1) infinite}.flick2{animation:flick 9s steps(1) infinite 2s}' +
    '.rainA{animation:rain .9s linear infinite}.rainB{animation:rain 1.4s linear infinite}' +
    '@keyframes beacon{0%{opacity:1}50%{opacity:.1}}@keyframes brake{0%,100%{opacity:.55}50%{opacity:1}}' +
    '@keyframes flick{0%,100%{opacity:1}91%{opacity:.78}93%{opacity:1}96%{opacity:.86}}' +
    '@keyframes rain{to{transform:translate(-9px,44px)}}';

  const body =
    motion(css) +
    defs +
    sky +
    far +
    mid +
    `<rect y="${VPY - 130}" width="${W}" height="140" fill="url(#haze)"/>` +
    walls +
    ground +
    `<g clip-path="url(#ground)"><g filter="url(#streak)">${refl}</g>` +
    `<g filter="url(#glow)">${dashes}</g>${lanes}` +
    `<g filter="url(#glow)">${trails}</g></g>` +
    poles +
    `<g filter="url(#bloom)">${lampGlow}</g><g filter="url(#glow)">${lampCore}</g>` +
    car +
    `<g filter="url(#glow)">${tail(-cw * 0.34)}${tail(cw * 0.34)}</g>` +
    brake +
    `<g filter="url(#soft)">${bokeh}</g>` +
    rain(70, 0.2, 22, 'rainB') +
    rain(46, 0.3, 34, 'rainA') +
    hood +
    `<rect width="${W}" height="${H}" fill="url(#vig)"/>` +
    `<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".07"/>`;

  return svgDoc(
    W,
    H,
    body,
    'Night city frame (illustration)',
    'An original illustrated night scene: a wet city street with neon signs, street lamps, light trails, rain and a car ahead, under a rose-and-amber horizon.',
  );
}

/** Caption strip that sits under either the generated frame or the visitor's own photo. */
export function renderCinematicCaption(
  title: string,
  caption: string,
  kind: 'illustration' | 'photo',
): string {
  const t = DARK;
  const CW = 1200;
  const CH = 84;
  const tag = kind === 'photo' ? 'PHOTOGRAPH' : 'ILLUSTRATED FRAME';
  const tagW = tag.length * 9.4 + 34;
  const body =
    panel(CW, CH, t).replace(/rx="16"/g, 'rx="0"') +
    `<rect y="0" width="${CW}" height="2" fill="${t.accent}" fill-opacity=".85"/>` +
    label(32, 36, 'Frame 01', t) +
    text(32, 64, truncate(title, 40), { size: 22, weight: 700, fill: t.text }) +
    text(32 + Math.min(title.length, 40) * 13.5 + 36, 64, truncate(caption, 80), {
      size: 17,
      fill: t.muted,
    }) +
    `<rect x="${f(CW - 32 - tagW)}" y="26" width="${f(tagW)}" height="30" rx="15" fill="none" stroke="${t.border}"/>` +
    `<circle cx="${f(CW - 32 - tagW + 18)}" cy="41" r="3.5" fill="${kind === 'photo' ? t.cool : t.accent}"/>` +
    text(CW - 32 - tagW + 30, 46, tag, { size: 12, mono: true, fill: t.muted, spacing: 2 });
  return svgDoc(CW, CH, body, `${title} — caption`, caption);
}
