// The Dragon — a boss-fight mascot for the Today tab.
// Its strength is your UN-finished target: 0% progress = full strength + evil gloating,
// 100% progress = slain. It taunts you negatively and weakens as you study.
// Art: a rearing purple wyvern perched on a crag, wing spread, breathing fire (profile, facing right).
(function () {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function state(pct) {
    pct = Math.round(pct);
    if (pct >= 100) return "dead";
    if (pct >= 67) return "critical";
    if (pct >= 34) return "hurt";
    if (pct >= 1) return "scratched";
    return "pristine";
  }

  const LINES = {
    pristine: "Not one question logged? Mwahahaha — I only grow stronger. 🔥",
    scratched: "Pfft. That barely singed my scales.",
    hurt: "Grrr… you actually landed a blow on me.",
    critical: "No… my fire is dying… this is impossible!",
    dead: "Fakhir won today. 💀",
  };
  const line = (pct) => LINES[state(pct)];

  function svg(st) {
    const dead = st === "dead";

    // glowing eye (alive) vs X (dead)
    const eye = dead
      ? `<g stroke="#0c0712" stroke-width="4.5" stroke-linecap="round">
           <line x1="196" y1="64" x2="214" y2="80"/><line x1="214" y1="64" x2="196" y2="80"/>
         </g>`
      : `<g class="d-eye">
           <ellipse cx="205" cy="72" rx="11" ry="8.5" fill="#ffcf3f"/>
           <ellipse cx="205" cy="72" rx="3.4" ry="7.5" fill="#160a12"/>
           <circle cx="207" cy="68" r="1.7" fill="#fff"/>
         </g>`;

    // mouth: clenched grin (alive) vs slack + tongue (dead)
    const mouth = dead
      ? `<path d="M196,94 L258,99 C266,100 268,108 258,113 L256,118 L204,118 C194,118 188,107 193,96 Z" fill="#1d1030"/>
         <path d="M226,116 C223,134 240,141 247,131 C249,121 242,114 240,112 Z" fill="#d65a86"/>`
      : `<path d="M196,93 L259,97 C268,97 270,105 260,110 L256,113 L204,114 C194,114 187,105 192,95 Z" fill="#1d1030"/>
         <g fill="#fff">
           <path d="M206,96 l4,9 4,-9 Z"/><path d="M219,96 l4,10 4,-10 Z"/><path d="M233,97 l3.5,9 3.5,-9 Z"/>
           <path d="M210,110 l4,-8 4,8 Z" fill="#efe2ec"/><path d="M226,111 l3.5,-8 3.5,8 Z" fill="#efe2ec"/>
         </g>`;

    const fire = dead ? "" : `
      <g class="d-fire">
        <path class="f-glow" d="M250,100 C298,84 318,100 322,102 C300,116 296,134 250,124 C272,114 270,108 250,100 Z" fill="#ff4d1f" opacity=".45"/>
        <path class="f-out"  d="M250,100 C292,86 308,100 320,103 C300,114 292,128 252,120 C272,111 270,106 250,100 Z" fill="#ff5a1f"/>
        <path class="f-mid"  d="M253,101 C290,91 302,101 314,103 C300,110 294,121 256,114 C272,107 270,104 253,101 Z" fill="#ffac33"/>
        <path class="f-in"   d="M256,103 C282,96 292,103 304,104 C292,109 288,116 259,111 C270,106 268,104 256,103 Z" fill="#fff1a8"/>
        <circle cx="312" cy="95" r="2.6" fill="#ffb347"/><circle cx="316" cy="110" r="2" fill="#ff7a33"/>
      </g>`;

    return `<svg class="dragon-svg" data-state="${st}" viewBox="0 0 330 250" xmlns="http://www.w3.org/2000/svg" aria-label="Dragon boss">
      <defs>
        <linearGradient id="dgBody" x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0%" stop-color="#6b3f8c"/><stop offset="45%" stop-color="#3a2152"/><stop offset="100%" stop-color="#160c24"/>
        </linearGradient>
        <linearGradient id="dgBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4a2a66"/><stop offset="100%" stop-color="#120a1e"/>
        </linearGradient>
        <linearGradient id="dgBelly" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#caa0e2"/><stop offset="100%" stop-color="#7c4fa0"/>
        </linearGradient>
        <linearGradient id="dgWing" x1="0.1" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="#9b5fc6"/><stop offset="55%" stop-color="#5a3380"/><stop offset="100%" stop-color="#2c1848"/>
        </linearGradient>
        <linearGradient id="dgWingFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3a2154"/><stop offset="100%" stop-color="#160c24"/>
        </linearGradient>
        <linearGradient id="dgHorn" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ead2f4"/><stop offset="100%" stop-color="#7a5d92"/>
        </linearGradient>
        <linearGradient id="dgRock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3c3448"/><stop offset="100%" stop-color="#1b1726"/>
        </linearGradient>
        <radialGradient id="dgAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(255,120,40,.5)"/><stop offset="100%" stop-color="rgba(255,120,40,0)"/>
        </radialGradient>
        <radialGradient id="dgEyeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(255,196,64,.9)"/><stop offset="100%" stop-color="rgba(255,196,64,0)"/>
        </radialGradient>
      </defs>

      <ellipse class="d-aura" cx="225" cy="96" rx="120" ry="92" fill="url(#dgAura)"/>

      <!-- far wing (behind) -->
      <path d="M150,118 L96,44 L120,128 Q134,120 150,128 Z" fill="url(#dgWingFar)" opacity=".9"/>

      <!-- rocky crag (static) -->
      <path d="M0,212 L24,202 L54,208 L92,198 L138,206 L188,199 L240,207 L300,200 L330,206 L330,250 L0,250 Z" fill="url(#dgRock)"/>
      <path d="M36,206 L70,201 L100,206 L96,213 L60,215 Z" fill="#4a4258" opacity=".5"/>
      <path d="M210,209 L250,204 L286,210 L280,217 L236,218 Z" fill="#4a4258" opacity=".4"/>

      <g class="d-body">
        <!-- tail: sweeps behind, curls across the crag to a raised spade -->
        <path d="M70,176 C44,196 64,216 108,216 C164,216 206,212 230,196 C238,191 246,196 244,205 C238,212 230,208 224,204 C202,214 150,220 104,218 C58,216 44,196 58,178 Z" fill="url(#dgBack)"/>
        <path d="M236,196 l16,-9 -3,17 Z" fill="url(#dgHorn)" opacity=".7"/>

        <!-- large near wing, spread up-and-back -->
        <g class="d-wing">
          <path d="M150,116 L74,28 L26,72 Q42,80 40,96 L60,92 Q74,104 72,120 L96,108 Q110,118 108,134 L132,116 Q146,118 150,128 Z" fill="url(#dgWing)"/>
          <path d="M150,116 L74,28 L60,40 L96,108 Z" fill="#ffffff" opacity=".06"/>
          <g stroke="#2a1742" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".85">
            <path d="M150,116 L74,28"/><path d="M150,116 L33,80"/><path d="M150,116 L66,104"/>
            <path d="M150,116 L102,120"/><path d="M150,116 L138,120"/>
          </g>
        </g>

        <!-- hind leg + foot -->
        <path d="M92,176 C78,190 76,204 84,216 L106,216 C102,200 110,188 122,182 Z" fill="url(#dgBack)"/>
        <g fill="#c9aede"><path d="M82,214 l-6,9 9,-2 Z"/><path d="M93,216 l-4,9 7,-3 Z"/><path d="M104,216 l-2,9 6,-4 Z"/></g>

        <!-- haunch -->
        <ellipse cx="108" cy="166" rx="50" ry="44" fill="url(#dgBody)"/>
        <ellipse cx="118" cy="176" rx="30" ry="24" fill="url(#dgBelly)" opacity=".4"/>

        <!-- chest + arched neck -->
        <path d="M136,156 C124,122 128,94 150,78 C164,68 178,66 190,70 C198,84 196,96 186,98 C176,118 180,140 174,158 C162,172 144,172 136,158 Z" fill="url(#dgBody)"/>
        <!-- belly scale rows down the throat/chest -->
        <g fill="none" stroke="#b888d6" stroke-width="1.5" opacity=".55">
          <path d="M150,92 q14,6 24,0"/><path d="M146,108 q16,7 28,0"/><path d="M142,124 q18,7 30,0"/>
          <path d="M140,140 q18,7 30,0"/><path d="M140,156 q16,6 28,0"/>
        </g>

        <!-- spine spikes climbing the back of the neck (graduated) -->
        <g fill="#2f1b45">
          <path d="M134,156 l-15,-3 10,-13 Z"/><path d="M133,138 l-16,-4 11,-13 Z"/>
          <path d="M134,118 l-16,-5 12,-13 Z"/><path d="M138,98 l-15,-7 13,-11 Z"/>
          <path d="M146,80 l-13,-8 13,-9 Z"/><path d="M158,66 l-11,-8 13,-6 Z"/>
        </g>

        <!-- front arm + clawed hand -->
        <path d="M152,150 C160,168 158,192 152,212 L170,212 C174,192 180,168 172,150 Z" fill="url(#dgBody)"/>
        <g fill="#c9aede"><path d="M150,210 l-5,10 8,-3 Z"/><path d="M161,212 l-3,10 7,-4 Z"/><path d="M171,211 l-1,10 6,-5 Z"/></g>

        <!-- horns: swept-back cluster -->
        <path d="M198,46 C186,18 165,4 150,-4 C176,12 208,24 220,44 Z" fill="url(#dgHorn)"/>
        <path d="M212,42 C205,16 188,4 179,-3 C198,10 226,18 232,38 Z" fill="url(#dgHorn)" opacity=".92"/>
        <path d="M188,50 C178,30 164,22 156,16 C172,26 192,32 200,46 Z" fill="url(#dgHorn)" opacity=".8"/>

        <!-- frill behind cheek -->
        <path d="M184,86 C168,80 156,86 152,100 C168,96 178,100 190,106 Z" fill="#2c1844"/>

        <!-- head: skull + snout -->
        <path d="M184,96 C176,72 188,52 210,50 C224,49 236,54 248,62 C256,67 266,74 270,80 C271,86 267,90 259,89 L226,88 L200,90 C192,90 188,94 184,96 Z" fill="url(#dgBody)"/>
        ${mouth}
        <!-- brow ridge -->
        <path d="M188,66 C196,58 210,58 219,65 L214,73 C206,67 195,67 189,73 Z" fill="#241531"/>
        <!-- snout sheen + nostril -->
        <ellipse cx="232" cy="74" rx="18" ry="6" fill="#5a3a77" opacity=".5"/>
        <ellipse cx="260" cy="80" rx="2.6" ry="2" fill="#0e0714"/>
        ${dead ? "" : `<ellipse cx="205" cy="72" rx="16" ry="13" fill="url(#dgEyeGlow)"/>`}
        ${eye}
      </g>

      ${fire}
    </svg>`;
  }

  function card(pct, flash) {
    const st = state(pct);
    const hp = Math.max(0, 100 - Math.round(pct));
    const msg = flash || line(pct);
    return `<div class="dragon-card mood-${st}">
      <div class="dragon-stage">${svg(st)}</div>
      <div class="dragon-info">
        <div class="speech ${flash ? "flash" : ""}">
          <div class="speech-name">🐉 The Dragon ${st === "dead" ? `<span class="slain">— SLAIN</span>` : ""}</div>
          <div class="speech-msg">${esc(msg)}</div>
        </div>
        <div class="hp-row"><span>${st === "dead" ? "Defeated" : "Dragon's strength"}</span><b>${hp}%</b></div>
        <div class="hpbar"><div class="hpbar-fill" style="width:${hp}%"></div></div>
        <div class="dragon-meta">Today's target <b>${Math.round(pct)}%</b> complete · ${st === "dead" ? "boss slain — Fakhir wins! 🗡️" : "defeat the dragon by solving more questions."}</div>
      </div>
    </div>`;
  }

  window.Dragon = { card, line, state, svg };
})();
