import { AnimatePresence, m } from "framer-motion";

import { type ItemRect } from "~/hooks/use-proximity-hover";
import { shapeMap } from "~/lib/shape-context";
import { spring } from "~/lib/springs";

const shape = shapeMap.rounded;

interface DropdownHighlightsProps {
  activeRect: ItemRect | null;
  checkedRect: ItemRect | null;
  focusRect: ItemRect | null;
  sessionKey: number;
}

export function DropdownHighlights({
  activeRect,
  checkedRect,
  focusRect,
  sessionKey,
}: DropdownHighlightsProps) {
  return (
    <>
      <AnimatePresence>
        {checkedRect && (
          <m.div
            layout
            className={`absolute ${shape.bg} bg-active pointer-events-none`}
            style={{
              top: checkedRect.top,
              left: checkedRect.left,
              width: checkedRect.width,
              height: checkedRect.height,
            }}
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: spring.moderate.exit }}
            transition={{
              ...spring.moderate,
              opacity: { duration: 0.08 },
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeRect && (
          <m.div
            layout
            key={sessionKey}
            className={`absolute ${shape.bg} bg-hover pointer-events-none`}
            style={{
              top: activeRect.top,
              left: activeRect.left,
              width: activeRect.width,
              height: activeRect.height,
              transformOrigin: "top left",
            }}
            initial={{
              opacity: 0,
              x: (checkedRect?.left ?? activeRect.left) - activeRect.left,
              y: (checkedRect?.top ?? activeRect.top) - activeRect.top,
              scaleX:
                (checkedRect?.width ?? activeRect.width) / activeRect.width,
              scaleY:
                (checkedRect?.height ?? activeRect.height) / activeRect.height,
            }}
            animate={{
              opacity: 1,
              x: 0,
              y: 0,
              scaleX: 1,
              scaleY: 1,
            }}
            exit={{ opacity: 0, transition: spring.fast.exit }}
            transition={{
              ...spring.fast,
              opacity: { duration: 0.08 },
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {focusRect && (
          <m.div
            layout
            className={`absolute ${shape.focusRing} pointer-events-none z-20 border border-[color:var(--focus-ring,#6B97FF)]`}
            style={{
              left: focusRect.left - 2,
              top: focusRect.top - 2,
              width: focusRect.width + 4,
              height: focusRect.height + 4,
            }}
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: spring.fast.exit }}
            transition={{
              ...spring.fast,
              opacity: { duration: 0.08 },
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
