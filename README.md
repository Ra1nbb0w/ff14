# FF14 排轴工具

- `index.html`：用户排轴界面（只读使用）。
- `jobs-admin.html`：职业后台（管理员维护职业/技能/图标/GCD/咏唱）。
- `encounters-admin.html`：副本后台（管理员维护副本时间轴）。

三者共用 `localStorage`（`ff14_planner_v4`），后台改动会直接在排轴界面生效。

## 运行

```bash
python3 -m http.server 8000
```
