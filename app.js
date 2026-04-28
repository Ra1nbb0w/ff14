const STORAGE_KEY = "ff14_rotation_planner_v2";
const DEFAULT_ICON =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2NCcgaGVpZ2h0PSc2NCc+PHJlY3Qgd2lkdGg9JzY0JyBoZWlnaHQ9JzY0JyByeD0nMTInIGZpbGw9JyM0ZjQ2ZTUnLz48dGV4dCB4PSc1MCUnIHk9JzU2JScgZm9udC1zaXplPScyNicgZmlsbD0nd2hpdGUnIHRleHQtYW5jaG9yPSdtaWRkbGUnPuKaoDwvdGV4dD48L3N2Zz4=";

const encounterTemplates = {
  "绝欧 P1 示例": [
    { id: crypto.randomUUID(), time: 10, name: "开场读条" },
    { id: crypto.randomUUID(), time: 28, name: "第一次大机制" },
    { id: crypto.randomUUID(), time: 46, name: "连线处理" },
    { id: crypto.randomUUID(), time: 72, name: "爆发窗口" },
  ],
  "零式通用示例": [
    { id: crypto.randomUUID(), time: 15, name: "AOE 预备" },
    { id: crypto.randomUUID(), time: 35, name: "点名分摊" },
    { id: crypto.randomUUID(), time: 58, name: "转场前爆发" },
  ],
};

const state = loadState();

const els = {
  jobSelect: document.getElementById("job-select"),
  skillForm: document.getElementById("skill-form"),
  skillName: document.getElementById("skill-name"),
  skillGcd: document.getElementById("skill-gcd"),
  skillIcon: document.getElementById("skill-icon"),
  skillsManager: document.getElementById("skills-manager"),
  palette: document.getElementById("skill-palette"),
  templateSelect: document.getElementById("encounter-template"),
  loadTemplateBtn: document.getElementById("load-template"),
  eventForm: document.getElementById("event-form"),
  eventTime: document.getElementById("event-time"),
  eventName: document.getElementById("event-name"),
  eventManager: document.getElementById("event-manager"),
  timeline: document.getElementById("planner-timeline"),
  status: document.getElementById("status"),
  clearActions: document.getElementById("clear-actions"),
  exportBtn: document.getElementById("export-btn"),
  importInput: document.getElementById("import-input"),
  skillChipTemplate: document.getElementById("skill-chip-template"),
};

let dragging = null;

init();

function init() {
  renderJobOptions();
  renderTemplateOptions();
  bindEvents();
  renderAll();
}

function bindEvents() {
  els.jobSelect.addEventListener("change", () => {
    state.currentJob = els.jobSelect.value;
    ensureJobSlots();
    persist();
    renderAll();
  });

  els.skillForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = els.skillName.value.trim();
    const gcd = Number(els.skillGcd.value);
    if (!name || Number.isNaN(gcd) || gcd < 0.5) {
      setStatus("技能名和 GCD 不合法。", "warn");
      return;
    }

    const iconData = await readFileAsDataUrl(els.skillIcon.files?.[0]);
    currentSkills().push({ id: crypto.randomUUID(), name, gcd, icon: iconData || DEFAULT_ICON });

    els.skillForm.reset();
    persist();
    renderAll();
    setStatus(`已新增技能：${name}`);
  });

  els.loadTemplateBtn.addEventListener("click", () => {
    const templateName = els.templateSelect.value;
    const template = encounterTemplates[templateName] || [];
    state.encounterEvents = template.map((item) => ({ ...item, id: crypto.randomUUID() }));
    state.actions = state.actions.filter((action) =>
      state.encounterEvents.some((event) => event.time === action.time)
    );

    persist();
    renderAll();
    setStatus(`已加载副本模板：${templateName}`);
  });

  els.eventForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const time = Number(els.eventTime.value);
    const name = els.eventName.value.trim();
    if (Number.isNaN(time) || time < 0 || !name) {
      setStatus("机制点输入不合法。", "warn");
      return;
    }

    state.encounterEvents.push({ id: crypto.randomUUID(), time, name });
    persist();
    renderAll();
    els.eventForm.reset();
  });

  els.clearActions.addEventListener("click", () => {
    state.actions = [];
    persist();
    renderTimeline();
    setStatus("已清空输出轴。", "warn");
  });

  els.exportBtn.addEventListener("click", () => {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ff14-${state.currentJob}-rotation.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  els.importInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const imported = JSON.parse(content);
      if (!imported || typeof imported !== "object") throw new Error("invalid");

      state.currentJob = imported.currentJob || state.currentJob;
      state.jobs = sanitizeJobs(imported.jobs) || state.jobs;
      state.encounterEvents = sanitizeEvents(imported.encounterEvents);
      state.actions = sanitizeActions(imported.actions);

      ensureJobSlots();
      persist();
      renderAll();
      setStatus("导入成功。", "ok");
    } catch {
      setStatus("导入失败：JSON 格式不正确。", "warn");
    } finally {
      els.importInput.value = "";
    }
  });
}

