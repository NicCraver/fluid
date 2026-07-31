import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
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

function slotY(index: number) {
  return -index * (CARD_H + STACK_GAP);
}

interface QueuedMessageStackProps {
  queue: QueuedMessage[];
  onQueueChange: (queue: QueuedMessage[]) => void;
  bottom: number;
  onEdit: (item: QueuedMessage) => void;
}

interface QueuedCardProps {
  item: QueuedMessage;
  index: number;
  stackExpanded: boolean;
  isTouch: boolean;
  isDragging: boolean;
  dragY: number;
  pointerDownId: string | null;
  onEdit: (item: QueuedMessage) => void;
  onRemove: (item: QueuedMessage) => void;
  onPointerStart: (item: QueuedMessage, index: number, clientY: number) => void;
}

function QueuedCard({
  item,
  index,
  stackExpanded,
  isTouch,
  isDragging,
  dragY,
  pointerDownId,
  onEdit,
  onRemove,
  onPointerStart,
}: QueuedCardProps) {
  const shape = useShape();
  const PencilIcon = useIcon("pencil");
  const XIcon = useIcon("x");
  const peek = Math.min(index, STACK_MAX_PEEK);
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
      onClick={() => {
        if (isTouch && !stackExpanded) {
          onPointerStart(item, index, 0);
        }
      }}
      onPointerDown={(event) => {
        if (!stackExpanded || event.button !== 0) return;
        onPointerStart(item, index, event.clientY);
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
          {item.files.slice(0, 3).map((file) => (
            <FileThumbnail
              key={`${file.name}-${file.size}-${file.lastModified}`}
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
          `${item.files.length} attachment${item.files.length === 1 ? "" : "s"}`}
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

function QueuedMessageStackContent({
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
  const notifyQueueChange = useEffectEvent(onQueueChange);

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
      const current = queueRef.current;
      const slot = Math.max(
        0,
        Math.min(
          current.length - 1,
          Math.floor(fromBottom / (CARD_H + STACK_GAP))
        )
      );
      const currentIndex = current.findIndex(
        (item) => item.id === pointerDownId
      );
      if (currentIndex !== -1 && currentIndex !== slot) {
        const next = [...current];
        const [moved] = next.splice(currentIndex, 1);
        next.splice(slot, 0, moved!);
        queueRef.current = next;
        notifyQueueChange(next);
      }
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

  const startPointerInteraction = (
    item: QueuedMessage,
    index: number,
    clientY: number
  ) => {
    if (clientY === 0) {
      setTapExpanded(true);
      return;
    }
    dragStartYRef.current = clientY;
    setDragY(slotY(index));
    setPointerDownId(item.id);
  };

  return (
    <m.div
      ref={stackRef}
      layout
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
            {isTouch && stackExpanded && (
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
            <div className={isTouch && stackExpanded ? "invisible" : undefined}>
              <Tooltip
                content={`${stackCount} queued message${stackCount === 1 ? "" : "s"}`}
                side="left"
              >
                <div
                  className="absolute bottom-0 left-0 flex items-center justify-end gap-1 pr-1 text-muted-foreground"
                  style={{ height: CARD_H, width: 40 }}
                >
                  <AnimatePresence>
                    {hiddenCount > 0 && (
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
            </div>

            <AnimatePresence initial={false}>
              {queue.map((item, index) => (
                <QueuedCard
                  key={item.id}
                  item={item}
                  index={index}
                  stackExpanded={stackExpanded}
                  isTouch={isTouch}
                  isDragging={draggingId === item.id}
                  dragY={dragY}
                  pointerDownId={pointerDownId}
                  onEdit={onEdit}
                  onRemove={removeQueuedMsg}
                  onPointerStart={startPointerInteraction}
                />
              ))}
            </AnimatePresence>
      </m.div>
    </m.div>
  );
}

export function QueuedMessageStack(props: QueuedMessageStackProps) {
  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {props.queue.length > 0 && (
          <QueuedMessageStackContent key="queue-stack" {...props} />
        )}
      </AnimatePresence>
    </LazyMotion>
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
