# Fluid

Vite + React Router + Tailwind v4 + Fluid Functionalism 侧栏模板。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run typecheck` | 类型检查 |
| `npm run doctor` | React Doctor 全量扫描（须 100） |
| `npm run doctor:score` | 仅看健康分 |
| `npm run doctor:changed` | 变更范围扫描 |

## 目录速览

- `app/components/` — UI 与壳层组件（按功能文件夹组织）
- `app/routes/` — 页面路由
- `app/hooks/`、`app/lib/` — hooks 与工具
- `.agents/skills/react-doctor/` — React Doctor 本地技能

## 项目规则（与 Cursor 同步）

详细门禁在 `.claude/rules/`（Claude Code）与 `.cursor/rules/`（Cursor）各一份，**正文必须保持一致**。改规则时两边一起改：

| 规则 | 文件 |
| --- | --- |
| 按功能文件夹组织源码 | `feature-folder-structure` |
| 单文件 ≤ 500 行 | `max-file-lines-500` |
| 禁止非 Releases 的 GitHub Actions | `no-github-actions-except-releases` |
| React Doctor 必须 100/100 | `react-doctor-100` |

会话中可用 `/doctor` 或按 `.agents/skills/react-doctor/` 技能收尾。
