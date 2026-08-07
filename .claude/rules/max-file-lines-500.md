<!-- Cursor mirror: .cursor/rules/max-file-lines-500.mdc — keep bodies in sync -->

# 文件行数上限 — 500 行

## 强制门禁

项目内**单个源文件不得超过 500 行**（含空行与注释）。

适用范围（默认）：

- `*.ts` / `*.tsx` / `*.js` / `*.jsx`
- `*.css` / `*.scss` / `*.sass`
- 业务与组件源码目录（如 `app/`）

通常不计入：`package-lock.json`、生成物（`build/`、`.react-router/`）、`node_modules/`。

## 工作流（不可跳过）

1. 新建或修改文件后，检查目标文件行数
2. 若 `> 500`：拆成更小模块（按职责 / UI 区块 / hooks / 纯函数），再改 import
3. 拆分后每个文件均 `≤ 500`，且行为不变
4. 未达标不得声称完成

快速自检：

```bash
find app -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) -exec wc -l {} + | awk '$1 > 500 { print }'
```

应无输出（或仅剩合计行）。

## 拆分原则

- 一个文件一个主要职责；优先抽出子组件、hooks、常量、纯工具函数
- 保持公开 API 稳定（必要时用同目录 `index` 或原路径再导出）
- 不要为了压行数做无意义压缩（删空行、挤单行）来「过关」
- 修改前端代码后仍须满足 React Doctor **100/100** 门禁
