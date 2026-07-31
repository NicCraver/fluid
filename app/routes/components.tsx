import { useState } from "react";

import type { Route } from "./+types/components";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsList, TabItem, TabPanel } from "~/components/ui/tabs";
import { Tooltip, TooltipProvider } from "~/components/ui/tooltip";

export function meta({}: Route.MetaArgs) {
  return [{ title: "组件 · Fluid Template" }];
}

export default function ComponentsPage() {
  const [tab, setTab] = useState("buttons");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">组件</h1>
        <p className="text-sm text-muted-foreground">
          Fluid Functionalism 交互示例（Button / Tabs / Badge / Tooltip /
          Card）。
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabItem value="buttons" label="Buttons" />
          <TabItem value="badges" label="Badges" />
          <TabItem value="tooltip" label="Tooltip" />
        </TabsList>

        <TabPanel value="buttons" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Button</CardTitle>
              <CardDescription>变体与尺寸</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="tertiary">Tertiary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button size="sm">Small</Button>
              <Button loading>Loading</Button>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value="badges" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Badge</CardTitle>
              <CardDescription>颜色与点状变体</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge color="blue">Blue</Badge>
              <Badge color="green">Green</Badge>
              <Badge variant="dot" color="amber">
                Dot
              </Badge>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value="tooltip" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tooltip</CardTitle>
              <CardDescription>悬停提示</CardDescription>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <Tooltip content="Fluid spring tooltip">
                  <Button variant="secondary">Hover me</Button>
                </Tooltip>
              </TooltipProvider>
            </CardContent>
          </Card>
        </TabPanel>
      </Tabs>
    </div>
  );
}
