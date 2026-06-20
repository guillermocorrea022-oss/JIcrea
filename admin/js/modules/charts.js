// Gráficos simples en SVG (sin librerías). Línea y barras.
import { el, money } from '../ui.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

export function lineChart(data, { height = 220 } = {}) {
  const wrap = el('div', { class: 'chart' });
  if (!data || !data.length) { wrap.appendChild(el('div', { class: 'empty', text: 'Sin datos.' })); return wrap; }
  const W = 720, H = height, pad = 40;
  const ys = data.map(d => d.y);
  const min = Math.min(0, ...ys), max = Math.max(1, ...ys);
  const x = (i) => pad + (i * (W - pad * 2)) / Math.max(1, data.length - 1);
  const y = (v) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  // baseline
  svg.appendChild(svgEl('line', { x1: pad, y1: y(0), x2: W - pad, y2: y(0), class: 'chart__axis' }));
  // path
  const d = data.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.y)}`).join(' ');
  svg.appendChild(svgEl('path', { d, class: 'chart__line' }));
  // area
  svg.appendChild(svgEl('path', { d: `${d} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`, class: 'chart__area' }));
  data.forEach((p, i) => {
    svg.appendChild(svgEl('circle', { cx: x(i), cy: y(p.y), r: 3.5, class: 'chart__dot' }));
    const lbl = svgEl('text', { x: x(i), y: H - 12, class: 'chart__xlabel' }); lbl.textContent = p.x;
    svg.appendChild(lbl);
  });
  wrap.appendChild(svg);
  return wrap;
}

export function barChart(data, { height = 240 } = {}) {
  const wrap = el('div', { class: 'chart' });
  if (!data || !data.length) { wrap.appendChild(el('div', { class: 'empty', text: 'Sin datos.' })); return wrap; }
  const W = 720, H = height, pad = 40;
  const max = Math.max(1, ...data.map(d => d.y));
  const bw = (W - pad * 2) / data.length;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart__svg', preserveAspectRatio: 'xMidYMid meet' });
  data.forEach((p, i) => {
    const h = ((p.y) / max) * (H - pad * 2);
    const bx = pad + i * bw + bw * 0.15;
    svg.appendChild(svgEl('rect', { x: bx, y: H - pad - h, width: bw * 0.7, height: Math.max(0, h), class: 'chart__bar', rx: 3 }));
    const lbl = svgEl('text', { x: pad + i * bw + bw / 2, y: H - 12, class: 'chart__xlabel' }); lbl.textContent = p.x;
    svg.appendChild(lbl);
  });
  wrap.appendChild(svg);
  return wrap;
}
