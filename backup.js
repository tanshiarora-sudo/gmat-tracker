// On-disk backup: writes the full state to a user-chosen JSON file on every change
// (File System Access API, Chrome/Edge), plus rolling 7-day snapshots as a second net.
(function () {
  const DB = "gmat-backup", STORE = "handles", SNAP_KEY = "gmat-snapshots", LAST_KEY = "gmat-last-backup";
  const supported = !!window.showSaveFilePicker;
  let handle = null, status = supported ? "off" : "unsupported", timer = null;

  // ---- IndexedDB keeps the file handle across visits -----------------------
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function setHandle(h) {
    const db = await idb();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(h, "backup");
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  }
  async function getHandle() {
    const db = await idb();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readonly");
      const rq = tx.objectStore(STORE).get("backup");
      rq.onsuccess = () => res(rq.result || null);
      rq.onerror = () => rej(rq.error);
    });
  }

  async function perm(h, ask) {
    if (!h) return "denied";
    let p = await h.queryPermission({ mode: "readwrite" });
    if (p === "prompt" && ask) p = await h.requestPermission({ mode: "readwrite" });
    return p;
  }

  // ---- writing -------------------------------------------------------------
  async function writeNow() {
    if (status !== "on" || !handle) return;
    try {
      const w = await handle.createWritable();
      await w.write(JSON.stringify(window.S, null, 2));
      await w.close();
      localStorage.setItem(LAST_KEY, new Date().toISOString());
      refresh();
    } catch (e) {
      console.warn("backup write failed", e);
      status = "locked"; refresh();
    }
  }
  function write(immediate) {
    if (status !== "on") return;
    clearTimeout(timer);
    if (immediate) return writeNow();
    timer = setTimeout(writeNow, 1200);
  }

  // ---- rolling snapshots (survive a Reset; live in a separate key) ---------
  function snapshot() {
    try {
      const snaps = JSON.parse(localStorage.getItem(SNAP_KEY) || "{}");
      snaps[new Date().toISOString().slice(0, 10)] = window.S;
      const keep = Object.keys(snaps).sort().slice(-7);
      const out = {};
      keep.forEach((k) => (out[k] = snaps[k]));
      localStorage.setItem(SNAP_KEY, JSON.stringify(out));
    } catch (e) { /* quota or parse issue: snapshots are best-effort */ }
  }
  function latestSnapshot() {
    try {
      const snaps = JSON.parse(localStorage.getItem(SNAP_KEY) || "{}");
      const k = Object.keys(snaps).sort().pop();
      return k ? { date: k, data: snaps[k] } : null;
    } catch (e) { return null; }
  }

  // ---- header button -------------------------------------------------------
  function refresh() {
    const btn = document.getElementById("backupBtn");
    if (!btn) return;
    btn.style.display = "";
    const last = localStorage.getItem(LAST_KEY);
    const ago = last ? new Date(last).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "never";
    if (status === "unsupported") {
      btn.textContent = "Backup: manual";
      btn.title = "Live file backup needs Chrome or Edge. Use Export for manual backups.";
    } else if (status === "off") {
      btn.textContent = "🔗 Link Backup File";
      btn.title = "Pick a JSON file on your Mac; every change will be written to it automatically.";
    } else if (status === "locked") {
      btn.textContent = "🔓 Unlock Backup";
      btn.title = `Backup file is linked but needs permission this session. Last written: ${ago}`;
      btn.style.color = "var(--orange)";
    } else {
      btn.textContent = "🟢 Backup On";
      btn.title = `Auto-writing to your linked file. Click to write now. Last written: ${ago}`;
      btn.style.color = "";
    }
  }

  async function link() {
    const h = await window.showSaveFilePicker({
      suggestedName: "gmat-tracker-backup.json",
      types: [{ description: "JSON backup", accept: { "application/json": [".json"] } }],
    });
    handle = h;
    await setHandle(h);
    status = "on";
    await writeNow();
  }

  async function unlock() {
    const p = await perm(handle, true);
    status = p === "granted" ? "on" : "locked";
    if (status === "on") await writeNow();
    refresh();
  }

  async function init() {
    if (!supported) { refresh(); return; }
    try { handle = await getHandle(); } catch (e) { handle = null; }
    if (handle) {
      const p = await perm(handle, false);
      status = p === "granted" ? "on" : "locked";
      if (status === "on") write(true);
    }
    refresh();
  }

  // ---- periodic auto-export -----------------------------------------------
  const AUTO_KEY = "gmat-last-autoexport", AUTO_DAYS = 3;
  function hasData() {
    const s = window.S || {};
    return Object.keys(s.days || {}).length > 0 || (s.mocks || []).length > 0;
  }
  function autoDue() {
    if (status === "on") return false;                 // live linked file already covers it
    if (!window.exportBackup || !hasData()) return false;
    const last = localStorage.getItem(AUTO_KEY);
    if (!last) return true;
    return (new Date() - new Date(last)) / 86400000 >= AUTO_DAYS;
  }
  function autoExportCheck() {
    if (!autoDue()) return;
    try {
      window.exportBackup();
      localStorage.setItem(AUTO_KEY, new Date().toISOString());
      if (window.toast) window.toast("Auto-backup saved to your Downloads 💾");
    } catch (e) { console.warn("auto-export failed", e); }
  }
  // Wait for the user's first tap/click this session, then run the overdue check once.
  function armAutoExport() {
    let done = false;
    const run = () => {
      if (done) return; done = true;
      document.removeEventListener("pointerdown", run, true);
      document.removeEventListener("keydown", run, true);
      setTimeout(autoExportCheck, 0);
    };
    document.addEventListener("pointerdown", run, true);
    document.addEventListener("keydown", run, true);
  }

  window.Backup = { supported, link, unlock, write, snapshot, latestSnapshot, refresh, state: () => status, autoExportCheck };
  init();
  window.addEventListener("load", () => setTimeout(armAutoExport, 1800));
})();
