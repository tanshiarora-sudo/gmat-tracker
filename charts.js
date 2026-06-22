// Tiny dependency-free SVG chart builders. All return HTML strings.
(function () {
  const NS = 'xmlns="http://www.w3.org/2000/svg"';

  function ring(pct, { size = 120, stroke = 11, color = "var(--indigo)", label = "", sub = "" } = {}) {
    const r = (size - stroke) / 2, c = size / 2, circ = 2 * Math.PI * r;
    const off = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return `<svg ${NS} width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="ring">
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/>
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
        stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}"
        transform="rotate(-90 ${c} ${c})" style="transition:stroke-dashoffset .6s ease"/>
      <text x="${c}" y="${c - (sub ? 4 : 0)}" text-anchor="middle" dominant-baseline="central"
        font-size="${size / 4.6}" font-weight="700" fill="var(--ink)">${Math.round(pct)}%</text>
      ${sub ? `<text x="${c}" y="${c + size / 5.4}" text-anchor="middle" font-size="${size / 11}" fill="var(--muted)">${sub}</text>` : ""}
    </svg>${label ? `<div class="ring-label">${label}</div>` : ""}`;
  }

  // values: [{x label, y 0-100}]
  function areaChart(values, { w = 640, h = 180, color = "var(--indigo)", id = "ac", max = 100 } = {}) {
    if (!values.length) return `<div class="empty">No data yet</div>`;
    const padL = 30, padB = 22, padT = 10, padR = 8;
    const iw = w - padL - padR, ih = h - padT - padB;
    const px = (i) => padL + (values.length === 1 ? iw / 2 : (i / (values.length - 1)) * iw);
    const py = (v) => padT + ih * (1 - v / max);
    let path = "", area = "";
    values.forEach((v, i) => {
      const cmd = i === 0 ? "M" : "L";
      path += `${cmd}${px(i).toFixed(1)},${py(v.y).toFixed(1)}`;
    });
    area = path + `L${px(values.length - 1).toFixed(1)},${py(0)}L${px(0).toFixed(1)},${py(0)}Z`;
    const grid = [0, 0.25, 0.5, 0.75, 1].map((g) =>
      `<line x1="${padL}" y1="${py(max * g)}" x2="${w - padR}" y2="${py(max * g)}" stroke="var(--grid)" stroke-width="1"/>
       <text x="${padL - 6}" y="${py(max * g) + 3}" text-anchor="end" font-size="9" fill="var(--muted)">${Math.round(max * g)}</text>`).join("");
    const step = Math.max(1, Math.ceil(values.length / 15));
    const labels = values.map((v, i) => i % step ? "" :
      `<text x="${px(i)}" y="${h - 6}" text-anchor="middle" font-size="9" fill="var(--muted)">${v.x}</text>`).join("");
    const dots = values.map((v, i) =>
      `<circle cx="${px(i)}" cy="${py(v.y)}" r="2.6" fill="#fff" stroke="${color}" stroke-width="1.6"/>`).join("");
    return `<svg ${NS} viewBox="0 0 ${w} ${h}" class="chart">
      <defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity=".30"/>
        <stop offset="100%" stop-color="${color}" stop-opacity=".02"/></linearGradient></defs>
      ${grid}<path d="${area}" fill="url(#${id}g)"/>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>${dots}${labels}</svg>`;
  }

  function barChart(values, { w = 640, h = 180, color = "var(--teal)", max = null } = {}) {
    if (!values.length) return `<div class="empty">No data yet</div>`;
    const padL = 30, padB = 22, padT = 10, padR = 8;
    const iw = w - padL - padR, ih = h - padT - padB;
    const mx = max || Math.max(10, ...values.map((v) => v.y));
    const bw = Math.min(56, (iw / values.length) * 0.55);
    const px = (i) => padL + ((i + 0.5) / values.length) * iw;
    const py = (v) => padT + ih * (1 - v / mx);
    const grid = [0, 0.5, 1].map((g) =>
      `<line x1="${padL}" y1="${py(mx * g)}" x2="${w - padR}" y2="${py(mx * g)}" stroke="var(--grid)"/>
       <text x="${padL - 6}" y="${py(mx * g) + 3}" text-anchor="end" font-size="9" fill="var(--muted)">${Math.round(mx * g)}</text>`).join("");
    const bars = values.map((v, i) =>
      `<rect x="${px(i) - bw / 2}" y="${py(v.y)}" width="${bw}" height="${Math.max(0, py(0) - py(v.y))}" rx="7" fill="${v.color || color}" opacity=".85"/>
       <text x="${px(i)}" y="${h - 6}" text-anchor="middle" font-size="9.5" fill="var(--muted)">${v.x}</text>`).join("");
    return `<svg ${NS} viewBox="0 0 ${w} ${h}" class="chart">${grid}${bars}</svg>`;
  }

  // n-axis radar, values 0-100
  function radar(values, labels, { size = 230, color = "var(--teal)" } = {}) {
    const c = size / 2, R = size / 2 - 34, n = values.length;
    const pt = (i, r) => {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2;
      return [c + r * Math.cos(a), c + r * Math.sin(a)];
    };
    let webs = "";
    for (let ringI = 1; ringI <= 4; ringI++) {
      const r = (R * ringI) / 4;
      const pts = Array.from({ length: n }, (_, i) => pt(i, r).map((x) => x.toFixed(1)).join(",")).join(" ");
      webs += `<polygon points="${pts}" fill="none" stroke="var(--grid)"/>`;
    }
    const spokes = Array.from({ length: n }, (_, i) => {
      const [x, y] = pt(i, R);
      return `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="var(--grid)"/>`;
    }).join("");
    const lab = labels.map((L, i) => {
      const [x, y] = pt(i, R + 16);
      return `<text x="${x}" y="${y + 3}" text-anchor="middle" font-size="10" fill="var(--muted)">${L}</text>`;
    }).join("");
    const poly = values.map((v, i) => pt(i, (R * Math.max(2, v)) / 100).map((x) => x.toFixed(1)).join(",")).join(" ");
    return `<svg ${NS} viewBox="0 0 ${size} ${size}" class="chart radar">${webs}${spokes}
      <polygon points="${poly}" fill="${color}" fill-opacity=".18" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>${lab}</svg>`;
  }

  function bar(pct, color) {
    return `<div class="hbar"><div class="hbar-fill" style="width:${Math.max(0, Math.min(100, pct))}%;background:${color}"></div></div>`;
  }

  window.Charts = { ring, areaChart, barChart, radar, bar };
})();
