// GMAT Focus tracker — all tabs, rendering and events.
(function () {
  const { fmtKey, parseKey, addDays, today, fmtNice, fmtShort, weekKeys, monthKeys, monday, daysToCutoff, daysToExam } = D;
  const { SECTIONS } = Score;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const secMeta = (k) => SECTIONS.find((s) => s.key === k) || SECTIONS[0];

  let UI = { tab: "today", date: fmtKey(today()), mockSort: "date", planTab: "quant" };

  // ---- toast ---------------------------------------------------------------
  let toastTimer = null;
  window.toast = (msg) => {
    const t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  };

  // ---- export / import / reset --------------------------------------------
  window.exportBackup = () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gmat-tracker-${fmtKey(today())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  function importBackup(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data || typeof data !== "object") throw new Error("bad file");
        window.S = Object.assign({}, S, data);
        if (!Array.isArray(S.topics)) S.topics = [];
        if (!Array.isArray(S.mocks)) S.mocks = [];
        if (!S.days) S.days = {};
        saveState(); render(); toast("Backup imported ✓");
      } catch (e) { toast("Could not read that file"); }
    };
    r.readAsText(file);
  }

  // =========================================================================
  // TODAY
  // =========================================================================
  function todayView() {
    const key = UI.date;
    const isToday = key === fmtKey(today());
    const d = parseKey(key);
    const tot = Score.dayTotals(key);
    const tgt = Score.dailyTarget(key);
    const score = Score.todayScore(key);
    const dExam = daysToExam(), dCut = daysToCutoff();
    const ov = Score.overall();
    const streak = Score.studyStreak();

    const sessions = Score.daySessions(key).slice().reverse();
    const sessRows = sessions.length ? sessions.map((s) => {
      const t = Score.topicById(s.topicId);
      const acc = s.q ? Math.round((s.correct / s.q) * 100) : 0;
      return `<div class="sess-row">
        <span class="sp-tag" style="background:${secMeta(s.section).color};color:#fff">${esc(secMeta(s.section).short)}</span>
        <div class="sess-name"><b>${esc(t ? t.name : "—")}</b><span class="sp-meta">${s.q} Q · ${s.correct} correct · ${s.mins || 0} min</span></div>
        <span class="sess-acc ${acc >= 75 ? "ok" : acc < 50 ? "low" : ""}">${acc}%</span>
        <button class="del" data-act="del-sess" data-id="${s.id}" title="Delete">✕</button>
      </div>`;
    }).join("") : `<div class="empty">No sessions logged ${isToday ? "today" : "this day"} yet.</div>`;

    // 3-tab "Today's plan": one sub-tab per active section, each with its goal + next topic + a log box
    const activeSecs = SECTIONS.filter((s) => Score.sectionTopics(s.key).length);
    if (!activeSecs.some((s) => s.key === UI.planTab)) UI.planTab = (activeSecs[0] || { key: "quant" }).key;
    const planSec = SECTIONS.find((s) => s.key === UI.planTab) || SECTIONS[0];
    const planSegs = activeSecs.map((s) => `<button class="${s.key === UI.planTab ? "on" : ""}" data-act="plan-tab" data-sec="${s.key}">${esc(s.name)}</button>`).join("");
    const planCur = Score.currentTopic(planSec.key);
    const planGoal = tgt.bySec[planSec.key] || 0;
    const planDone = tot.bySec[planSec.key] || 0;
    const planPct = planGoal ? Math.min(100, Math.round((planDone / planGoal) * 100)) : (planDone > 0 ? 100 : 0);
    const planTopicOpts = Score.sectionTopics(planSec.key).map((t) => {
      const done = Score.topicStats(t).remaining === 0;
      return `<option value="${t.id}" ${planCur && planCur.id === t.id ? "selected" : ""}>${esc(t.name)}${done ? " ✓" : ""}</option>`;
    }).join("");

    const focusTxt = (tgt.focus || []).map((f) => `<b style="color:${f.color}">${esc(f.name)}</b> <span class="muted small">${f.short}</span>`).join(" · ");
    const carry = tgt.deficit > 0 ? ` <span style="color:var(--orange);font-weight:700">+${tgt.deficit} carried over</span>` : "";
    const targetLine = `Aim for <b>${tgt.total} questions</b> today${carry}` + (focusTxt ? ` · focus: ${focusTxt}` : "");

    const flashMsg = (UI.flash && Date.now() < UI.flash.until) ? UI.flash.msg : null;

    return `
    ${Dragon.card(score, flashMsg)}
    <div class="datenav">
      <button class="navbtn" data-act="day-prev">‹</button>
      <span class="when">${fmtNice(d)}</span>
      <button class="navbtn" data-act="day-next">›</button>
      <input type="date" id="dateInput" value="${key}">
      ${isToday ? `<span class="chip work">Today</span>` : `<span class="chip today-link" data-act="day-today">Jump to today</span>`}
    </div>

    <div class="grid cols-3">
      <div class="card scorestrip span-2">
        <div class="ringbox">${Charts.ring(score, { label: isToday ? "Today's target hit" : "Day's target hit", color: "var(--indigo)", sub: `${tot.q}/${tgt.total || "—"} Q` })}</div>
        <div class="catbars">
          <h3>📋 ${isToday ? "Today" : "This day"}</h3>
          <p class="sub">${targetLine}.</p>
          <div class="totals">
            <div class="tot"><div class="num">${tot.q}</div><div class="cap">questions</div></div>
            <div class="tot"><div class="num">${tot.accuracy == null ? "—" : tot.accuracy + "%"}</div><div class="cap">accuracy</div></div>
            <div class="tot"><div class="num">${tot.mins || 0}</div><div class="cap">minutes</div></div>
            <div class="tot"><div class="num">${streak}🔥</div><div class="cap">day streak</div></div>
          </div>
        </div>
      </div>

      <div class="card tint-orange">
        <h3>⏳ Countdown</h3>
        <p class="sub">GMAT on ${fmtShort(parseKey(S.settings.examDate))}.</p>
        <div class="cd-big">${dExam}<span class="cd-unit"> days to exam</span></div>
        <div class="cd-sub">${dCut} actionable days to wrap syllabus + mocks (by ${fmtShort(parseKey(S.settings.sylCutoff))})</div>
        <div class="cd-line"><span>Remaining questions</span><b>${ov.remaining}</b></div>
        <div class="cd-line"><span>Daily goal</span><b>${tgt.total}/day</b></div>
      </div>
    </div>

    <div class="card mt16">
      <h3>🎯 Today's plan</h3>
      <p class="sub">A goal per section — solve the next topic in order, then log what you actually did.</p>
      <div class="seg plan-seg">${planSegs}</div>
      <div class="plan-body">
        <div class="plan-goal">
          <div class="plan-goal-num">${planGoal}<span> questions</span></div>
          <div class="plan-goal-topic">of <b style="color:${planSec.color}">${planCur ? esc(planCur.name) : "all topics done 🎉"}</b> <span class="muted small">${esc(planSec.name)}</span></div>
          <div class="plan-prog"><b>${planDone}</b> / ${planGoal} done today${Charts.bar(planPct, planSec.color)}</div>
        </div>
        <div class="plan-log">
          <label class="lf">Topic<select class="input" id="planTopic">${planTopicOpts}</select></label>
          <div class="plan-inputs">
            <label class="lf">Questions done<input class="input sm" type="number" min="0" id="planQ" placeholder="0"></label>
            <label class="lf">Correct<input class="input sm" type="number" min="0" id="planC" placeholder="0"></label>
            <label class="lf">Minutes<input class="input sm" type="number" min="0" id="planMin" placeholder="0"></label>
            <button class="btn primary" data-act="add-sess">Log</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card mt16">
      <h3>📝 ${isToday ? "Today's" : "Logged"} sessions</h3>
      <div class="sess-list mt8">${sessRows}</div>
    </div>`;
  }

  // =========================================================================
  // SYLLABUS
  // =========================================================================
  function syllabusView() {
    const ov = Score.overall();
    const sections = SECTIONS.map((sec) => {
      const st = Score.sectionStats(sec.key);
      const ts = Score.sectionTopics(sec.key);
      const open = sec.key === "quant" ? "open" : "";
      const rows = ts.length ? ts.map((t) => {
        const s = Score.topicStats(t);
        const accPill = s.accuracy == null ? `<span class="muted">—</span>`
          : `<span class="pill ${s.accuracy >= 75 ? "good" : s.accuracy >= 50 ? "mid" : "low"}">${s.accuracy}%</span>`;
        return `<tr>
          <td><b>${esc(t.name)}</b><div class="small muted">${s.loggedQ} solved · ${s.avgTime == null ? "—" : s.avgTime + " min/Q"}</div></td>
          <td class="num"><input class="tgt-num" type="number" min="1" value="${t.total}" data-act="set-total" data-id="${t.id}"></td>
          <td style="min-width:130px">${Charts.bar(s.pct, sec.color)}<div class="small muted">${s.done}/${t.total} · ${Math.round(s.pct)}%</div></td>
          <td class="num">${s.remaining}</td>
          <td class="num">${accPill}</td>
          <td class="num">${s.remaining > 0 ? s.pace + "/day" : "✓"}</td>
          <td class="num small muted">${s.projected || "—"}</td>
          <td><button class="iconbtn" data-act="del-topic" data-id="${t.id}" title="Delete topic">✕</button></td>
        </tr>`;
      }).join("") : `<tr><td colspan="8" class="empty" style="padding:18px">No topics yet — ${sec.key === "quant" ? "" : "syllabus to be added. "}Add one below.</td></tr>`;
      return `
      <details class="subj" ${open}>
        <summary>
          <span class="subj-name"><span class="dot" style="background:${sec.color}"></span>${esc(sec.name)} <span class="muted small">(${st.topics} topics)</span></span>
          <span class="subj-prog">
            <span class="subj-bar">${Charts.bar(st.pct, sec.color)}</span>
            ${st.done}/${st.total} · ${Math.round(st.pct)}%
            <span class="chev">▾</span>
          </span>
        </summary>
        <div class="subj-body">
          <table class="tbl">
            <thead><tr><th>Topic</th><th>Total Q</th><th>Progress</th><th>Left</th><th>Acc.</th><th>Pace</th><th>ETA</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="addtopic">
            <input class="input" id="newTopic-${sec.key}" placeholder="New ${esc(sec.name)} topic name">
            <input class="input sm" type="number" min="1" id="newTotal-${sec.key}" placeholder="Q" value="25">
            <button class="btn" data-act="add-topic" data-sec="${sec.key}">+ Add topic</button>
          </div>
        </div>
      </details>`;
    }).join("");

    return `
    <div class="card scorestrip">
      <div class="ringbox">${Charts.ring(ov.pct, { label: "Syllabus complete", color: "var(--indigo)", sub: `${ov.done}/${ov.total} Q` })}</div>
      <div class="catbars">
        <h3>📚 Syllabus progress</h3>
        <p class="sub">${ov.done} of ${ov.total} questions done · ${ov.remaining} to go · required pace <b>${ov.pace}/day</b> to finish by ${fmtShort(parseKey(S.settings.sylCutoff))}.</p>
        ${SECTIONS.map((sec) => { const s = Score.sectionStats(sec.key); return `
          <div class="catbar"><span class="nm">${esc(sec.name)}</span>${Charts.bar(s.pct, sec.color)}<span class="pc">${s.done}/${s.total}</span></div>`; }).join("")}
      </div>
    </div>
    <div class="grid mt16" style="gap:12px">${sections}</div>`;
  }

  // =========================================================================
  // MOCKS
  // =========================================================================
  function mocksView() {
    const mocks = S.mocks.slice().sort((a, b) => a.date.localeCompare(b.date));
    const last = mocks[mocks.length - 1];
    const best = mocks.reduce((m, x) => (x.total > (m ? m.total : -1) ? x : m), null);
    const trend = mocks.map((m) => ({ x: fmtShort(parseKey(m.date)), y: m.total }));

    const rows = mocks.slice().reverse().map((m) => `
      <tr>
        <td>${fmtShort(parseKey(m.date))}</td>
        <td><b>${esc(m.name || "Mock")}</b>${m.note ? `<div class="small muted">${esc(m.note)}</div>` : ""}</td>
        <td class="num">${m.quant ?? "—"}</td>
        <td class="num">${m.verbal ?? "—"}</td>
        <td class="num">${m.di ?? "—"}</td>
        <td class="num"><b>${m.total ?? "—"}</b></td>
        <td><button class="iconbtn" data-act="del-mock" data-id="${m.id}">✕</button></td>
      </tr>`).join("");

    return `
    <div class="grid cols-3">
      <div class="card tint-indigo">
        <h3>🎯 Latest mock</h3>
        ${last ? `<div class="cd-big">${last.total}<span class="cd-unit"> /805</span></div>
          <div class="cd-sub">${esc(last.name || "Mock")} · ${fmtShort(parseKey(last.date))}</div>
          <div class="cd-line"><span>Q / V / DI</span><b>${last.quant ?? "—"} / ${last.verbal ?? "—"} / ${last.di ?? "—"}</b></div>`
          : `<p class="sub">No mocks logged yet. Add your first below.</p>`}
      </div>
      <div class="card tint-green">
        <h3>🏆 Best total</h3>
        ${best ? `<div class="cd-big">${best.total}<span class="cd-unit"> /805</span></div><div class="cd-sub">${esc(best.name || "Mock")} · ${fmtShort(parseKey(best.date))}</div>` : `<p class="sub">—</p>`}
        <div class="cd-line"><span>Mocks taken</span><b>${mocks.length}</b></div>
      </div>
      <div class="card">
        <h3>➕ Log a mock</h3>
        <div class="mockform">
          <label class="lf">Date<input class="input sm" type="date" id="mDate" value="${fmtKey(today())}"></label>
          <label class="lf">Name<input class="input" id="mName" placeholder="e.g. Official Mock 1"></label>
          <div class="mock-scores">
            <label class="lf">Quant<input class="input sm" type="number" min="60" max="90" id="mQ" placeholder="60-90"></label>
            <label class="lf">Verbal<input class="input sm" type="number" min="60" max="90" id="mV" placeholder="60-90"></label>
            <label class="lf">Data Ins.<input class="input sm" type="number" min="60" max="90" id="mDI" placeholder="60-90"></label>
            <label class="lf">Total<input class="input sm" type="number" min="205" max="805" id="mTotal" placeholder="205-805"></label>
          </div>
          <input class="input" id="mNote" placeholder="Note (optional)">
          <button class="btn primary" data-act="add-mock">Add mock</button>
        </div>
      </div>
    </div>

    <div class="card mt16">
      <h3>🗓 Mock plan</h3>
      <p class="sub">8 full-length mocks ramping up to the 22 Aug cutoff · 22–30 Aug reserved for review + rest before the exam. A slot ticks off as you log each mock.</p>
      <div class="mockplan mt8">${Score.mockPlanStatus().map((m) => {
        const meta = m.status === "done" ? `<span class="pill good">done ✓</span>`
          : m.status === "next" ? `<span class="pill mid">next${m.inDays >= 0 ? ` · in ${m.inDays}d` : ""}</span>`
          : m.status === "overdue" ? `<span class="pill low">overdue ${-m.inDays}d</span>`
          : `<span class="muted small">in ${m.inDays}d</span>`;
        return `<div class="mp-row ${m.status}"><span class="mp-n">${m.n}</span><div class="mp-name"><b>${esc(m.label)}</b><div class="small muted">${fmtNice(parseKey(m.date))}</div></div>${meta}</div>`;
      }).join("")}</div>
    </div>

    <div class="card mt16">
      <h3>📈 Total score trend</h3>
      <p class="sub">GMAT Focus total, 205–805.</p>
      ${trend.length ? Charts.areaChart(trend.map((p) => ({ x: p.x, y: p.y })), { max: 805, color: "var(--indigo)", id: "mock" }) : `<div class="empty">Log mocks to see the trend.</div>`}
    </div>

    <div class="card mt16">
      <h3>🗂 Mock history</h3>
      ${mocks.length ? `<table class="tbl"><thead><tr><th>Date</th><th>Name</th><th>Q</th><th>V</th><th>DI</th><th>Total</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : `<div class="empty">No mocks yet.</div>`}
    </div>`;
  }

  // =========================================================================
  // DASHBOARD
  // =========================================================================
  function dashboardView() {
    const ov = Score.overall();
    const streak = Score.studyStreak();
    const dCut = daysToCutoff(), dExam = daysToExam();

    // last 30 days of questions
    const last30 = Array.from({ length: 30 }, (_, i) => fmtKey(addDays(today(), -(29 - i))));
    const dailyQ = last30.map((k) => ({ x: fmtShort(parseKey(k)), y: Score.dayTotals(k).q }));
    const maxDaily = Math.max(10, ...dailyQ.map((d) => d.y));

    // section progress bars
    const secBars = SECTIONS.map((sec) => {
      const s = Score.sectionStats(sec.key);
      return `<div class="catbar"><span class="nm">${esc(sec.name)}</span>${Charts.bar(s.pct, sec.color)}<span class="pc">${Math.round(s.pct)}%</span></div>`;
    }).join("");

    // accuracy by topic (topics with >= 5 logged questions), worst first
    const acc = S.topics.map((t) => ({ t, s: Score.topicStats(t) }))
      .filter((x) => x.s.loggedQ >= 5 && x.s.accuracy != null)
      .sort((a, b) => a.s.accuracy - b.s.accuracy);
    const weakRows = acc.slice(0, 8).map((x) => `
      <tr><td><b>${esc(x.t.name)}</b> <span class="small muted">${esc(secMeta(x.t.section).short)}</span></td>
      <td class="num">${x.s.loggedQ}</td>
      <td class="num"><span class="pill ${x.s.accuracy >= 75 ? "good" : x.s.accuracy >= 50 ? "mid" : "low"}">${x.s.accuracy}%</span></td>
      <td style="min-width:120px">${Charts.bar(x.s.accuracy, x.s.accuracy >= 75 ? "var(--green)" : x.s.accuracy >= 50 ? "var(--orange)" : "var(--red)")}</td></tr>`).join("");

    // pace status: recent 7-day daily avg vs required
    const wk = Score.rangeStats(last30.slice(-7));
    const recentPace = Math.round((wk.q / 7) * 10) / 10;
    const onTrack = recentPace >= ov.pace;

    // mock trend mini
    const mockTrend = S.mocks.slice().sort((a, b) => a.date.localeCompare(b.date)).map((m) => ({ x: fmtShort(parseKey(m.date)), y: m.total }));

    // month heatmap of daily questions
    const mk = monthKeys(today());
    const monthMax = Math.max(1, ...mk.map((k) => Score.dayTotals(k).q));
    const firstDow = (parseKey(mk[0]).getDay() + 6) % 7; // Monday-first
    const heatCells = Array.from({ length: firstDow }, () => `<div class="hm-cell" style="visibility:hidden"></div>`)
      .concat(mk.map((k) => {
        const q = Score.dayTotals(k).q;
        const lvl = q === 0 ? 0 : q >= monthMax * 0.75 ? 4 : q >= monthMax * 0.5 ? 3 : q >= monthMax * 0.25 ? 2 : 1;
        const future = k > fmtKey(today());
        const isToday = k === fmtKey(today());
        return `<div class="hm-cell l${lvl} ${future ? "future" : ""} ${isToday ? "is-today" : ""}" title="${k}: ${q} Q">${parseKey(k).getDate()}</div>`;
      })).join("");

    return `
    <div class="grid cols-3">
      <div class="card scorestrip span-2">
        <div class="ringbox">${Charts.ring(ov.pct, { label: "Overall readiness", color: "var(--indigo)", sub: `${ov.done}/${ov.total} Q` })}</div>
        <div class="catbars">
          <h3>📊 Where you stand</h3>
          <p class="sub">Accuracy overall: <b>${ov.accuracy == null ? "—" : ov.accuracy + "%"}</b> · ${Math.round((ov.mins || 0) / 60)}h practiced.</p>
          ${secBars}
        </div>
      </div>
      <div class="card ${onTrack ? "tint-green" : "tint-orange"}">
        <h3>${onTrack ? "✅ On track" : "⚠️ Behind pace"}</h3>
        <p class="sub">Last-7-day pace vs what's needed.</p>
        <div class="cd-big">${recentPace}<span class="cd-unit"> Q/day now</span></div>
        <div class="cd-line"><span>Required pace</span><b>${ov.pace}/day</b></div>
        <div class="cd-line"><span>Days to cutoff</span><b>${dCut}</b></div>
        <div class="cd-line"><span>Days to exam</span><b>${dExam}</b></div>
      </div>
    </div>

    <div class="grid cols-3 mt16">
      <div class="card tint-indigo"><div class="qt-label">Questions done</div><div class="qt-big">${ov.done}<span class="qt-slash"> /${ov.total}</span></div></div>
      <div class="card tint-teal"><div class="qt-label">Overall accuracy</div><div class="qt-big">${ov.accuracy == null ? "—" : ov.accuracy + "%"}</div></div>
      <div class="card tint-pink"><div class="qt-label">Study streak</div><div class="qt-big">${streak}<span class="qt-unit"> days</span></div></div>
    </div>

    <div class="card span-3 mt16">
      <h3>📅 Daily questions — last 30 days</h3>
      ${Charts.areaChart(dailyQ, { max: maxDaily, color: "var(--teal)", id: "dq" })}
    </div>

    <div class="grid cols-2 mt16">
      <div class="card">
        <h3>🎯 Weakest topics by accuracy</h3>
        <p class="sub">Topics with 5+ logged questions, lowest accuracy first.</p>
        ${weakRows ? `<table class="tbl"><thead><tr><th>Topic</th><th>Solved</th><th>Acc.</th><th></th></tr></thead><tbody>${weakRows}</tbody></table>` : `<div class="empty">Log a few sessions to surface weak areas.</div>`}
      </div>
      <div class="card">
        <h3>📈 Mock totals</h3>
        ${mockTrend.length ? Charts.areaChart(mockTrend, { max: 805, color: "var(--indigo)", id: "mk" }) : `<div class="empty">No mocks logged yet.</div>`}
      </div>
    </div>

    <div class="card span-3 mt16">
      <h3>🔥 This month</h3>
      <p class="sub">Daily question volume.</p>
      <div class="hm-head-row">${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<div class="hm-head">${d}</div>`).join("")}</div>
      <div class="heatmap">${heatCells}</div>
    </div>`;
  }

  // =========================================================================
  // REPORTS
  // =========================================================================
  function reportsView() {
    const thisWk = weekKeys(today());
    const lastWk = weekKeys(addDays(today(), -7));
    const tw = Score.rangeStats(thisWk);
    const lw = Score.rangeStats(lastWk);
    const ov = Score.overall();

    const delta = (a, b, unit = "") => {
      const d = a - b;
      if (d === 0) return `<span class="delta-flat">±0${unit}</span>`;
      return d > 0 ? `<span class="delta-up">▲ ${d}${unit}</span>` : `<span class="delta-down">▼ ${Math.abs(d)}${unit}</span>`;
    };

    // completed topics this period
    const completed = S.topics.filter((t) => Score.topicStats(t).remaining === 0 && t.total > 0);

    // wins / improve / focus
    const wins = [];
    if (tw.q > lw.q) wins.push(`Solved ${tw.q} questions — up ${tw.q - lw.q} from last week.`);
    if (tw.accuracy != null && lw.accuracy != null && tw.accuracy > lw.accuracy) wins.push(`Accuracy up to ${tw.accuracy}% (from ${lw.accuracy}%).`);
    if (tw.active >= 5) wins.push(`Studied on ${tw.active} of 7 days.`);
    if (Score.studyStreak() >= 3) wins.push(`${Score.studyStreak()}-day study streak going.`);
    if (!wins.length) wins.push("Log a few sessions this week to build momentum.");

    const improve = [];
    const wk7Pace = Math.round((tw.q / 7) * 10) / 10;
    if (wk7Pace < ov.pace) improve.push(`Current pace ${wk7Pace}/day is below the ${ov.pace}/day needed — close the gap.`);
    if (tw.accuracy != null && tw.accuracy < 60) improve.push(`Accuracy at ${tw.accuracy}% — slow down and review error logs.`);
    if (tw.active < 5) improve.push(`Only ${tw.active} active days this week — aim for 6.`);
    const weak = S.topics.map((t) => ({ t, s: Score.topicStats(t) })).filter((x) => x.s.loggedQ >= 5 && x.s.accuracy != null).sort((a, b) => a.s.accuracy - b.s.accuracy)[0];
    if (weak) improve.push(`Weakest topic: ${weak.t.name} at ${weak.s.accuracy}%.`);
    if (!improve.length) improve.push("On track — keep the routine steady.");

    const focus = [];
    const biggestGap = SECTIONS.map((s) => ({ s, st: Score.sectionStats(s.key) })).filter((x) => x.st.topics > 0).sort((a, b) => b.st.remaining - a.st.remaining)[0];
    if (biggestGap) focus.push(`${biggestGap.s.name}: ${biggestGap.st.remaining} questions left (${biggestGap.st.pace}/day).`);
    if (S.mocks.length === 0 && daysToCutoff() < 45) focus.push(`Schedule your first full-length mock soon.`);
    focus.push(`Wrap syllabus + mocks by ${fmtShort(parseKey(S.settings.sylCutoff))}; ${daysToCutoff()} actionable days left.`);

    return `
    <div class="card">
      <h3>🗓 Weekly report — week of ${fmtShort(monday(today()))}</h3>
      <div class="grid cols-2 mt8">
        <div>
          <div class="statline"><span>Questions solved</span><b>${tw.q} ${delta(tw.q, lw.q)}</b></div>
          <div class="statline"><span>Accuracy</span><b>${tw.accuracy == null ? "—" : tw.accuracy + "%"} ${tw.accuracy != null && lw.accuracy != null ? delta(tw.accuracy, lw.accuracy, "%") : ""}</b></div>
          <div class="statline"><span>Active days</span><b>${tw.active}/7 ${delta(tw.active, lw.active)}</b></div>
          <div class="statline"><span>Time practiced</span><b>${Math.round(tw.mins / 6) / 10}h ${delta(Math.round(tw.mins / 60), Math.round(lw.mins / 60), "h")}</b></div>
        </div>
        <div>
          <div class="statline"><span>Topics completed</span><b>${completed.length}/${S.topics.length}</b></div>
          <div class="statline"><span>Overall progress</span><b>${Math.round(ov.pct)}%</b></div>
          <div class="statline"><span>Remaining questions</span><b>${ov.remaining}</b></div>
          <div class="statline"><span>Required pace</span><b>${ov.pace}/day</b></div>
        </div>
      </div>
      <div class="report-section">
        <h4>🌟 Wins</h4><ul class="cleanlist wins">${wins.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
        <h4>🔧 Areas to improve</h4><ul class="cleanlist improve">${improve.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
        <h4>🎯 Next week focus</h4><ul class="cleanlist focus">${focus.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
      </div>
    </div>`;
  }

  // =========================================================================
  // RENDER + EVENTS
  // =========================================================================
  const views = { today: todayView, syllabus: syllabusView, mocks: mocksView, dashboard: dashboardView, reports: reportsView };
  function render() {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === UI.tab));
    $("#view").innerHTML = (views[UI.tab] || todayView)();
    if (window.Backup) Backup.refresh();
  }
  window.render = render;

  // Briefly override the dragon's bubble (e.g. "Finally… a worthy opponent." on a log),
  // then revert to its state line.
  let flashTimer = null;
  function flashDragon(msg, ms = 3600) {
    UI.flash = { msg, until: Date.now() + ms };
    render();
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { UI.flash = null; if (UI.tab === "today") render(); }, ms + 120);
  }

  function num(id) { const v = parseFloat(($("#" + id) || {}).value); return isNaN(v) ? 0 : v; }
  function val(id) { return (($("#" + id) || {}).value || "").trim(); }

  // delegated clicks
  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (tab) { UI.tab = tab.dataset.tab; render(); return; }
    const act = e.target.closest("[data-act]"); if (!act) return;
    const a = act.dataset.act, id = act.dataset.id;

    if (a === "export") return exportBackup();
    if (a === "import") return $("#importFile").click();
    if (a === "backup") return Backup.state() === "off" ? Backup.link() : Backup.state() === "locked" ? Backup.unlock() : Backup.write(true);
    if (a === "reset") {
      const ans = prompt('This wipes everything. Type DELETE to confirm (a backup will download first):');
      if (ans === "DELETE") { exportBackup(); resetState(); UI.date = fmtKey(today()); render(); toast("Reset done"); }
      return;
    }

    // Today: date nav
    if (a === "day-prev") { UI.date = fmtKey(addDays(parseKey(UI.date), -1)); return render(); }
    if (a === "day-next") { UI.date = fmtKey(addDays(parseKey(UI.date), 1)); return render(); }
    if (a === "day-today") { UI.date = fmtKey(today()); return render(); }

    // Today: switch plan sub-tab (Quant / Verbal / Data Insights)
    if (a === "plan-tab") { UI.planTab = act.dataset.sec; return render(); }

    // Today: add / delete session
    if (a === "add-sess") {
      const topicId = val("planTopic");
      if (!topicId) return toast("Add a topic in Syllabus first");
      const q = Math.round(num("planQ")), correct = Math.min(q, Math.round(num("planC"))), mins = Math.round(num("planMin"));
      if (q <= 0) return toast("Enter how many questions you solved");
      const t = Score.topicById(topicId);
      Score.addSession(UI.date, { section: t.section, topicId, q, correct, mins });
      const slain = Score.todayScore(UI.date) >= 100;
      flashDragon(slain ? "Fakhir won today. 💀" : "Finally… a worthy opponent.");
      toast(`Logged ${q} ${t.name} questions ✓`);
      return;
    }
    if (a === "del-sess") { Score.deleteSession(UI.date, id); render(); return; }

    // Syllabus: add / delete topic
    if (a === "add-topic") {
      const sec = act.dataset.sec;
      const name = val("newTopic-" + sec);
      const total = Math.max(1, Math.round(num("newTotal-" + sec)) || 25);
      if (!name) return toast("Type a topic name");
      const order = Math.max(0, ...S.topics.filter((t) => t.section === sec).map((t) => (t.order || 0) + 1));
      S.topics.push({ id: uid("t"), section: sec, name, total, startDone: 0, order });
      saveState(); render(); toast(`Added ${name} ✓`);
      return;
    }
    if (a === "del-topic") {
      const t = Score.topicById(id);
      if (t && confirm(`Delete "${t.name}"? Logged sessions stay in history but stop counting.`)) {
        S.topics = S.topics.filter((x) => x.id !== id); saveState(); render();
      }
      return;
    }

    // Mocks
    if (a === "add-mock") {
      const date = val("mDate") || fmtKey(today());
      const total = Math.round(num("mTotal"));
      if (!total) return toast("Enter the total score (205–805)");
      Score.addMock({
        date, name: val("mName") || "Mock",
        quant: num("mQ") || null, verbal: num("mV") || null, di: num("mDI") || null,
        total, note: val("mNote") || "",
      });
      render(); toast("Mock logged ✓");
      return;
    }
    if (a === "del-mock") { Score.deleteMock(id); render(); return; }
  });

  // change / input (date picker, topic totals)
  document.addEventListener("change", (e) => {
    if (e.target.id === "dateInput") { UI.date = e.target.value; return render(); }
    const act = e.target.closest("[data-act]");
    if (act && act.dataset.act === "set-total") {
      const t = Score.topicById(act.dataset.id);
      if (t) { t.total = Math.max(1, Math.round(parseFloat(e.target.value) || t.total)); saveState(); render(); }
    }
  });

  // Enter-to-submit in the session form
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (["planQ", "planC", "planMin"].includes(e.target.id)) { e.preventDefault(); document.querySelector('[data-act="add-sess"]')?.click(); }
  });

  $("#importFile").addEventListener("change", (e) => { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ""; });

  render();
})();
