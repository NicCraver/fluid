"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Reorder } from "framer-motion";
import { Tooltip } from "~/components/ui/tooltip";
import type {
  InputMessageProps,
  QueuedMessage,
} from "~/components/ui/input-message-types";
import { fontWeights } from "~/lib/font-weight";
import { useIcon } from "~/lib/icon-context";
import { spring } from "~/lib/springs";
import { cn } from "~/lib/utils";

function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: none)");
    const update = () => setIsTouch(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isTouch;
}

interface QueuedRowProps {
  item: QueuedMessage;
  index: number;
  total: number;
  reduceMotion: boolean;
  isTouch: boolean;
  onEdit: (item: QueuedMessage) => void;
  onRemove: (item: QueuedMessage) => void;
  onMove: (item: QueuedMessage, direction: -1 | 1) => void;
}

function QueuedRow({
  item,
  index,
  total,
  reduceMotion,
  isTouch,
  onEdit,
  onRemove,
  onMove,
}: QueuedRowProps) {
  const XIcon = useIcon("x");
  const ImageIcon = useIcon("image");
  const fileCount = item.files.length;
  const label =
    item.text || `${fileCount} attachment${fileCount === 1 ? "" : "s"}`;

  return (
    <Reorder.Item
      value={item}
      layout
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.97, transition: spring.fast.exit }
      }
      transition={spring.fast}
      aria-label={`Queued message ${index + 1} of ${total}: ${label}`}
      tabIndex={0}
      onDoubleClick={() => onEdit(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === "F2") {
          event.preventDefault();
          onEdit(item);
        } else if (
          event.key === "Delete" ||
          event.key === "Backspace"
        ) {
          event.preventDefault();
          onRemove(item);
        } else if (
          event.altKey &&
          (event.key === "ArrowUp" || event.key === "ArrowDown")
        ) {
          event.preventDefault();
          onMove(item, event.key === "ArrowUp" ? -1 : 1);
        }
      }}
      className={cn(
        "group/qrow flex h-8 items-center gap-2 rounded-lg bg-muted px-2.5",
        "text-[13px] text-foreground/85 select-none outline-none",
        "cursor-grab active:cursor-grabbing",
        "focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]"
      )}
      style={{ fontVariationSettings: fontWeights.normal }}
    >
      {fileCount > 0 && (
        <span className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
          <ImageIcon size={13} />
          {item.text && <span className="tabular-nums">{fileCount}</span>}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1">
        {label}
      </span>
      <Tooltip content="Remove" side="top">
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onRemove(item);
          }}
          aria-label={`Remove queued message: ${label}`}
          className={cn(
            "shrink-0 flex h-5 w-5 items-center justify-center rounded-full",
            "text-muted-foreground hover:text-foreground hover:bg-hover",
            isTouch
              ? "opacity-100"
              : "opacity-0 group-hover/qrow:opacity-100 focus-visible:opacity-100",
            "transition-opacity duration-80 cursor-pointer outline-none",
            "focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]"
          )}
        >
          <XIcon size={13} strokeWidth={2.5} />
        </button>
      </Tooltip>
    </Reorder.Item>
  );
}

interface QueueControlsOptions {
  disabled?: boolean;
  files: File[];
  maxFiles?: number;
  onFilesChange?: (files: File[]) => void;
  onHistoryReset: () => void;
  onQueueChange?: (queue: QueuedMessage[]) => void;
  onSend?: InputMessageProps["onSend"];
  onValueChange: (value: string) => void;
  queue?: QueuedMessage[];
  status?: "idle" | "streaming";
  supportsFiles: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
}

function useQueueControls({
  disabled,
  files,
  maxFiles,
  onFilesChange,
  onHistoryReset,
  onQueueChange,
  onSend,
  onValueChange,
  queue,
  status,
  supportsFiles,
  textareaRef,
  value,
}: QueueControlsOptions) {
  const queueItems = useMemo(() => queue ?? [], [queue]);
  const queueRef = useRef(queueItems);

  useEffect(() => {
    queueRef.current = queueItems;
  }, [queueItems]);

  const supportsQueue = status !== undefined && onQueueChange !== undefined;
  const streaming = status === "streaming";
  const trimmed = value.trim();
  const canSend = !disabled && (trimmed.length > 0 || files.length > 0);
  const handleSend = useCallback(() => {
    if (!canSend) return;
    onHistoryReset();
    if (streaming && supportsQueue) {
      const item: QueuedMessage = {
        id: crypto.randomUUID(),
        text: trimmed,
        files,
      };
      const next = [...queueRef.current, item];
      queueRef.current = next;
      onQueueChange?.(next);
      onValueChange("");
      if (supportsFiles) onFilesChange?.([]);
      requestAnimationFrame(() => textareaRef.current?.focus());
      return;
    }
    onSend?.(trimmed, files);
  }, [
    canSend,
    files,
    onFilesChange,
    onHistoryReset,
    onQueueChange,
    onSend,
    onValueChange,
    streaming,
    supportsFiles,
    supportsQueue,
    textareaRef,
    trimmed,
  ]);
  const editQueued = useCallback(
    (item: QueuedMessage) => {
      if (!supportsQueue) return;
      onHistoryReset();
      onValueChange(item.text);
      if (supportsFiles) {
        onFilesChange?.(
          maxFiles == null ? item.files : item.files.slice(0, maxFiles)
        );
      }
      const next = queueRef.current.filter(
        (queuedItem) => queuedItem.id !== item.id
      );
      queueRef.current = next;
      onQueueChange?.(next);
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      });
    },
    [
      maxFiles,
      onFilesChange,
      onHistoryReset,
      onQueueChange,
      onValueChange,
      supportsFiles,
      supportsQueue,
      textareaRef,
    ]
  );
  const removeQueued = useCallback(
    (item: QueuedMessage) => {
      const next = queueRef.current.filter(
        (queuedItem) => queuedItem.id !== item.id
      );
      queueRef.current = next;
      onQueueChange?.(next);
    },
    [onQueueChange]
  );
  const moveQueued = useCallback(
    (item: QueuedMessage, direction: -1 | 1) => {
      const current = queueRef.current;
      const from = current.findIndex(
        (queuedItem) => queuedItem.id === item.id
      );
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      queueRef.current = next;
      onQueueChange?.(next);
    },
    [onQueueChange]
  );

  return {
    canSend,
    editQueued,
    handleSend,
    moveQueued,
    queueItems,
    removeQueued,
    streaming,
    supportsQueue,
  };
}

export { QueuedRow, useIsTouch, useQueueControls };