function renderAll() {
  renderJobOptions();
  renderSkillManager();
  renderPalette();
  renderEventManager();
  renderTimeline();
}

function renderJobOptions() {
  ensureJobSlots();
  els.jobSelect.innerHTML = "";

  for (const job of Object.keys(state.jobs)) {
    const option = document.createElement("option");
    option.value = job;
    option.textContent = job;
    option.selected = state.currentJob === job;
    els.jobSelect.appendChild(option);
  }
}

function renderTemplateOptions() {
  els.templateSelect.innerHTML = "";
  for (const name of Object.keys(encounterTemplates)) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    els.templateSelect.appendChild(option);
  }
}

function renderSkillManager() {
  els.skillsManager.innerHTML = "";
  const skills = currentSkills();

  if (skills.length === 0) {
    const li = document.createElement("li");
    li.textContent = "当前职业还没有技能，请先新增。";
    els.skillsManager.appendChild(li);
    return;
  }

  for (const skill of skills) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${skill.name}（GCD ${skill.gcd.toFixed(1)}s）</span>`;

    const right = document.createElement("div");
    right.className = "actions";

    const gcdInput = document.createElement("input");
    gcdInput.type = "number";
    gcdInput.step = "0.1";
    gcdInput.min = "0.5";
    gcdInput.value = skill.gcd;
    gcdInput.style.maxWidth = "88px";
    gcdInput.addEventListener("change", () => {
      const value = Number(gcdInput.value);
      if (Number.isNaN(value) || value < 0.5) {
        gcdInput.value = String(skill.gcd);
        return;
      }

      skill.gcd = value;
      if (!validateAllActions().ok) {
        setStatus("修改后有技能冲突，请调整输出轴。", "warn");
      }
      persist();
      renderTimeline();
      renderPalette();
    });

    const iconInput = document.createElement("input");
    iconInput.type = "file";
    iconInput.accept = "image/*";
    iconInput.addEventListener("change", async () => {
      const data = await readFileAsDataUrl(iconInput.files?.[0]);
      if (!data) return;
      skill.icon = data;
      persist();
      renderPalette();
      renderTimeline();
    });

    const remove = document.createElement("button");
    remove.className = "danger";
    remove.type = "button";
    remove.textContent = "删除";
    remove.addEventListener("click", () => {
      state.jobs[state.currentJob] = skills.filter((s) => s.id !== skill.id);
      state.actions = state.actions.filter((a) => a.skillId !== skill.id);
      persist();
      renderAll();
    });

    right.append(gcdInput, iconInput, remove);
    li.appendChild(right);
    els.skillsManager.appendChild(li);
  }
}

function renderPalette() {
  els.palette.innerHTML = "";
  for (const skill of currentSkills()) {
    const chip = createSkillChip(skill);
    chip.dataset.kind = "skill";
    chip.dataset.skillId = skill.id;
    addDragBehavior(chip, { type: "new-skill", skillId: skill.id });
    els.palette.appendChild(chip);
  }
}

function renderEventManager() {
  els.eventManager.innerHTML = "";
  const sorted = [...state.encounterEvents].sort((a, b) => a.time - b.time);

  for (const event of sorted) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${formatTime(event.time)} · ${event.name}</span>`;

    const wrap = document.createElement("div");
    wrap.className = "actions";

    const shiftInput = document.createElement("input");
    shiftInput.type = "number";
    shiftInput.step = "0.1";
    shiftInput.value = event.time;
    shiftInput.style.maxWidth = "86px";

    const updateBtn = document.createElement("button");
    updateBtn.type = "button";
    updateBtn.textContent = "更新时间";
    updateBtn.addEventListener("click", () => {
      const nextTime = Number(shiftInput.value);
      if (Number.isNaN(nextTime) || nextTime < 0) return;

      state.actions = state.actions.map((action) =>
        action.time === event.time ? { ...action, time: nextTime } : action
      );
      event.time = nextTime;

      const validation = validateAllActions();
      if (!validation.ok) {
        setStatus(validation.reason, "warn");
      }

      persist();
      renderTimeline();
      renderEventManager();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger";
    deleteBtn.textContent = "删除机制点";
    deleteBtn.addEventListener("click", () => {
      state.encounterEvents = state.encounterEvents.filter((e) => e.id !== event.id);
      state.actions = state.actions.filter((a) => a.time !== event.time);
      persist();
      renderAll();
    });

    wrap.append(shiftInput, updateBtn, deleteBtn);
    li.appendChild(wrap);
    els.eventManager.appendChild(li);
  }
}

function renderTimeline() {
  els.timeline.innerHTML = "";
  const events = [...state.encounterEvents].sort((a, b) => a.time - b.time);

  for (const event of events) {
    const row = document.createElement("li");
    row.className = "timeline-row";

    const left = document.createElement("div");
    left.innerHTML = `<div class="time-badge">${formatTime(event.time)}</div><div>${event.name}</div>`;

    const zone = document.createElement("div");
    zone.className = "dropzone";
    zone.dataset.time = String(event.time);
    enableDropzone(zone, event.time);

    const actions = state.actions
      .filter((action) => action.time === event.time)
      .sort((a, b) => a.insertOrder - b.insertOrder);

    for (const action of actions) {
      const skill = currentSkills().find((s) => s.id === action.skillId);
      if (!skill) continue;

      const chip = createSkillChip(skill);
      chip.dataset.kind = "action";
      chip.dataset.actionId = action.id;
      addDragBehavior(chip, { type: "move-action", actionId: action.id });

      const remove = document.createElement("button");
      remove.textContent = "×";
      remove.type = "button";
      remove.className = "danger";
      remove.style.padding = "2px 8px";
      remove.addEventListener("click", () => {
        state.actions = state.actions.filter((a) => a.id !== action.id);
        persist();
        renderTimeline();
      });

      chip.appendChild(remove);
      zone.appendChild(chip);
    }

    row.append(left, zone);
    els.timeline.appendChild(row);
  }

  const valid = validateAllActions();
  if (valid.ok) {
    setStatus("当前输出轴合法：所有技能均满足 GCD 间隔。", "ok");
  } else {
    setStatus(valid.reason, "warn");
  }
}

function createSkillChip(skill) {
  const node = els.skillChipTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector(".icon").src = skill.icon || DEFAULT_ICON;
  node.querySelector(".skill-title").textContent = skill.name;
  node.querySelector(".skill-meta").textContent = `GCD ${skill.gcd.toFixed(1)}s`;
  return node;
}

function addDragBehavior(element, payload) {
  element.addEventListener("dragstart", (event) => {
    dragging = payload;
    event.dataTransfer.effectAllowed = "move";
    element.classList.add("dragging");
  });
  element.addEventListener("dragend", () => {
    element.classList.remove("dragging");
    dragging = null;
  });
}

function enableDropzone(zone, targetTime) {
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("active");
  });

  zone.addEventListener("dragleave", () => zone.classList.remove("active"));

  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("active");
    if (!dragging) return;

    if (dragging.type === "new-skill") {
      const action = {
        id: crypto.randomUUID(),
        skillId: dragging.skillId,
        time: targetTime,
        insertOrder: Date.now(),
      };

      if (!canPlaceAction(action)) return;
      state.actions.push(action);
    }

    if (dragging.type === "move-action") {
      const action = state.actions.find((it) => it.id === dragging.actionId);
      if (!action) return;

      const moved = { ...action, time: targetTime };
      if (!canPlaceAction(moved, action.id)) return;

      action.time = targetTime;
      action.insertOrder = Date.now();
    }

    persist();
    renderTimeline();
  });
}

