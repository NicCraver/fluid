import type { Route } from "./+types/home";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "概览 · Fluid Template" },
    {
      name: "description",
      content: "Vite+ + React Router + Fluid Functionalism 模板",
    },
  ];
}

export default function Home() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">概览</h1>
            <Badge color="blue">Template</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            用 Fluid 组件搭好的侧栏应用骨架。按{" "}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px]">
              ⌘I
            </kbd>{" "}
            打开右下角 AI 聊天。
          </p>
        </div>
        <Button size="sm">新建</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>技术栈</CardTitle>
            <CardDescription>
              Vite+、React Router、Tailwind v4、shadcn、@fluid
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            组件通过 shadcn registry 拷贝进{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              app/components/ui
            </code>
            ，可随意修改。
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>下一步</CardTitle>
            <CardDescription>从侧栏打开「组件」页查看交互示例</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm">
              Secondary
            </Button>
            <Button variant="tertiary" size="sm">
              Tertiary
            </Button>
            <Button variant="ghost" size="sm">
              Ghost
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
