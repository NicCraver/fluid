# Fluid Template

Vite+ + React Router + Tailwind v4 + [Fluid Functionalism](https://www.fluidfunctionalism.com) 侧栏模板。

## 开始

```bash
vp install
vp run dev
```

或：

```bash
npm install
npm run dev
```

## 结构

- `app/components/app-shell.tsx` — 左侧菜单 + 右侧内容
- `app/components/ui/` — Fluid / shadcn 组件
- `app/routes/` — 页面路由

## 安装更多 Fluid 组件

```bash
npx shadcn@latest add @fluid/dialog
npx shadcn@latest add @fluid/select
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `vp run dev` / `npm run dev` | 开发服务器 |
| `vp run build` / `npm run build` | 生产构建 |
| `vp check` | 格式化 + lint + 类型检查 |
