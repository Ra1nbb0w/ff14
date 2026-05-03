const STORAGE_KEY = "ff14_planner_v3";
const DEFAULT_ICON = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2NCcgaGVpZ2h0PSc2NCc+PHJlY3Qgd2lkdGg9JzY0JyBoZWlnaHQ9JzY0JyByeD0nMTInIGZpbGw9JyM0ZjQ2ZTUnLz48dGV4dCB4PSc1MCUnIHk9JzU2JScgZm9udC1zaXplPScyNicgZmlsbD0nd2hpdGUnIHRleHQtYW5jaG9yPSdtaWRkbGUnPuKaoDwvdGV4dD48L3N2Zz4=";

const state = loadState();
let dragging = null;

const els = Object.fromEntries([...document.querySelectorAll("[id]")].map((el) => [el.id, el]));

init();
function init() { bindTabs(); bindEvents(); renderAll(); }

function bindTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${btn.dataset.tab}`));
  }));
}

function bindEvents() {
  els.plannerJob.addEventListener("change", () => { state.selection.job = els.plannerJob.value; persist(); renderPlanner(); });
  els.plannerEncounter.addEventListener("change", () => { state.selection.encounter = els.plannerEncounter.value; persist(); renderPlanner(); });

  els.jobForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = els.newJobName.value.trim(); if (!name || state.jobs[name]) return;
    state.jobs[name] = { baseGcd: 2.5, skills: [] }; state.selection.job = name; els.newJobName.value = ""; persist(); renderAll();
  });
  els.deleteJob.addEventListener("click", () => {
    const job = els.adminJobSelect.value; if (Object.keys(state.jobs).length <= 1) return setStatus("至少保留一个职业", "warn");
    delete state.jobs[job]; if (state.selection.job === job) state.selection.job = Object.keys(state.jobs)[0]; persist(); renderAll();
  });
  els.adminJobSelect.addEventListener("change", () => { state.selection.job = els.adminJobSelect.value; persist(); renderAll(); });

  els.skillForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const job = state.jobs[els.adminJobSelect.value]; if (!job) return;
    const name = els.skillName.value.trim(); const type = els.skillType.value;
    const gcd = Number(els.skillGcd.value) || job.baseGcd; const cast = Number(els.skillCast.value) || 0;
    const icon = (await readFileAsDataUrl(els.skillIcon.files?.[0])) || DEFAULT_ICON;
    job.skills.push({ id: crypto.randomUUID(), name, type, gcd, cast, icon });
    els.skillForm.reset(); els.skillCast.value = "0"; persist(); renderAll();
  });

  els.encounterForm.addEventListener("submit", (e) => {
    e.preventDefault(); const name = els.encounterName.value.trim(); if (!name || state.encounters[name]) return;
    state.encounters[name] = { events: [] }; state.selection.encounter = name; els.encounterName.value = ""; persist(); renderAll();
  });
  els.deleteEncounter.addEventListener("click", () => {
    const enc = els.encounterSelect.value; if (Object.keys(state.encounters).length <= 1) return setStatus("至少保留一个副本", "warn");
    delete state.encounters[enc]; if (state.selection.encounter === enc) state.selection.encounter = Object.keys(state.encounters)[0]; persist(); renderAll();
  });
  els.encounterSelect.addEventListener("change", () => { state.selection.encounter = els.encounterSelect.value; persist(); renderAll(); });

  els.timelineFileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = els.timelineFile.files?.[0]; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error();
      state.encounters[state.selection.encounter].events = parsed.map((x) => ({ id: crypto.randomUUID(), time: Number(x.time), name: String(x.name) })).filter((x) => !Number.isNaN(x.time) && x.name);
      persist(); renderAll();
    } catch { setStatus("时间轴 JSON 格式错误，应为 [{time, name}]", "warn"); }
  });

  els.eventForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const time = Number(els.eventTime.value); const name = els.eventName.value.trim(); if (Number.isNaN(time) || !name) return;
    state.encounters[state.selection.encounter].events.push({ id: crypto.randomUUID(), time, name });
    persist(); renderAll(); els.eventForm.reset();
  });
}

function renderAll() { renderSelectors(); renderSkillsAdmin(); renderEncounterAdmin(); renderPlanner(); }

function renderSelectors() {
  fillSelect(els.plannerJob, Object.keys(state.jobs), state.selection.job);
  fillSelect(els.adminJobSelect, Object.keys(state.jobs), state.selection.job);
  fillSelect(els.plannerEncounter, Object.keys(state.encounters), state.selection.encounter);
  fillSelect(els.encounterSelect, Object.keys(state.encounters), state.selection.encounter);
}
function fillSelect(el, items, value) { el.innerHTML = items.map((x) => `<option ${x === value ? "selected" : ""}>${x}</option>`).join(""); }

function renderSkillsAdmin() {
  const job = state.jobs[state.selection.job]; els.skillsList.innerHTML = "";
  for (const s of job.skills) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${s.name} · ${s.type.toUpperCase()} · GCD ${s.gcd}s · 咏唱 ${s.cast}s</span>`;
    const b = document.createElement("button"); b.textContent = "删除"; b.className = "danger"; b.type = "button";
    b.onclick = () => { job.skills = job.skills.filter((it) => it.id !== s.id); persist(); renderAll(); };
    li.appendChild(b); els.skillsList.appendChild(li);
  }
}

function renderEncounterAdmin() {
  const enc = state.encounters[state.selection.encounter];
  els.encounterEvents.innerHTML = "";
  enc.events.sort((a,b)=>a.time-b.time).forEach((e) => {
    const li = document.createElement("li"); li.innerHTML = `<span>${fmt(e.time)} · ${e.name}</span>`;
    const d = document.createElement("button"); d.textContent="删除"; d.type="button"; d.className="danger";
    d.onclick = () => { enc.events = enc.events.filter((x) => x.id !== e.id); persist(); renderAll(); };
    li.appendChild(d); els.encounterEvents.appendChild(li);
  });
}

