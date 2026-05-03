const state = loadState();
const els = Object.fromEntries([...document.querySelectorAll("[id]")].map((el) => [el.id, el]));

init();

function init() {
  els.authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!verifyAdminPass(els.adminPass.value.trim())) {
      alert("密码错误");
      return;
    }

    els.authCard.classList.add("hidden");
    els.adminContent.classList.remove("hidden");
    bindAdminEvents();
    renderAdmin();
  });
}

function bindAdminEvents() {
  els.encounterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = els.encounterName.value.trim();
    if (!name || state.encounters[name]) return;

    state.encounters[name] = { events: [] };
    state.selection.encounter = name;
    saveState(state);
    els.encounterName.value = "";
    renderAdmin();
  });

  els.encounterSelect.addEventListener("change", () => {
    state.selection.encounter = els.encounterSelect.value;
    saveState(state);
    renderEvents();
  });

  els.deleteEncounter.addEventListener("click", () => {
    const name = els.encounterSelect.value;
    if (Object.keys(state.encounters).length <= 1) return;

    delete state.encounters[name];
    if (state.selection.encounter === name) {
      state.selection.encounter = Object.keys(state.encounters)[0];
    }

    saveState(state);
    renderAdmin();
  });

  els.timelineFileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = els.timelineFile.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("invalid");

      state.encounters[state.selection.encounter].events = parsed
        .map((row) => ({ id: crypto.randomUUID(), time: Number(row.time), name: String(row.name) }))
        .filter((row) => !Number.isNaN(row.time) && row.name);
      saveState(state);
      renderEvents();
    } catch {
      alert("JSON 格式应为 [{time, name}]");
    }
  });

  els.eventForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.encounters[state.selection.encounter].events.push({
      id: crypto.randomUUID(),
      time: Number(els.eventTime.value),
      name: els.eventName.value.trim(),
    });

    saveState(state);
    els.eventForm.reset();
    renderEvents();
  });
}

function renderAdmin() {
  fillSelect(els.encounterSelect, Object.keys(state.encounters), state.selection.encounter);
  renderEvents();
}

function renderEvents() {
  const encounter = state.encounters[state.selection.encounter];
  els.encounterEvents.innerHTML = "";

  for (const event of [...encounter.events].sort((a, b) => a.time - b.time)) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${event.time}s · ${event.name}</span>`;

    const edit = document.createElement("button");
    edit.textContent = "修改";
    edit.type = "button";
    edit.addEventListener("click", () => {
      const time = Number(prompt("时间秒", String(event.time)));
      const name = prompt("机制名", event.name);
      if (!Number.isNaN(time) && time >= 0) event.time = time;
      if (name) event.name = name;
      saveState(state);
      renderEvents();
    });

    const remove = document.createElement("button");
    remove.textContent = "删除";
    remove.type = "button";
    remove.className = "danger";
    remove.addEventListener("click", () => {
      encounter.events = encounter.events.filter((x) => x.id !== event.id);
      saveState(state);
      renderEvents();
    });

    li.append(edit, remove);
    els.encounterEvents.appendChild(li);
  }
}

function fillSelect(el, options, selected) {
  el.innerHTML = "";
  for (const name of options) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    option.selected = selected === name;
    el.appendChild(option);
  }
}
