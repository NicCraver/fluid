<!-- Cursor mirror: .cursor/rules/no-github-actions-except-releases.mdc — keep bodies in sync -->

# GitHub Actions — 默认禁用

## 强制门禁

**不要添加或启用 GitHub Actions 工作流**，除非用途是**发布 Releases**（打 tag / 上传 release artifacts）。

原因：GitHub Actions 按用量计费，免费额度有限，日常 CI（PR 检查、push 扫描、lint、test、doctor 等）不要放进 Actions。

## 允许

- 仅用于 **GitHub Releases** 的 workflow（例如 `release` / `on: release` / tag 触发的发布打包）
- 用户**明确要求**添加某条 Actions 时再加，且优先做成 Releases 相关

## 禁止

- PR / push 触发的 CI（lint、typecheck、test、build、react-doctor 等）
- 为了“方便”自动加 `react-doctor ci install` 或任意 `.github/workflows/*` 日常检查
- 在未说明是 Releases 用途时新建或恢复 workflow 文件

## 本地替代

质量门禁在本地（及 Cursor hooks / 项目脚本）执行，例如：

```bash
npm run doctor
npm run doctor:score
npm run typecheck
npm run build
```

若发现仓库里已有非 Releases 的 workflow：删除或停用，不要继续扩展。