function canPlaceAction(candidate, ignoreId = null) {
  const merged = [
    ...state.actions.filter((a) => a.id !== ignoreId),
    { ...candidate },
  ].sort((a, b) => a.time - b.time || a.insertOrder - b.insertOrder);

  for (let i = 1; i < merged.length; i += 1) {
    const prev = merged[i - 1];
    const curr = merged[i];
    const prevSkill = findSkill(prev.skillId);
    const currSkill = findSkill(curr.skillId);
    if (!prevSkill || !currSkill) continue;

    const required = Math.max(prevSkill.gcd, currSkill.gcd);
    const delta = curr.time - prev.time;
    if (delta + 1e-8 < required) {
      setStatus(
        `GCD 冲突：${prevSkill.name}(${formatTime(prev.time)}) 到 ${currSkill.name}(${formatTime(
          curr.time
        )}) 间隔 ${delta.toFixed(1)}s，小于 ${required.toFixed(1)}s。`,
        "warn"
      );
      return false;
    }
  }

  return true;
}

function validateAllActions() {
  const sorted = [...state.actions].sort((a, b) => a.time - b.time || a.insertOrder - b.insertOrder);

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevSkill = findSkill(prev.skillId);
    const currSkill = findSkill(curr.skillId);
    if (!prevSkill || !currSkill) {
      return { ok: false, reason: "存在已失效的技能引用，请检查技能库。" };
    }

    const required = Math.max(prevSkill.gcd, currSkill.gcd);
    const delta = curr.time - prev.time;
    if (delta + 1e-8 < required) {
      return {
        ok: false,
        reason: `GCD 冲突：${prevSkill.name}(${formatTime(prev.time)}) -> ${currSkill.name}(${formatTime(
          curr.time
        )}) 需要至少 ${required.toFixed(1)}s。`,
      };
    }
  }

  return { ok: true };
}

