import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  AnimatePresence,
  m,
  useAnimationControls,
} from "framer-motion";

import { FileThumbnail } from "~/components/ui/file-thumbnail";
import { Tooltip } from "~/components/ui/tooltip";
import type { QueuedMessage } from "~/components/ui/input-message";
import { useIcon } from "~/lib/icon-context";
import { useShape } from "~/lib/shape-context";
import { spring } from "~/lib/springs";
import { cn } from "~/lib/utils";

const CARD_H = 44;
const STACK_PEEK = 12;
const STACK_SCALE = 0.05;
const STACK_GAP = 8;
const STACK_MAX_PEEK = 2;

// Pure geometry helper: the expanded-list Y offset for the row at `index`.
// Stateless, so it lives at module scope instead of being rebuilt each render.
function slotY(index: number) {
  return -index * (CARD_H + STACK_GAP);
}

interface QueuedMessageStackProps {
  queue: QueuedMessage[];
  onQueueChange: (queue: QueuedMessage[]) => void;
  bottom: number;
  onEdit: (item: QueuedMessage) => void;
}

// A single queued-message row. Extracted from the stack body so the parent
// stays small and memoization-friendly; it renders one absolutely-positioned
// card and animates to its collapsed-peek or expanded-list target.
function QueuedMessageRow({
  item,
  index,
  stackExpanded,
  draggingId,
  dragY,
  isTouch,
  pointerDownId,
  onEdit,
  onRemove,
  onExpandTap,
  onDragStart,
}: {
  item: QueuedMessage;
  index: number;
  stackExpanded: boolean;
  draggingId: string | null;
  dragY: number;
  isTouch: boolean;
  pointerDownId: string | null;
  onEdit: (item: QueuedMessage) => void;
  onRemove: (item: QueuedMessage) => void;
  onExpandTap: () => void;
  onDragStart: (clientY: number) => void;
}) {
  const shape = useShape();
  const PencilIcon = useIcon("pencil");
  const XIcon = useIcon("x");

  const peek = Math.min(index, STACK_MAX_PEEK);
  const isDragging = draggingId === item.id;
  const target = stackExpanded
    ? {
        y: isDragging ? dragY : slotY(index),
        scale: isDragging ? 1.03 : 1,
        opacity: 1,
      }
    : {
        y: -peek * STACK_PEEK,
        scale: 1 - peek * STACK_SCALE,
        opacity: index <= STACK_MAX_PEEK ? 1 : 0,
      };

  return (
    <m.div
      layoutId={
        pointerDownId !== null || item.files.length > 0
          ? undefined
          : `qm-${item.id}`
      }
      onDoubleClick={() => onEdit(item)}
      onClick={onExpandTap}
      onPointerDown={(event) => {
        if (!stackExpanded || event.button !== 0) return;
        onDragStart(event.clientY);
      }}
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={target}
      exit={{
        opacity: 0,
        scale: 0.9,
        transition: { duration: 0.12 },
      }}
      transition={isDragging ? { duration: 0 } : spring.moderate}
      style={{
        height: CARD_H,
        transformOrigin: "bottom center",
        zIndex: isDragging ? 200 : 100 - index,
        cursor: stackExpanded ? "grab" : "default",
        touchAction: stackExpanded ? "none" : undefined,
      }}
      className={cn(
        "group/qm absolute right-10 bottom-0 left-10 flex select-none items-center gap-2 bg-[color-mix(in_oklab,var(--accent),var(--background)_68%)] pr-1.5 text-[14px] text-muted-foreground shadow-surface-3 active:cursor-grabbing",
        item.files.length > 0 ? "pl-2" : "pl-3.5",
        shape.bg
      )}
    >
      {item.files.length > 0 && (
        <div className="pointer-events-none flex shrink-0 items-center gap-1">
          {item.files.slice(0, 3).map((file, fileIndex) => (
            <FileThumbnail
              key={`${file.name}-${file.size}-${fileIndex}`}
              file={file}
              size={28}
              className="rounded-md"
            />
          ))}
          {item.files.length > 3 && (
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-background/40 text-[11px] font-medium tabular-nums text-foreground/80">
              +{item.files.length - 3}
            </span>
          )}
        </div>
      )}
      <span className="pointer-events-none min-w-0 flex-1 truncate">
        {item.text ||
          `${item.files.length} attachment${
            item.files.length === 1 ? "" : "s"
          }`}
      </span>
      <div
        className={cn(
          "shrink-0 items-center gap-1",
          isTouch ? "flex" : "hidden group-hover/qm:flex"
        )}
      >
        <Tooltip content="Edit" side="top">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onEdit(item);
            }}
            aria-label={`Edit queued message: ${item.text}`}
            className={cn(
              "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-(--focus-ring,#6B97FF)",
              shape.button
            )}
          >
            <PencilIcon size={14} strokeWidth={2} />
          </button>
        </Tooltip>
        <Tooltip content="Remove" side="top">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRemove(item);
            }}
            aria-label={`Remove queued message: ${item.text}`}
            className={cn(
              "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-(--focus-ring,#6B97FF)",
              shape.button
            )}
          >
            <XIcon size={14} strokeWidth={2.5} />
          </button>
        </Tooltip>
      </div>
    </m.div>
  );
}

