# FF14 排轴工具

## 页面说明
- `index.html`：用户排轴界面（仅用于选择职业/副本和拖拽排轴）。
- `jobs-admin.html`：职业后台（管理员维护职业、技能、图标、GCD、咏唱）。
- `encounters-admin.html`：副本后台（管理员维护副本时间轴和机制点）。

## 后台权限
- 两个后台页面都需要管理员密码。
- 默认密码：`ff14admin`（首次加载会写入 localStorage）。

## 数据持久化
- 所有页面共享 `localStorage` 键：`ff14_planner_v5`。
- 后台修改会直接在排轴界面生效。

## 本地运行
```bash
python3 -m http.server 8000
```
