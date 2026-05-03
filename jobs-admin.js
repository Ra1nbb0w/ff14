const state = loadState();
const els = Object.fromEntries([...document.querySelectorAll("[id]")].map((el) => [el.id, el]));

init();

function init() {
  bindAuth();
}

function bindAuth() {
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
  els.jobForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = els.newJobName.value.trim();
    if (!name || state.jobs[name]) return;

    state.jobs[name] = { baseGcd: 2.5, skills: [] };
    state.selection.job = name;
    saveState(state);
    els.newJobName.value = "";
    renderAdmin();
  });

  els.adminJobSelect.addEventListener("change", () => {
    state.selection.job = els.adminJobSelect.value;
    saveState(state);
    renderSkills();
  });

  els.deleteJob.addEventListener("click", () => {
    const job = els.adminJobSelect.value;
    if (Object.keys(state.jobs).length <= 1) return;

    delete state.jobs[job];
    if (state.selection.job === job) {
      state.selection.job = Object.keys(state.jobs)[0];
    }

    saveState(state);
    renderAdmin();
  });

  els.skillForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const currentJob = state.jobs[state.selection.job];
    if (!currentJob) return;

    const icon = (await readFileAsDataUrl(els.skillIcon.files?.[0])) || DEFAULT_ICON;
    currentJob.skills.push({
      id: crypto.randomUUID(),
      name: els.skillName.value.trim(),
      type: els.skillType.value,
      gcd: Number(els.skillGcd.value) || currentJob.baseGcd,
      cast: Number(els.skillCast.value) || 0,
      icon,
    });

    saveState(state);
    els.skillForm.reset();
    els.skillCast.value = "0";
    renderSkills();
  });
}

function renderAdmin() {
  fillSelect(els.adminJobSelect, Object.keys(state.jobs), state.selection.job);
  renderSkills();
}

function renderSkills() {
  const job = state.jobs[state.selection.job];
  if (!job) return;

  els.skillsList.innerHTML = "";
  for (const skill of job.skills) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${skill.name} · ${skill.type} · gcd:${skill.gcd} · 咏唱:${skill.cast}</span>`;

    const edit = document.createElement("button");
    edit.textContent = "修改";
    edit.type = "button";
    edit.addEventListener("click", async () => {
      const name = prompt("技能名", skill.name);
      if (!name) return;

      const gcd = Number(prompt("GCD", String(skill.gcd)));
      const cast = Number(prompt("咏唱", String(skill.cast)));
      skill.name = name;
      if (!Number.isNaN(gcd) && gcd > 0) skill.gcd = gcd;
      if (!Number.isNaN(cast) && cast >= 0) skill.cast = cast;

      saveState(state);
      renderSkills();
    });

    const remove = document.createElement("button");
    remove.textContent = "删除";
    remove.type = "button";
    remove.className = "danger";
    remove.addEventListener("click", () => {
      job.skills = job.skills.filter((s) => s.id !== skill.id);
      state.actions = state.actions.filter((a) => a.skillId !== skill.id);
      saveState(state);
      renderSkills();
    });

    li.append(edit, remove);
    els.skillsList.appendChild(li);
  }
}

function fillSelect(el, options, selected) {
  el.innerHTML = "";
  for (const name of options) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    option.selected = name === selected;
    el.appendChild(option);
  }
}