// The mounted stack. Rendered by `QueuedMessageStack` only while the queue is
// non-empty, so all transient UI state (hover, drag, tap-expand) is created
// fresh on each appearance and discarded when the queue empties — which is why
// no effect is needed to reset `tapExpanded` when the queue clears.
function StackBody({
  queue,
  onQueueChange,
  bottom,
  onEdit,
}: QueuedMessageStackProps) {
  const shape = useShape();
  const CornerDownRightIcon = useIcon("corner-down-right");
  const ChevronDownIcon = useIcon("chevron-down");

  const stackCount = queue.length;
  const collapsedStackH =
    CARD_H + Math.min(Math.max(stackCount - 1, 0), STACK_MAX_PEEK) * STACK_PEEK;
  const expandedStackH =
    stackCount * CARD_H + Math.max(stackCount - 1, 0) * STACK_GAP;
  const hiddenCount = Math.max(0, stackCount - (STACK_MAX_PEEK + 1));

  const stackRef = useRef<HTMLDivElement>(null);
  const [stackHovered, setStackHovered] = useState(false);
  const [pointerDownId, setPointerDownId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragY, setDragY] = useState(0);
  const dragStartYRef = useRef(0);
  const queueLenRef = useRef(queue.length);
  const queueRef = useRef(queue);

  const [isTouch, setIsTouch] = useState(false);
  const [tapExpanded, setTapExpanded] = useState(false);

  // Keep the drag-time snapshots in refs so the pointermove handler reads the
  // latest queue without re-subscribing. Writing them in an effect (after
  // commit) rather than during render keeps render pure; the handler only runs
  // during an active drag, which is always after a commit.
  useEffect(() => {
    queueLenRef.current = queue.length;
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const stackExpanded =
    stackHovered ||
    pointerDownId !== null ||
    draggingId !== null ||
    tapExpanded;

  const stackBump = useAnimationControls();
  const prevStackCountRef = useRef(stackCount);
  useEffect(() => {
    const prev = prevStackCountRef.current;
    prevStackCountRef.current = stackCount;
    if (stackCount > prev && prev > 0 && !stackExpanded) {
      void stackBump.set({ y: -7 });
      void stackBump.start({
        y: 0,
        transition: { type: "spring", duration: 0.42, bounce: 0.5 },
      });
    }
  }, [stackBump, stackCount, stackExpanded]);

  // The reorder callback only ever runs inside the pointermove handler, so wrap
  // it as an Effect Event: it always sees the latest `onQueueChange` without
  // being an effect dependency, so the listeners aren't re-subscribed whenever
  // the parent re-renders with a new callback identity.
  const onQueueChangeEvent = useEffectEvent((next: QueuedMessage[]) =>
    onQueueChange(next)
  );

  useEffect(() => {
    if (!pointerDownId) return;
    let started = false;
    const onMove = (event: PointerEvent) => {
      const el = stackRef.current;
      if (!el) return;
      if (!started) {
        if (Math.abs(event.clientY - dragStartYRef.current) < 4) return;
        started = true;
        setDraggingId(pointerDownId);
      }
      const rect = el.getBoundingClientRect();
      const fromBottom = rect.bottom - event.clientY;
      onQueueChangeEvent(
        (() => {
          const current = queueRef.current;
          const slot = Math.max(
            0,
            Math.min(
              current.length - 1,
              Math.floor(fromBottom / (CARD_H + STACK_GAP))
            )
          );
          const cur = current.findIndex((item) => item.id === pointerDownId);
          if (cur === -1 || cur === slot) return current;
          const moved = current[cur]!;
          const next = [...current];
          next.splice(cur, 1);
          next.splice(slot, 0, moved);
          return next;
        })()
      );
      const minY = -(queueLenRef.current - 1) * (CARD_H + STACK_GAP);
      setDragY(
        Math.max(minY, Math.min(0, event.clientY - rect.bottom + CARD_H / 2))
      );
    };
    const onUp = () => {
      setPointerDownId(null);
      setDraggingId(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [pointerDownId]);

  const removeQueuedMsg = (item: QueuedMessage) =>
    onQueueChange(queue.filter((entry) => entry.id !== item.id));

  const showCollapse = isTouch && stackExpanded;

  return (
    <m.div
      key="queued-stack"
      ref={stackRef}
      className="absolute inset-x-0 z-10"
      style={{
        bottom,
        height: stackExpanded ? expandedStackH : collapsedStackH,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ ...spring.moderate, bounce: 0 }}
      onMouseEnter={() => setStackHovered(true)}
      onMouseLeave={() => setStackHovered(false)}
    >
      <m.div animate={stackBump} className="absolute inset-0">
        {showCollapse && (
          <Tooltip content="Collapse" side="left">
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setTapExpanded(false);
              }}
              aria-label="Collapse queued messages"
              className={cn(
                "absolute bottom-0 left-0 flex items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-(--focus-ring,#6B97FF)",
                shape.button
              )}
              style={{ height: CARD_H, width: 40 }}
            >
              <ChevronDownIcon size={18} strokeWidth={2} />
            </button>
          </Tooltip>
        )}
        <Tooltip
          content={`${stackCount} queued message${stackCount === 1 ? "" : "s"}`}
          side="left"
        >
          <div
            className={cn(
              "absolute bottom-0 left-0 flex items-center justify-end gap-1 pr-1 text-muted-foreground",
              showCollapse && "hidden"
            )}
            style={{ height: CARD_H, width: 40 }}
          >
            <AnimatePresence>
              {!showCollapse && hiddenCount > 0 && (
                <m.span
                  key="count"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={spring.fast}
                  className="pointer-events-none text-[10px] font-semibold leading-none tabular-nums text-muted-foreground"
                >
                  {stackCount}
                </m.span>
              )}
            </AnimatePresence>
            <CornerDownRightIcon size={16} strokeWidth={2} />
          </div>
        </Tooltip>

        <AnimatePresence initial={false}>
          {queue.map((item, index) => (
            <QueuedMessageRow
              key={item.id}
              item={item}
              index={index}
              stackExpanded={stackExpanded}
              draggingId={draggingId}
              dragY={dragY}
              isTouch={isTouch}
              pointerDownId={pointerDownId}
              onEdit={onEdit}
              onRemove={removeQueuedMsg}
              onExpandTap={() => {
                if (isTouch && !stackExpanded) setTapExpanded(true);
              }}
              onDragStart={(clientY) => {
                dragStartYRef.current = clientY;
                setDragY(slotY(index));
                setPointerDownId(item.id);
              }}
            />
          ))}
        </AnimatePresence>
      </m.div>
    </m.div>
  );
}

export function QueuedMessageStack({
  queue,
  onQueueChange,
  bottom,
  onEdit,
}: QueuedMessageStackProps) {
  return (
    <AnimatePresence>
      {queue.length > 0 && (
        <StackBody
          queue={queue}
          onQueueChange={onQueueChange}
          bottom={bottom}
          onEdit={onEdit}
        />
      )}
    </AnimatePresence>
  );
}

export const queuedStackMetrics = {
  CARD_H,
  STACK_PEEK,
  STACK_MAX_PEEK,
  collapsedHeight(count: number) {
    if (count <= 0) return 0;
    return CARD_H + Math.min(Math.max(count - 1, 0), STACK_MAX_PEEK) * STACK_PEEK;
  },
};
