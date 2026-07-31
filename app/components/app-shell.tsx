import { NavLink, Outlet, useLocation } from "react-router";
import {
  Home,
  LayoutGrid,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { AiChatPopup } from "~/components/ai-chat-popup";
import { cn } from "~/lib/utils";

const navItems: { to: string; label: string; icon: LucideIcon; end?: boolean }[] =
  [
    { to: "/", label: "概览", icon: Home, end: true },
    { to: "/components", label: "组件", icon: LayoutGrid },
    { to: "/settings", label: "设置", icon: Settings },
  ];

function isNavActive(pathname: string, to: string, end?: boolean) {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell() {
  const { pathname } = useLocation();

  return (
    <div className="flex h-svh bg-surface-1 text-foreground">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex size-7 items-center justify-center rounded-lg bg-foreground text-[11px] font-semibold text-background">
            FF
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium tracking-tight">
              Fluid Template
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Vite+ · React Router
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const active = isNavActive(pathname, item.to, item.end);
            return (
              <Button
                key={item.to}
                asChild
                variant={active ? "secondary" : "ghost"}
                size="sm"
                active={active}
                leadingIcon={item.icon}
                className={cn("w-full justify-start")}
              >
                <NavLink to={item.to} end={item.end}>
                  {item.label}
                </NavLink>
              </Button>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
            Built with Fluid Functionalism
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-background px-6">
          <p className="text-sm text-muted-foreground">左侧菜单 · 右侧内容</p>
        </header>
        <main className="min-h-0 flex-1 overflow-auto bg-background p-6">
          <Outlet />
        </main>
      </div>

      <AiChatPopup />
    </div>
  );
}
