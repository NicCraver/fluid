"use client";

import { AnimatePresence, m } from "framer-motion";
import { spring } from "~/lib/springs";
import { cn } from "~/lib/utils";

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface CardGroupHighlightProps {
  activeRect: HighlightRect | null;
  session: number;
  shapeClass: string;
}

function CardGroupHighlight({
  activeRect,
  session,
  shapeClass,
}: CardGroupHighlightProps) {
  return (
    <AnimatePresence>
      {activeRect && (
        <m.div
          key={session}
          aria-hidden
          className={cn(
            "absolute bg-hover pointer-events-none z-0",
            shapeClass
          )}
          layout
          style={{
            top: activeRect.top,
            left: activeRect.left,
            width: activeRect.width,
            height: activeRect.height,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: spring.fast.exit }}
          transition={{ ...spring.fast, opacity: { duration: 0.08 } }}
        />
      )}
    </AnimatePresence>
  );
}

interface CardLayersProps {
  selected: boolean;
  showBottom: boolean;
  showRight: boolean;
  shapeClass: string;
}

function CardLayers({
  selected,
  showBottom,
  showRight,
  shapeClass,
}: CardLayersProps) {
  return (
    <>
      {selected && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 -z-10 bg-active pointer-events-none",
            shapeClass
          )}
        />
      )}
      {showBottom && (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-border/60 pointer-events-none -z-10"
        />
      )}
      {showRight && (
        <span
          aria-hidden
          className={cn(
            "absolute top-0 right-0 w-px bg-border/60 pointer-events-none -z-10",
            showBottom ? "bottom-px" : "bottom-0"
          )}
        />
      )}
    </>
  );
}

export { CardGroupHighlight, CardLayers };
