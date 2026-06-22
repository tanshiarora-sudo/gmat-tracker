// GMAT Focus tracker — state, persistence, date utilities and the pace/scoring engine.
(function () {
  const LS_KEY = "gmat-tracker-v1";

  // 18 Quant topics; the 450-question pool is split evenly to start (editable per topic).
  const QUANT_TOPICS = [
    "Numbers", "Percents", "Profit & Loss", "Averages (incl. weighted)", "Ratio & Proportion",
    "Mixtures", "Speed, Time & Distance", "Time & Work", "Computational", "Interest",
    "Functions", "Permutation & Combination", "Sets", "Statistics & Data Interpretation",
    "Linear Equations", "Quadratic Equations & Polynomials", "Inequalities", "Coordinate Geometry",
  ];

  // Verbal (English) = Critical Reasoning + Reading Comprehension (GMAT Focus has no Sentence Correction).
  const VERBAL_TOPICS = [["Critical Reasoning", 140], ["Reading Comprehension", 120]];
  // Data Insights (logical reasoning + data) = the five DI question types.
  const DI_TOPICS = [
    ["Data Sufficiency", 110], ["Two-Part Analysis", 55], ["Graphics Interpretation", 45],
    ["Multi-Source Reasoning", 45], ["Table Analysis", 45],
  ];

  const PLAN_START = "2026-06-22";  // tracker begins here; earlier day-logs are dropped
  const SYL_CUTOFF = "2026-08-22";  // syllabus + mocks finished by here
  const EXAM_DATE  = "2026-08-30";  // GMAT date
  const QUANT_POOL = 450;

  // 8 full-length mocks, ramping up toward the cutoff; 22-30 Aug left for review + rest.
  const MOCK_PLAN = [
    ["2026-06-29", "Diagnostic"], ["2026-07-13", "Mock 2"], ["2026-07-27", "Mock 3"],
    ["2026-08-03", "Mock 4"], ["2026-08-10", "Mock 5"], ["2026-08-14", "Mock 6"],
    ["2026-08-18", "Mock 7"], ["2026-08-21", "Final mock"],
  ];
  const seedMockPlan = () => MOCK_PLAN.map(([date, label], i) => ({ n: i + 1, date, label }));

  // Sections of the GMAT Focus Edition. Verbal & Data Insights start empty —
  // their syllabus will be added later (the UI lets you add topics any time).
  const SECTIONS = [
    { key: "quant",  name: "Quantitative",  short: "Q",  color: "var(--indigo)", tint: "indigo" },
    { key: "verbal", name: "Verbal",        short: "V",  color: "var(--teal)",   tint: "teal" },
    { key: "di",     name: "Data Insights", short: "DI", color: "var(--purple)", tint: "purple" },
  ];

  function seedTopics() {
    const out = [];
    const per = Math.round(QUANT_POOL / QUANT_TOPICS.length); // 25
    QUANT_TOPICS.forEach((name, i) => out.push({ id: "q" + (i + 1), section: "quant", name, total: per, startDone: 0, order: i }));
    VERBAL_TOPICS.forEach(([name, total], i) => out.push({ id: "v" + (i + 1), section: "verbal", name, total, startDone: 0, order: i }));
    DI_TOPICS.forEach(([name, total], i) => out.push({ id: "d" + (i + 1), section: "di", name, total, startDone: 0, order: i }));
    return out;
  }

  const DEFAULT_STATE = () => ({
    version: 1,
    settings: { planStart: PLAN_START, sylCutoff: SYL_CUTOFF, examDate: EXAM_DATE, quantPool: QUANT_POOL, dailyGoal: 15 },
    topics: seedTopics(),
    days: {},   // key -> { sessions: [ {id, section, topicId, q, correct, mins} ] }
    mocks: [],  // {id, date, name, quant, verbal, di, total, note}
    mockPlan: seedMockPlan(),
    _seq: 1,
  });

  const DEFAULT_DAY = () => ({ sessions: [] });

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const st = Object.assign(DEFAULT_STATE(), JSON.parse(raw));
        st.settings = Object.assign({ planStart: PLAN_START, sylCutoff: SYL_CUTOFF, examDate: EXAM_DATE, quantPool: QUANT_POOL, dailyGoal: 15 }, st.settings || {});
        if (!Array.isArray(st.topics) || !st.topics.length) st.topics = seedTopics();
        if (!Array.isArray(st.mocks)) st.mocks = [];
        if (!Array.isArray(st.mockPlan) || !st.mockPlan.length) st.mockPlan = seedMockPlan();
        let purged = false;
        for (const k of Object.keys(st.days)) { if (k < st.settings.planStart) { delete st.days[k]; purged = true; } }
        st._purged = purged;
        return st;
      }
    } catch (e) { console.warn("state load failed", e); }
    return DEFAULT_STATE();
  }
  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(S));
    if (window.Backup) { Backup.snapshot(); Backup.write(); }
  }

  window.S = load();
  window.PLAN_START = PLAN_START;
  if (S._purged) { delete S._purged; save(); }
  window.saveState = save;
  window.resetState = () => { window.S = DEFAULT_STATE(); save(); };
  window.uid = (p) => (p || "id") + "-" + (S._seq = (S._seq || 1) + 1) + "-" + ((Object.keys(S.days).length * 7 + (S.mocks.length || 0)) % 9973);

  window.getDay = (key, create) => {
    if (!S.days[key] && create) S.days[key] = DEFAULT_DAY();
    const d = S.days[key] || DEFAULT_DAY();
    if (!Array.isArray(d.sessions)) d.sessions = [];
    return d;
  };

  // ---- dates ---------------------------------------------------------------
  const pad = (n) => String(n).padStart(2, "0");
  const fmtKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const monday = (d) => addDays(d, -((d.getDay() + 6) % 7));
  const weekKeys = (d) => { const m = monday(d); return Array.from({ length: 7 }, (_, i) => fmtKey(addDays(m, i))); };
  const monthKeys = (d) => {
    const out = []; const y = d.getFullYear(), m = d.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    for (let i = 1; i <= days; i++) out.push(fmtKey(new Date(y, m, i)));
    return out;
  };
  const today = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
  const fmtNice = (d) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const fmtShort = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
  // Inclusive actionable days from today (or given key) up to and including the cutoff.
  const daysToCutoff = (fromKey) => Math.max(0, daysBetween(fromKey || fmtKey(today()), S.settings.sylCutoff) + 1);
  const daysToExam = (fromKey) => Math.max(0, daysBetween(fromKey || fmtKey(today()), S.settings.examDate));

  window.D = { pad, fmtKey, parseKey, addDays, monday, weekKeys, monthKeys, today, fmtNice, fmtShort, daysBetween, daysToCutoff, daysToExam };

  // ---- topic / section helpers --------------------------------------------
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const rnd = (v) => Math.round(v);

  const topicById = (id) => S.topics.find((t) => t.id === id) || null;
  const sectionTopics = (sec) => S.topics.filter((t) => t.section === sec).sort((a, b) => (a.order || 0) - (b.order || 0));

  // Aggregate logged questions / correct / minutes for a topic across all days.
  function topicLog(id) {
    let q = 0, correct = 0, mins = 0, sessions = 0;
    for (const k in S.days) {
      for (const s of (S.days[k].sessions || [])) {
        if (s.topicId === id) { q += s.q || 0; correct += s.correct || 0; mins += s.mins || 0; sessions++; }
      }
    }
    return { q, correct, mins, sessions };
  }

  function topicStats(t) {
    const lg = topicLog(t.id);
    const done = Math.min(t.total, (t.startDone || 0) + lg.q);
    const pct = t.total ? clamp((done / t.total) * 100) : 0;
    const remaining = Math.max(0, t.total - done);
    const accuracy = lg.q ? rnd((lg.correct / lg.q) * 100) : null;
    const avgTime = lg.q ? Math.round((lg.mins / lg.q) * 10) / 10 : null;
    const dleft = daysToCutoff();
    const pace = remaining === 0 ? 0 : (dleft > 0 ? Math.ceil(remaining / dleft) : remaining);
    // projected finish from last-14-day pace on this topic
    let recent = 0;
    for (let i = 0; i < 14; i++) {
      const k = fmtKey(addDays(today(), -i));
      for (const s of (S.days[k] ? S.days[k].sessions || [] : [])) if (s.topicId === t.id) recent += s.q || 0;
    }
    const avg = recent / 14;
    const projected = remaining === 0 ? "Done" : avg > 0 ? fmtShort(addDays(today(), Math.ceil(remaining / avg))) : null;
    return { done, total: t.total, pct, remaining, accuracy, avgTime, mins: lg.mins, sessions: lg.sessions, loggedQ: lg.q, pace, projected };
  }

  function sectionStats(sec) {
    const ts = sectionTopics(sec);
    let total = 0, done = 0, remaining = 0, q = 0, correct = 0, mins = 0;
    for (const t of ts) {
      const st = topicStats(t);
      total += t.total; done += st.done; remaining += st.remaining;
      const lg = topicLog(t.id); q += lg.q; correct += lg.correct; mins += lg.mins;
    }
    const pct = total ? clamp((done / total) * 100) : 0;
    const accuracy = q ? rnd((correct / q) * 100) : null;
    const dleft = daysToCutoff();
    const pace = remaining === 0 ? 0 : (dleft > 0 ? Math.ceil(remaining / dleft) : remaining);
    return { topics: ts.length, total, done, remaining, pct, accuracy, mins, loggedQ: q, pace, dleft };
  }

  function overall() {
    let total = 0, done = 0, q = 0, correct = 0, mins = 0, remaining = 0;
    for (const sec of SECTIONS) {
      const s = sectionStats(sec.key);
      total += s.total; done += s.done; remaining += s.remaining;
      q += s.loggedQ; mins += s.mins; correct += Math.round((s.accuracy || 0) / 100 * s.loggedQ);
    }
    const pct = total ? clamp((done / total) * 100) : 0;
    const accuracy = q ? rnd((correct / q) * 100) : null;
    const dleft = daysToCutoff();
    const pace = remaining === 0 ? 0 : (dleft > 0 ? Math.ceil(remaining / dleft) : remaining);
    return { total, done, remaining, pct, accuracy, mins, loggedQ: q, pace, dleft };
  }

  // ---- daily sessions ------------------------------------------------------
  function daySessions(key) { return (S.days[key] && S.days[key].sessions) || []; }
  function dayTotals(key) {
    let q = 0, correct = 0, mins = 0; const bySec = {};
    for (const s of daySessions(key)) {
      q += s.q || 0; correct += s.correct || 0; mins += s.mins || 0;
      bySec[s.section] = (bySec[s.section] || 0) + (s.q || 0);
    }
    return { q, correct, mins, accuracy: q ? rnd((correct / q) * 100) : null, bySec };
  }
  function addSession(key, sess) {
    const d = getDay(key, true);
    d.sessions.push(Object.assign({ id: uid("s") }, sess));
    S.days[key] = d;
    save();
  }
  function deleteSession(key, id) {
    const d = getDay(key, false);
    d.sessions = (d.sessions || []).filter((s) => s.id !== id);
    S.days[key] = d;
    save();
  }

  // ---- targets / today's score --------------------------------------------
  // Recommended questions today = sum of each non-empty section's required daily pace.
  // The next unfinished topic in a section, in syllabus order — what to work on now.
  function currentTopic(sec) {
    for (const t of sectionTopics(sec)) if (topicStats(t).remaining > 0) return t;
    return null;
  }
  // One "focus" topic per active section (Quant first, in order).
  function focusTopics() {
    return SECTIONS.map((s) => {
      const t = currentTopic(s.key);
      return t ? { section: s.key, short: s.short, color: s.color, name: t.name } : null;
    }).filter(Boolean);
  }

  // Daily target for a given day. Floor of settings.dailyGoal (15) so the syllabus finishes
  // early (banking time for mocks/revision), PLUS a rollover: a steady dailyGoal/day drumbeat
  // is expected, and any past shortfall is carried onto today (capped so it stays humane).
  function dailyTarget(key) {
    key = key || fmtKey(today());
    let raw = 0; const bySec = {};
    for (const sec of SECTIONS) {
      const s = sectionStats(sec.key);
      if (s.topics > 0 && s.remaining > 0) { bySec[sec.key] = s.pace; raw += s.pace; }
    }
    const dg = S.settings.dailyGoal || 15;
    const base = Math.max(dg, raw);
    if (raw > 0 && base > raw) {
      let acc = 0; const keys = Object.keys(bySec);
      keys.forEach((k, i) => { bySec[k] = i === keys.length - 1 ? base - acc : Math.round(bySec[k] * base / raw); acc += bySec[k]; });
    }
    // rollover deficit = expected (dg per elapsed day) minus what was actually done before today
    const elapsed = Math.max(0, daysBetween(S.settings.planStart, key)); // days strictly before key
    let doneBefore = 0;
    for (const k in S.days) if (k >= S.settings.planStart && k < key) doneBefore += dayTotals(k).q;
    const deficit = Math.max(0, Math.min(45, dg * elapsed - doneBefore));
    return { total: base + deficit, base, deficit, bySec, raw, focus: focusTopics() };
  }
  function todayScore(key) {
    const tot = dayTotals(key);
    const tgt = dailyTarget(key).total;
    if (tgt <= 0) return tot.q > 0 ? 100 : 0;
    return clamp((tot.q / tgt) * 100);
  }

  // questions logged in a date range [keys]
  function rangeQ(keys) { return keys.reduce((a, k) => a + dayTotals(k).q, 0); }
  function rangeStats(keys) {
    let q = 0, correct = 0, mins = 0, active = 0;
    for (const k of keys) { const t = dayTotals(k); q += t.q; correct += t.correct; mins += t.mins; if (t.q > 0) active++; }
    return { q, correct, mins, active, accuracy: q ? rnd((correct / q) * 100) : null };
  }

  // current consecutive-day study streak (questions logged)
  function studyStreak() {
    let streak = 0;
    for (let i = 0; i < 400; i++) {
      const k = fmtKey(addDays(today(), -i));
      if (dayTotals(k).q > 0) streak++;
      else if (i === 0) continue; // today not yet logged doesn't break it
      else break;
    }
    return streak;
  }

  // ---- mocks ---------------------------------------------------------------
  function addMock(m) { S.mocks.push(Object.assign({ id: uid("m") }, m)); S.mocks.sort((a, b) => a.date.localeCompare(b.date)); save(); }
  function deleteMock(id) { S.mocks = S.mocks.filter((m) => m.id !== id); save(); }

  // Plan status: the i-th planned mock is "done" once you've logged that many mocks.
  function mockPlanStatus() {
    const tdy = fmtKey(today());
    const done = S.mocks.length;
    return (S.mockPlan || []).map((m, i) => {
      const status = i < done ? "done" : i === done ? (m.date < tdy ? "overdue" : "next") : "upcoming";
      return Object.assign({}, m, { status, inDays: daysBetween(tdy, m.date) });
    });
  }

  window.Score = {
    SECTIONS, QUANT_POOL, clamp, rnd,
    topicById, sectionTopics, topicLog, topicStats, sectionStats, overall,
    currentTopic, focusTopics,
    daySessions, dayTotals, addSession, deleteSession,
    dailyTarget, todayScore, rangeQ, rangeStats, studyStreak,
    addMock, deleteMock, mockPlanStatus,
  };
})();