function findSkill(skillId) {
  return currentSkills().find((skill) => skill.id === skillId);
}

function currentSkills() {
  ensureJobSlots();
  return state.jobs[state.currentJob];
}

function ensureJobSlots() {
  if (!state.jobs || typeof state.jobs !== "object") {
    state.jobs = {};
  }

  if (!state.jobs.SMN) {
    state.jobs.SMN = [
      { id: crypto.randomUUID(), name: "毁荡", gcd: 2.5, icon: DEFAULT_ICON },
      { id: crypto.randomUUID(), name: "宝石耀", gcd: 2.5, icon: DEFAULT_ICON },
      { id: crypto.randomUUID(), name: "溃烂爆发", gcd: 2.5, icon: DEFAULT_ICON },
    ];
  }

  if (!state.currentJob || !state.jobs[state.currentJob]) {
    state.currentJob = Object.keys(state.jobs)[0];
  }
}

function setStatus(text, level = "ok") {
  els.status.textContent = text;
  els.status.className = `status ${level}`;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();

    const parsed = JSON.parse(raw);
    return {
      currentJob: parsed.currentJob,
      jobs: sanitizeJobs(parsed.jobs) || createDefaultState().jobs,
      encounterEvents: sanitizeEvents(parsed.encounterEvents),
      actions: sanitizeActions(parsed.actions),
    };
  } catch {
    return createDefaultState();
  }
}

function createDefaultState() {
  return {
    currentJob: "SMN",
    jobs: {
      SMN: [
        { id: crypto.randomUUID(), name: "毁荡", gcd: 2.5, icon: DEFAULT_ICON },
        { id: crypto.randomUUID(), name: "宝石耀", gcd: 2.5, icon: DEFAULT_ICON },
      ],
    },
    encounterEvents: encounterTemplates["绝欧 P1 示例"].map((it) => ({ ...it, id: crypto.randomUUID() })),
    actions: [],
  };
}

function sanitizeJobs(input) {
  if (!input || typeof input !== "object") return null;
  const out = {};

  for (const [job, skills] of Object.entries(input)) {
    if (!Array.isArray(skills)) continue;
    out[job] = skills
      .filter((s) => typeof s?.name === "string" && typeof s?.gcd === "number")
      .map((s) => ({
        id: typeof s.id === "string" ? s.id : crypto.randomUUID(),
        name: s.name.trim(),
        gcd: s.gcd,
        icon: typeof s.icon === "string" ? s.icon : DEFAULT_ICON,
      }));
  }

  return Object.keys(out).length > 0 ? out : null;
}

function sanitizeEvents(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((e) => typeof e?.time === "number" && typeof e?.name === "string")
    .map((e) => ({ id: typeof e.id === "string" ? e.id : crypto.randomUUID(), time: e.time, name: e.name }));
}

function sanitizeActions(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((a) => typeof a?.skillId === "string" && typeof a?.time === "number")
    .map((a) => ({
      id: typeof a.id === "string" ? a.id : crypto.randomUUID(),
      skillId: a.skillId,
      time: a.time,
      insertOrder: typeof a.insertOrder === "number" ? a.insertOrder : Date.now(),
    }));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  const d = (seconds % 1).toFixed(1).slice(1);
  return `${m}:${s}${d}`;
}

async function readFileAsDataUrl(file) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => reject(new Error("icon-read-failed"));
    reader.readAsDataURL(file);
  });
}
