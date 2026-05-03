import json
import os
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from uuid import uuid4

DATA_FILE = "ff14_planner_data.json"


def default_data():
    return {
        "selection": {"job": "SMN", "encounter": "绝欧 P1"},
        "jobs": {
            "SMN": {
                "baseGcd": 2.45,
                "skills": [
                    {"id": str(uuid4()), "name": "毁荡", "type": "gcd", "gcd": 2.45, "cast": 0},
                    {"id": str(uuid4()), "name": "能量抽取", "type": "ogcd", "gcd": 2.45, "cast": 0},
                ],
            }
        },
        "encounters": {"绝欧 P1": {"events": [{"id": str(uuid4()), "time": 10, "name": "开场"}]}},
        "actions": [],
    }


class PlannerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("FF14 排轴应用程序")
        self.data = self.load_data()

        notebook = ttk.Notebook(root)
        self.planner_tab = ttk.Frame(notebook)
        self.jobs_tab = ttk.Frame(notebook)
        self.enc_tab = ttk.Frame(notebook)
        notebook.add(self.planner_tab, text="排轴")
        notebook.add(self.jobs_tab, text="职业后台")
        notebook.add(self.enc_tab, text="副本后台")
        notebook.pack(fill="both", expand=True)

        self.build_planner_tab()
        self.build_jobs_tab()
        self.build_enc_tab()
        self.refresh_all()

    def load_data(self):
        if not os.path.exists(DATA_FILE):
            return default_data()
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return default_data()

    def save(self):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)

    def build_planner_tab(self):
        top = ttk.Frame(self.planner_tab)
        top.pack(fill="x", padx=10, pady=8)

        ttk.Label(top, text="职业").pack(side="left")
        self.job_var = tk.StringVar()
        self.job_cb = ttk.Combobox(top, textvariable=self.job_var, state="readonly")
        self.job_cb.pack(side="left", padx=6)
        self.job_cb.bind("<<ComboboxSelected>>", lambda _: self.on_select_change())

        ttk.Label(top, text="副本").pack(side="left", padx=(12, 0))
        self.enc_var = tk.StringVar()
        self.enc_cb = ttk.Combobox(top, textvariable=self.enc_var, state="readonly")
        self.enc_cb.pack(side="left", padx=6)
        self.enc_cb.bind("<<ComboboxSelected>>", lambda _: self.on_select_change())

        mid = ttk.Frame(self.planner_tab)
        mid.pack(fill="both", expand=True, padx=10, pady=8)

        left = ttk.LabelFrame(mid, text="技能库")
        left.pack(side="left", fill="y")
        ttk.Label(left, text="GCD 双击放置 / oGCD 双击放置").pack(anchor="w", padx=6, pady=4)
        self.skill_list = tk.Listbox(left, width=30, height=25)
        self.skill_list.pack(padx=6, pady=6)
        self.skill_list.bind("<Double-1>", self.quick_place_action)

        right = ttk.LabelFrame(mid, text="时间轴机制点")
        right.pack(side="left", fill="both", expand=True, padx=(10, 0))
        self.event_list = tk.Listbox(right, height=25)
        self.event_list.pack(fill="both", expand=True, padx=6, pady=6)

        action_bar = ttk.Frame(self.planner_tab)
        action_bar.pack(fill="x", padx=10, pady=(0, 8))
        ttk.Button(action_bar, text="删除选中排轴", command=self.remove_selected_action).pack(side="left")

    def build_jobs_tab(self):
        top = ttk.Frame(self.jobs_tab)
        top.pack(fill="x", padx=10, pady=8)
        self.jobs_admin_var = tk.StringVar()
        self.jobs_admin_cb = ttk.Combobox(top, textvariable=self.jobs_admin_var, state="readonly")
        self.jobs_admin_cb.pack(side="left")
        self.jobs_admin_cb.bind("<<ComboboxSelected>>", lambda _: self.refresh_skills_admin())

        ttk.Button(top, text="删除职业", command=self.delete_job).pack(side="left", padx=6)
        self.new_job_entry = ttk.Entry(top)
        self.new_job_entry.pack(side="left", padx=6)
        ttk.Button(top, text="新增职业", command=self.add_job).pack(side="left")

        form = ttk.Frame(self.jobs_tab)
        form.pack(fill="x", padx=10, pady=8)
        self.skill_name = ttk.Entry(form)
        self.skill_name.pack(side="left", padx=4)
        self.skill_type = ttk.Combobox(form, values=["gcd", "ogcd"], width=8, state="readonly")
        self.skill_type.set("gcd")
        self.skill_type.pack(side="left", padx=4)
        self.skill_gcd = ttk.Entry(form, width=8)
        self.skill_gcd.pack(side="left", padx=4)
        self.skill_cast = ttk.Entry(form, width=8)
        self.skill_cast.insert(0, "0")
        self.skill_cast.pack(side="left", padx=4)
        ttk.Button(form, text="新增技能", command=self.add_skill).pack(side="left", padx=4)

        self.skills_admin_list = tk.Listbox(self.jobs_tab, height=20)
        self.skills_admin_list.pack(fill="both", expand=True, padx=10, pady=8)
        ttk.Button(self.jobs_tab, text="删除选中技能", command=self.delete_skill).pack(anchor="w", padx=10)

    def build_enc_tab(self):
        top = ttk.Frame(self.enc_tab)
        top.pack(fill="x", padx=10, pady=8)
        self.enc_admin_var = tk.StringVar()
        self.enc_admin_cb = ttk.Combobox(top, textvariable=self.enc_admin_var, state="readonly")
        self.enc_admin_cb.pack(side="left")
        self.enc_admin_cb.bind("<<ComboboxSelected>>", lambda _: self.refresh_events_admin())

        ttk.Button(top, text="删除副本", command=self.delete_encounter).pack(side="left", padx=6)
        self.new_enc_entry = ttk.Entry(top)
        self.new_enc_entry.pack(side="left", padx=6)
        ttk.Button(top, text="新增副本", command=self.add_encounter).pack(side="left")
        ttk.Button(top, text="上传时间轴JSON", command=self.upload_timeline).pack(side="left", padx=6)

        form = ttk.Frame(self.enc_tab)
        form.pack(fill="x", padx=10, pady=8)
        self.ev_time = ttk.Entry(form, width=10)
        self.ev_time.pack(side="left", padx=4)
        self.ev_name = ttk.Entry(form)
        self.ev_name.pack(side="left", padx=4)
        ttk.Button(form, text="新增机制点", command=self.add_event).pack(side="left", padx=4)

        self.events_admin_list = tk.Listbox(self.enc_tab, height=20)
        self.events_admin_list.pack(fill="both", expand=True, padx=10, pady=8)
        ttk.Button(self.enc_tab, text="删除选中机制", command=self.delete_event).pack(anchor="w", padx=10)

    def refresh_all(self):
        jobs = list(self.data["jobs"].keys())
        encs = list(self.data["encounters"].keys())
        if self.data["selection"]["job"] not in jobs and jobs:
            self.data["selection"]["job"] = jobs[0]
        if self.data["selection"]["encounter"] not in encs and encs:
            self.data["selection"]["encounter"] = encs[0]

        self.job_cb["values"] = jobs
        self.enc_cb["values"] = encs
        self.jobs_admin_cb["values"] = jobs
        self.enc_admin_cb["values"] = encs
        self.job_var.set(self.data["selection"]["job"])
        self.enc_var.set(self.data["selection"]["encounter"])
        self.jobs_admin_var.set(self.data["selection"]["job"])
        self.enc_admin_var.set(self.data["selection"]["encounter"])

        self.refresh_planner_lists()
        self.refresh_skills_admin()
        self.refresh_events_admin()

    def refresh_planner_lists(self):
        self.skill_list.delete(0, tk.END)
        job = self.data["jobs"][self.data["selection"]["job"]]
        for s in job["skills"]:
            self.skill_list.insert(tk.END, f"{s['name']} [{s['type']}] gcd:{s['gcd']} cast:{s['cast']}")

        self.event_list.delete(0, tk.END)
        events = sorted(self.data["encounters"][self.data["selection"]["encounter"]]["events"], key=lambda x: x["time"])
        for e in events:
            row = f"{e['time']}s {e['name']}"
            acts = [a for a in self.data["actions"] if a["time"] == e["time"]]
            if acts:
                row += " -> " + ", ".join(self.find_skill(a["skillId"])["name"] for a in acts if self.find_skill(a["skillId"]))
            self.event_list.insert(tk.END, row)

    def on_select_change(self):
        self.data["selection"]["job"] = self.job_var.get()
        self.data["selection"]["encounter"] = self.enc_var.get()
        self.save()
        self.refresh_all()

    def find_skill(self, skill_id):
        for job in self.data["jobs"].values():
            for skill in job["skills"]:
                if skill["id"] == skill_id:
                    return skill
        return None

    def quick_place_action(self, _):
        si = self.skill_list.curselection()
        ei = self.event_list.curselection()
        if not si or not ei:
            messagebox.showwarning("提示", "请先选一个技能和一个机制点")
            return
        skill = self.data["jobs"][self.data["selection"]["job"]]["skills"][si[0]]
        events = sorted(self.data["encounters"][self.data["selection"]["encounter"]]["events"], key=lambda x: x["time"])
        event = events[ei[0]]
        ok, msg = self.can_place(skill, event["time"])
        if not ok:
            messagebox.showwarning("规则限制", msg)
            return
        self.data["actions"].append({"id": str(uuid4()), "skillId": skill["id"], "time": event["time"], "lane": skill["type"]})
        self.save()
        self.refresh_planner_lists()

    def can_place(self, skill, time):
        same = [a for a in self.data["actions"] if a["time"] == time]
        gcd_count = len([a for a in same if a["lane"] == "gcd"])
        ogcd_count = len([a for a in same if a["lane"] == "ogcd"])
        if skill["type"] == "gcd" and gcd_count >= 1:
            return False, "同一时间点最多1个GCD"
        if skill["type"] == "ogcd":
            if gcd_count < 1:
                return False, "能力技必须跟在GCD后"
            if ogcd_count >= 2:
                return False, "同一时间点最多2个能力技"
            if skill.get("cast", 0) > 0 and ogcd_count >= 1:
                return False, "有咏唱能力技时该点只能放1个能力技"
        return True, "ok"

    def remove_selected_action(self):
        idx = self.event_list.curselection()
        if not idx:
            return
        events = sorted(self.data["encounters"][self.data["selection"]["encounter"]]["events"], key=lambda x: x["time"])
        t = events[idx[0]]["time"]
        self.data["actions"] = [a for a in self.data["actions"] if a["time"] != t]
        self.save()
        self.refresh_planner_lists()

    def add_job(self):
        n = self.new_job_entry.get().strip()
        if not n or n in self.data["jobs"]:
            return
        self.data["jobs"][n] = {"baseGcd": 2.5, "skills": []}
        self.data["selection"]["job"] = n
        self.save()
        self.refresh_all()

    def delete_job(self):
        j = self.jobs_admin_var.get()
        if len(self.data["jobs"]) <= 1 or j not in self.data["jobs"]:
            return
        del self.data["jobs"][j]
        self.data["actions"] = [a for a in self.data["actions"] if self.find_skill(a["skillId"]) is not None]
        self.save()
        self.refresh_all()

    def add_skill(self):
        j = self.jobs_admin_var.get()
        name = self.skill_name.get().strip()
        if not j or not name:
            return
        self.data["jobs"][j]["skills"].append({
            "id": str(uuid4()),
            "name": name,
            "type": self.skill_type.get(),
            "gcd": float(self.skill_gcd.get() or self.data["jobs"][j]["baseGcd"]),
            "cast": float(self.skill_cast.get() or 0),
        })
        self.save()
        self.refresh_all()

    def delete_skill(self):
        j = self.jobs_admin_var.get()
        idx = self.skills_admin_list.curselection()
        if not j or not idx:
            return
        skills = self.data["jobs"][j]["skills"]
        sid = skills[idx[0]]["id"]
        self.data["jobs"][j]["skills"] = [s for s in skills if s["id"] != sid]
        self.data["actions"] = [a for a in self.data["actions"] if a["skillId"] != sid]
        self.save()
        self.refresh_all()

    def refresh_skills_admin(self):
        j = self.jobs_admin_var.get()
        self.skills_admin_list.delete(0, tk.END)
        if not j:
            return
        for s in self.data["jobs"][j]["skills"]:
            self.skills_admin_list.insert(tk.END, f"{s['name']} [{s['type']}] gcd:{s['gcd']} cast:{s['cast']}")

    def add_encounter(self):
        n = self.new_enc_entry.get().strip()
        if not n or n in self.data["encounters"]:
            return
        self.data["encounters"][n] = {"events": []}
        self.data["selection"]["encounter"] = n
        self.save()
        self.refresh_all()

    def delete_encounter(self):
        n = self.enc_admin_var.get()
        if len(self.data["encounters"]) <= 1 or n not in self.data["encounters"]:
            return
        del self.data["encounters"][n]
        self.save()
        self.refresh_all()

    def upload_timeline(self):
        path = filedialog.askopenfilename(filetypes=[("JSON", "*.json")])
        if not path:
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, list):
                raise ValueError()
            self.data["encounters"][self.enc_admin_var.get()]["events"] = [
                {"id": str(uuid4()), "time": float(i["time"]), "name": str(i["name"])} for i in data
            ]
            self.save()
            self.refresh_all()
        except Exception:
            messagebox.showerror("错误", "JSON 格式需为 [{time, name}]")

    def add_event(self):
        e = self.enc_admin_var.get()
        if not e:
            return
        self.data["encounters"][e]["events"].append({"id": str(uuid4()), "time": float(self.ev_time.get()), "name": self.ev_name.get().strip()})
        self.save()
        self.refresh_all()

    def delete_event(self):
        e = self.enc_admin_var.get()
        idx = self.events_admin_list.curselection()
        if not e or not idx:
            return
        events = self.data["encounters"][e]["events"]
        eid = sorted(events, key=lambda x: x["time"])[idx[0]]["id"]
        self.data["encounters"][e]["events"] = [x for x in events if x["id"] != eid]
        self.save()
        self.refresh_all()

    def refresh_events_admin(self):
        e = self.enc_admin_var.get()
        self.events_admin_list.delete(0, tk.END)
        if not e:
            return
        for ev in sorted(self.data["encounters"][e]["events"], key=lambda x: x["time"]):
            self.events_admin_list.insert(tk.END, f"{ev['time']}s {ev['name']}")


if __name__ == "__main__":
    root = tk.Tk()
    root.geometry("980x680")
    PlannerApp(root)
    root.mainloop()
