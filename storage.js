const STORAGE_KEY = "ff14_planner_v5";
const ADMIN_PASS_KEY = "ff14_admin_pass";
const DEFAULT_ADMIN_PASS = "ff14admin";
const DEFAULT_ICON =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2NCcgaGVpZ2h0PSc2NCc+PHJlY3Qgd2lkdGg9JzY0JyBoZWlnaHQ9JzY0JyByeD0nMTInIGZpbGw9JyM0ZjQ2ZTUnLz48dGV4dCB4PSc1MCUnIHk9JzU2JScgZm9udC1zaXplPScyNicgZmlsbD0nd2hpdGUnIHRleHQtYW5jaG9yPSdtaWRkbGUnPuKaoDwvdGV4dD48L3N2Zz4=";

function defaultState() {
  return {
    selection: { job: "SMN", encounter: "绝欧 P1" },
    jobs: {
      SMN: {
        baseGcd: 2.45,
        skills: [
          { id: crypto.randomUUID(), name: "毁荡", type: "gcd", gcd: 2.45, cast: 0, icon: DEFAULT_ICON },
          { id: crypto.randomUUID(), name: "能量抽取", type: "ogcd", gcd: 2.45, cast: 0, icon: DEFAULT_ICON },
        ],
      },
    },
    encounters: {
      "绝欧 P1": {
        events: [
          { id: crypto.randomUUID(), time: 10, name: "开场" },
          { id: crypto.randomUUID(), time: 30, name: "大机制" },
          { id: crypto.randomUUID(), time: 60, name: "爆发" },
        ],
      },
    },
    actions: [],
  };
}

function ensureAdminPass() {
  if (!localStorage.getItem(ADMIN_PASS_KEY)) {
    localStorage.setItem(ADMIN_PASS_KEY, DEFAULT_ADMIN_PASS);
  }
}

function verifyAdminPass(pass) {
  ensureAdminPass();
  return pass === localStorage.getItem(ADMIN_PASS_KEY);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultState();
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function readFileAsDataUrl(file) {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => reject(new Error("read-file-failed"));
    reader.readAsDataURL(file);
  });
}