function renderPlanner() {
  const job = state.jobs[state.selection.job]; const encounter = state.encounters[state.selection.encounter];
  renderPalette(els.gcdPalette, job.skills.filter((s) => s.type === "gcd"));
  renderPalette(els.ogcdPalette, job.skills.filter((s) => s.type === "ogcd"));
  els.timeline.innerHTML = "";
  const bar = document.createElement("div"); bar.className = "timeline-bar";
  const sorted = [...encounter.events].sort((a,b)=>a.time-b.time);
  sorted.forEach((event) => {
    const col = document.createElement("div"); col.className = "time-col"; col.style.left = `${event.time * 8}px`;
    col.innerHTML = `<div class='time-label'>${fmt(event.time)}<br/>${event.name}</div>`;
    const gcdLane = makeDropLane(event.time, "gcd");
    const ogcdLane = makeDropLane(event.time, "ogcd");
    col.append(gcdLane, ogcdLane); bar.appendChild(col);
  });
  bar.style.width = `${Math.max(900, (sorted.at(-1)?.time || 120) * 8 + 240)}px`;
  els.timeline.appendChild(bar);
  paintActions();
}

function makeDropLane(time, lane) {
  const laneEl = document.createElement("div"); laneEl.className = `lane ${lane}`; laneEl.dataset.time = time; laneEl.dataset.lane = lane;
  laneEl.addEventListener("dragover", (e) => { e.preventDefault(); laneEl.classList.add("active"); });
  laneEl.addEventListener("dragleave", () => laneEl.classList.remove("active"));
  laneEl.addEventListener("drop", (e) => { e.preventDefault(); laneEl.classList.remove("active"); if (!dragging) return;
    const skill = findSkill(dragging.skillId); if (!skill || skill.type !== lane) return;
    const action = { id: crypto.randomUUID(), skillId: skill.id, time, lane };
    const result = canPlace(action); if (!result.ok) return setStatus(result.reason, "warn");
    state.actions.push(action); persist(); renderPlanner(); setStatus("已放置技能", "ok");
  });
  return laneEl;
}

function paintActions() {
  document.querySelectorAll(".lane").forEach((laneEl) => {
    const time = Number(laneEl.dataset.time); const lane = laneEl.dataset.lane;
    state.actions.filter((a) => a.time === time && a.lane === lane).forEach((a) => {
      const s = findSkill(a.skillId); if (!s) return;
      const chip = document.getElementById("skill-template").content.firstElementChild.cloneNode(true);
      chip.querySelector("img").src = s.icon; chip.querySelector(".label").textContent = s.name;
      chip.addEventListener("dragstart", () => { dragging = { skillId: s.id }; });
      const rm = document.createElement("button"); rm.textContent = "×"; rm.className = "danger"; rm.onclick = () => { state.actions = state.actions.filter((x) => x.id !== a.id); persist(); renderPlanner(); };
      chip.appendChild(rm); laneEl.appendChild(chip);
    });
  });
}

function renderPalette(container, skills) {
  container.innerHTML = "";
  for (const s of skills) {
    const chip = document.getElementById("skill-template").content.firstElementChild.cloneNode(true);
    chip.querySelector("img").src = s.icon; chip.querySelector(".label").textContent = `${s.name} (${s.type === "gcd" ? `${s.gcd}s` : `咏唱${s.cast}s`})`;
    chip.addEventListener("dragstart", () => { dragging = { skillId: s.id }; });
    container.appendChild(chip);
  }
}

function canPlace(action) {
  const skill = findSkill(action.skillId); if (!skill) return { ok: false, reason: "技能不存在" };
  const sameTime = state.actions.filter((a) => a.time === action.time);
  const gcd = sameTime.filter((a) => a.lane === "gcd"); const ogcd = sameTime.filter((a) => a.lane === "ogcd");
  if (action.lane === "gcd" && gcd.length >= 1) return { ok: false, reason: "同一时间点只能放 1 个 GCD" };
  if (action.lane === "ogcd") {
    if (ogcd.length >= 2) return { ok: false, reason: "同一时间点最多 2 个能力技" };
    if (gcd.length < 1) return { ok: false, reason: "能力技必须放在该时间点 GCD 后" };
    if (skill.cast > 0 && ogcd.length >= 1) return { ok: false, reason: "有咏唱时间的能力技同点只允许 1 个" };
  }
  return { ok: true };
}

function findSkill(id) { return Object.values(state.jobs).flatMap((j) => j.skills).find((s) => s.id === id); }
function fmt(seconds) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`; }
function setStatus(msg, level) { els.status.textContent = msg; els.status.className = `status ${level}`; }
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState() {
  const fallback = { selection: { job: "SMN", encounter: "绝欧 P1" }, jobs: { SMN: { baseGcd: 2.45, skills: [{ id: crypto.randomUUID(), name: "毁荡", type: "gcd", gcd: 2.45, cast: 0, icon: DEFAULT_ICON }, { id: crypto.randomUUID(), name: "能量抽取", type: "ogcd", gcd: 2.45, cast: 0, icon: DEFAULT_ICON }] } }, encounters: { "绝欧 P1": { events: [{ id: crypto.randomUUID(), time: 10, name: "开场" }, { id: crypto.randomUUID(), time: 30, name: "大机制" }, { id: crypto.randomUUID(), time: 60, name: "爆发" }] } }, actions: [] };
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
async function readFileAsDataUrl(file) { if (!file) return null; return new Promise((r,j)=>{const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.onerror=()=>j(); fr.readAsDataURL(file);}); }
