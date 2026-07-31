import type { Route } from "./+types/settings";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export function meta({}: Route.MetaArgs) {
  return [{ title: "设置 · Fluid Template" }];
}

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">设置</h1>
        <p className="text-sm text-muted-foreground">
          占位页：把表单与偏好设置放在这里。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>项目信息</CardTitle>
          <CardDescription>
            继续用{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              npx shadcn@latest add @fluid/...
            </code>{" "}
            安装更多组件。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="tertiary" size="sm">
            保存更改
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
