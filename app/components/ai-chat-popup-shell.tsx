import { type ReactNode } from "react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
} from "framer-motion";
import { Sparkles } from "lucide-react";

import { spring } from "~/lib/springs";
import { cn } from "~/lib/utils";

const BALL = 56;
const PANEL_W = 400;
const PANEL_H = 560;
const BALL_LABEL = "打开 AI 聊天（⌘I）";

interface AiChatPopupShellProps {
  open: boolean;
  reduceMotion: boolean;
  transition: { duration: number } | typeof spring.slow;
  onOpen: () => void;
  panel: ReactNode;
}

export function AiChatPopupShell({
  open,
  reduceMotion,
  transition,
  onOpen,
  panel,
}: AiChatPopupShellProps) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        layout
        className={cn(
          "fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden",
          "border border-border/70 bg-background text-foreground shadow-surface-6",
          open ? "origin-bottom-right" : "origin-center cursor-pointer"
        )}
        style={{
          width: open ? PANEL_W : BALL,
          height: open ? PANEL_H : BALL,
          borderRadius: open ? 20 : BALL / 2,
        }}
        initial={false}
        transition={transition}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {open ? (
            panel
          ) : (
            <m.button
              key="ball"
              type="button"
              aria-label={BALL_LABEL}
              aria-expanded={false}
              onClick={onOpen}
              className="flex size-full items-center justify-center bg-foreground text-background"
              initial={
                reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.85 }
              }
              animate={{ opacity: 1, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: 0,
                      scale: 0.85,
                      transition: spring.fast.exit,
                    }
              }
              transition={spring.moderate}
            >
              <Sparkles className="size-5" />
            </m.button>
          )}
        </AnimatePresence>
      </m.div>
    </LazyMotion>
  );
}
