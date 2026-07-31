"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type ForwardedRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
  type TextareaHTMLAttributes,
} from "react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  Reorder,
  useReducedMotion,
} from "framer-motion";
import { cn } from "~/lib/utils";
import { fontWeights } from "~/lib/font-weight";
import { spring } from "~/lib/springs";
import { useShape } from "~/lib/shape-context";
import { useIcon } from "~/lib/icon-context";
import { surfaceClasses } from "~/lib/surface-classes";
import { SurfaceProvider } from "~/lib/surface-context";
import { FileThumbnail } from "~/components/ui/file-thumbnail";
import { Button } from "~/components/ui/button";
import { Tooltip } from "~/components/ui/tooltip";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Touch devices have no hover, so hover-revealed affordances (like a queued
// row's × button) would never appear. `(hover: none)` flags those so they can
// be shown persistently instead. SSR-safe: starts false, resolves on mount.
function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isTouch;
}

const DEFAULT_ACCEPT = "image/png,image/jpeg,application/pdf";
const EMPTY_HISTORY: string[] = [];

interface InputMessageSlotContext {
  /** Opens the native file picker via the hidden `<input type="file">`.
   *  Pass `acceptOverride` (e.g. `"image/*"`) to scope the picker to a
   *  subset of the component's accept types just for this invocation. */
  openFilePicker: (acceptOverride?: string) => void;
  /** Currently-attached files (controlled). */
  files: File[];
}

type InputMessageSlot =
  | ReactNode
  | ((ctx: InputMessageSlotContext) => ReactNode);

/** A message held in the queue while the assistant is responding. Carries the
 *  trimmed text plus a snapshot of the files attached when it was queued, so
 *  double-click-to-edit can restore both. `id` is a stable key minted on enqueue. */
interface QueuedMessage {
  id: string;
  text: string;
  files: File[];
}

interface InputMessageProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Controlled textarea value. */
  value: string;
  /** Called with the new value on every textarea change. */
  onValueChange: (value: string) => void;
  /** Fired when the user submits with Enter or the send button. Receives the
   *  trimmed value and attached files. `meta.queuedId` is retained for callers
   *  that route queued items through the same callback. */
  onSend?: (
    value: string,
    files: File[],
    meta?: { queuedId?: string }
  ) => void;
  /** Placeholder text shown when the value is empty. */
  placeholder?: string;
  /** Content rendered in the bottom-left action area. Can be a function that
   *  receives `{ openFilePicker, files }` to wire an attach button. */
  leftSlot?: InputMessageSlot;
  /** Content rendered in the bottom-right action area, before the built-in
   *  send button. Same render-fn shape as leftSlot. */
  rightSlot?: InputMessageSlot;
  /** Disables the textarea, send button, and drag-and-drop. */
  disabled?: boolean;
  /** Minimum visible rows before the textarea grows. */
  minRows?: number;
  /** Maximum visible rows before the textarea starts to scroll. */
  maxRows?: number;
  /** When false, clicking the surrounding container won't refocus the textarea. */
  clickToFocus?: boolean;
  /** Accessible label for the send button. */
  sendLabel?: string;
  /** Controlled list of attached files. When undefined, attachment behavior
   *  is disabled (no drag-drop, no file input). */
  files?: File[];
  /** Called when files are added (drag-drop or picker) or removed. */
  onFilesChange?: (files: File[]) => void;
  /** Accepted MIME types as a comma-separated string. Defaults to PNG / JPEG / PDF. */
  accept?: string;
  /** Maximum number of files. Extra files are dropped when the limit is exceeded. */
  maxFiles?: number;
  /** Side of each preview tile in pixels. Defaults to 80. */
  filePreviewSize?: number;
  /** Extra props forwarded to the underlying textarea. */
  textareaProps?: Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "onChange" | "onKeyDown" | "disabled" | "placeholder"
  >;
  /** Assistant response state. When `"streaming"`, the send button becomes a
   *  Stop control (empty draft) or a Queue action (non-empty draft). The queue
   *  owner is responsible for dispatching its next item when a response ends.
   *  Leave undefined to keep the legacy send-immediately behavior. */
  status?: "idle" | "streaming";
  /** Fired when the Stop control is pressed (streaming, empty draft). */
  onStop?: () => void;
  /** Controlled queue of pending messages. Requires `status` to be controlled. */
  queue?: QueuedMessage[];
  /** Called when the queue changes (enqueue, edit, delete, reorder, dispatch). */
  onQueueChange?: (queue: QueuedMessage[]) => void;
  /** Render the built-in reorderable queue rows above the textarea. Set to
   *  `false` to suppress them and render the queue yourself (e.g. as full-width
   *  rows above the composer) — enqueue + auto-dispatch still run. */
  showQueue?: boolean;
  /** Previously-sent messages, oldest first. When the textarea is focused,
   *  ArrowUp (caret on the first line) recalls the previous one and walks
   *  backward through history; ArrowDown (caret on the last line) walks forward
   *  toward the in-progress draft. Editing or sending exits history mode. */
  history?: string[];
}

// ─── File preview tile ────────────────────────────────────────────────────
// Composer-row tile: a FileThumbnail wrapped with enter/exit motion and a
// hover-revealed remove (×) button.
interface FilePreviewTileProps {
  file: File;
  onRemove: () => void;
  size: number;
}

function FilePreviewTile({ file, onRemove, size }: FilePreviewTileProps) {
  const XIcon = useIcon("x");

  return (
    <m.div
      // `layout` animates sibling tiles into the gap when one is removed.
      // Enter: spring-fast (0.08s) — the chip category per animation-guidelines.md.
      // Exit: 0.06s linear — "exits should be slightly faster than enter",
      // matches CheckboxGroup's hover-bg pattern.
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: spring.fast.exit }}
      transition={spring.fast}
      // `cursor-default` opts out of the parent's `cursor-text` so hovering
      // a preview tile doesn't look like it'll land in the textarea.
      className="relative shrink-0 cursor-default group/tile"
    >
      <FileThumbnail file={file} size={size} />
      <Tooltip content="Remove" side="top">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${file.name}`}
          // Force the light-mode palette (dark circle + white X) regardless
          // of theme — the close badge needs to read as a "delete affordance"
          // over arbitrary image/PDF content, so it sits at a fixed contrast
          // instead of flipping with the surrounding surface.
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-neutral-900 text-white opacity-0 group-hover/tile:opacity-100 transition-opacity duration-80 flex items-center justify-center cursor-pointer outline-none focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]"
        >
          <XIcon size={12} strokeWidth={2.5} />
        </button>
      </Tooltip>
    </m.div>
  );
}

// ─── Queued message row ───────────────────────────────────────────────────
// A pending message in the queue: a recessed, draggable row that reads as
// "staged, not live". Double-click (or Enter/F2) edits it back into the
// composer; the hover-revealed × (or Delete) removes it; drag — or Alt+↑/↓ —
// reorders. Top of the list is next to dispatch.
interface QueuedRowProps {
  item: QueuedMessage;
  index: number;
  total: number;
  reduceMotion: boolean;
  isTouch: boolean;
  onEdit: (item: QueuedMessage) => void;
  onRemove: (item: QueuedMessage) => void;
  onMove: (item: QueuedMessage, dir: -1 | 1) => void;
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
      // Enter: spring-fast chip category. Exit slightly faster (0.06s linear),
      // per animation-guidelines.md. Reduced-motion drops the scale.
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
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "F2") {
          e.preventDefault();
          onEdit(item);
        } else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          onRemove(item);
        } else if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
          e.preventDefault();
          onMove(item, e.key === "ArrowUp" ? -1 : 1);
        }
      }}
      className={cn(
        // Fixed height (was py-1.5 around a 19.5px line box ≈ 31.5px) so the
        // text-box trim on the label doesn't shrink the row.
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
      {/* py-1/-my-1 keeps truncate's overflow:hidden from clipping
          ascenders/descenders outside the trimmed box. */}
      <span className="min-w-0 flex-1 truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1">{label}</span>
      <Tooltip content="Remove" side="top">
        <button
          type="button"
          // Stop the pointer-down from starting a Reorder drag, and the click
          // from bubbling to the row's double-click/edit handler.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item);
          }}
          aria-label={`Remove queued message: ${label}`}
          className={cn(
            "shrink-0 flex h-5 w-5 items-center justify-center rounded-full",
            "text-muted-foreground hover:text-foreground hover:bg-hover",
            // Hover devices reveal × on row-hover; touch has no hover, so keep
            // it persistently visible there.
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

interface FileControlsOptions {
  accept: string;
  disabled?: boolean;
  files: File[];
  leftSlot?: InputMessageSlot;
  maxFiles?: number;
  onFilesChange?: (files: File[]) => void;
  rightSlot?: InputMessageSlot;
}

function useFileControls({
  accept,
  disabled,
  files,
  leftSlot,
  maxFiles,
  onFilesChange,
  rightSlot,
}: FileControlsOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const supportsFiles = onFilesChange !== undefined;
  const acceptTokens = useMemo(
    () => accept.split(",").map((token) => token.trim()).filter(Boolean),
    [accept]
  );
  const matchesAccept = useCallback(
    (file: File) =>
      acceptTokens.some((token) => {
        if (token.endsWith("/*")) {
          return file.type.startsWith(token.slice(0, -1));
        }
        if (token.startsWith(".")) {
          return file.name.toLowerCase().endsWith(token.toLowerCase());
        }
        return file.type === token;
      }),
    [acceptTokens]
  );
  const addFiles = useCallback(
    (incoming: File[]) => {
      if (!onFilesChange) return;
      const fingerprint = (file: File) =>
        `${file.name}-${file.size}-${file.lastModified}`;
      const existing = new Set(files.map(fingerprint));
      const accepted: File[] = [];
      for (const file of incoming) {
        if (!matchesAccept(file)) continue;
        const key = fingerprint(file);
        if (existing.has(key)) continue;
        existing.add(key);
        accepted.push(file);
      }
      if (accepted.length === 0) return;
      const next = [...files, ...accepted];
      onFilesChange(maxFiles == null ? next : next.slice(0, maxFiles));
    },
    [files, matchesAccept, maxFiles, onFilesChange]
  );
  const removeFile = useCallback(
    (index: number) => {
      onFilesChange?.(files.filter((_, fileIndex) => fileIndex !== index));
    },
    [files, onFilesChange]
  );
  const openFilePicker = useCallback(
    (overrideAccept?: string) => {
      const input = fileInputRef.current;
      if (!input) return;
      if (overrideAccept) {
        input.accept = overrideAccept;
        input.click();
        queueMicrotask(() => {
          if (fileInputRef.current) fileInputRef.current.accept = accept;
        });
        return;
      }
      input.click();
    },
    [accept]
  );
  const slotContext = useMemo<InputMessageSlotContext>(
    () => ({ openFilePicker, files }),
    [files, openFilePicker]
  );
  const handleDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      if (!supportsFiles || disabled) return;
      if (!Array.from(event.dataTransfer.types).includes("Files")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setDragOver(true);
    },
    [disabled, supportsFiles]
  );
  const handleDragLeave = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      const next = event.relatedTarget as Node | null;
      if (next && event.currentTarget.contains(next)) return;
      setDragOver(false);
    },
    []
  );
  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      if (!supportsFiles || disabled) return;
      addFiles(Array.from(event.dataTransfer.files));
    },
    [addFiles, disabled, supportsFiles]
  );
  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files) return;
      addFiles(Array.from(event.target.files));
      event.target.value = "";
    },
    [addFiles]
  );

  return {
    dragOver,
    fileInputRef,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileInputChange,
    leftContent:
      typeof leftSlot === "function" ? leftSlot(slotContext) : leftSlot,
    removeFile,
    rightContent:
      typeof rightSlot === "function" ? rightSlot(slotContext) : rightSlot,
    supportsFiles,
  };
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

type ButtonMode = "send" | "queue" | "stop";

interface InputMessageViewProps {
  accept: string;
  buttonLabel: string;
  buttonMode: ButtonMode;
  canSend: boolean;
  className?: string;
  clickToFocus: boolean;
  composerProps: HTMLAttributes<HTMLDivElement>;
  disabled?: boolean;
  dragOver: boolean;
  edgeShadow?: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  filePreviewSize: number;
  files: File[];
  forwardedRef: ForwardedRef<HTMLDivElement>;
  handleContainerMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleDragLeave: (event: ReactDragEvent<HTMLDivElement>) => void;
  handleDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  handleDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
  handleFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  handleSend: () => void;
  handleStop: () => void;
  isTouch: boolean;
  leftContent?: ReactNode;
  maxFiles?: number;
  minRows: number;
  onFilesRemove: (index: number) => void;
  onHoverChange: (hovered: boolean) => void;
  onQueueChange?: (queue: QueuedMessage[]) => void;
  onQueueEdit: (item: QueuedMessage) => void;
  onQueueMove: (item: QueuedMessage, direction: -1 | 1) => void;
  onQueueRemove: (item: QueuedMessage) => void;
  onValueChange: (value: string) => void;
  placeholder: string;
  queue: QueuedMessage[];
  reduceMotion: boolean;
  restTextareaProps: TextareaHTMLAttributes<HTMLTextAreaElement>;
  rightContent?: ReactNode;
  setFocusVisible: (visible: boolean) => void;
  setHistoryIndex: (index: number | null) => void;
  showQueue: boolean;
  style?: CSSProperties;
  supportsFiles: boolean;
  supportsQueue: boolean;
  textareaProps?: InputMessageProps["textareaProps"];
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
}

function InputMessageView({
  accept,
  buttonLabel,
  buttonMode,
  canSend,
  className,
  clickToFocus,
  composerProps,
  disabled,
  dragOver,
  edgeShadow,
  fileInputRef,
  filePreviewSize,
  files,
  forwardedRef,
  handleContainerMouseDown,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  handleFileInputChange,
  handleKeyDown,
  handleSend,
  handleStop,
  isTouch,
  leftContent,
  maxFiles,
  minRows,
  onFilesRemove,
  onHoverChange,
  onQueueChange,
  onQueueEdit,
  onQueueMove,
  onQueueRemove,
  onValueChange,
  placeholder,
  queue,
  reduceMotion,
  restTextareaProps,
  rightContent,
  setFocusVisible,
  setHistoryIndex,
  showQueue,
  style,
  supportsFiles,
  supportsQueue,
  textareaProps,
  textareaRef,
  value,
}: InputMessageViewProps) {
  const shape = useShape();
  const ArrowUpIcon = useIcon("arrow-up");

  return (
    <LazyMotion features={domAnimation}>
      <div
        ref={forwardedRef}
        role="group"
        aria-label="Message composer"
        onMouseDown={handleContainerMouseDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col gap-1 p-2 transition-[box-shadow,color] duration-80",
          surfaceClasses(2, 2),
          shape.container,
          clickToFocus && !disabled && "cursor-text",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        style={edgeShadow ? { boxShadow: edgeShadow, ...style } : style}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        {...composerProps}
      >
        <SurfaceProvider value={2}>
          {supportsFiles && (
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple={maxFiles == null || maxFiles > 1}
              className="hidden"
              onChange={handleFileInputChange}
              aria-hidden="true"
              tabIndex={-1}
            />
          )}
          <AnimatePresence initial={false}>
            {files.length > 0 && (
              <m.div
                key="preview-row"
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ ...spring.moderate, bounce: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pb-1">
                  <AnimatePresence initial={false} mode="popLayout">
                    {files.map((file, index) => (
                      <FilePreviewTile
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        file={file}
                        onRemove={() => onFilesRemove(index)}
                        size={filePreviewSize}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </m.div>
            )}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {supportsQueue && showQueue && queue.length > 0 && (
              <m.div
                key="queue-row"
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ ...spring.moderate, bounce: 0 }}
                className="overflow-hidden"
              >
                <Reorder.Group
                  axis="y"
                  values={queue}
                  onReorder={(next) => onQueueChange?.(next)}
                  data-im-queue
                  className="flex flex-col gap-1 pb-1"
                >
                  <AnimatePresence initial={false}>
                    {queue.map((item, index) => (
                      <QueuedRow
                        key={item.id}
                        item={item}
                        index={index}
                        total={queue.length}
                        reduceMotion={reduceMotion}
                        isTouch={isTouch}
                        onEdit={onQueueEdit}
                        onRemove={onQueueRemove}
                        onMove={onQueueMove}
                      />
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              </m.div>
            )}
          </AnimatePresence>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => {
              setHistoryIndex(null);
              onValueChange(event.target.value);
            }}
            onKeyDown={handleKeyDown}
            onFocus={(event) => {
              if (event.target.matches(":focus-visible")) setFocusVisible(true);
              textareaProps?.onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocusVisible(false);
              textareaProps?.onBlur?.(event);
            }}
            placeholder={
              dragOver && supportsFiles
                ? "Drop files here to add to chat"
                : placeholder
            }
            disabled={disabled}
            rows={minRows}
            aria-label={textareaProps?.["aria-label"] ?? "Message"}
            className={cn(
              "w-full resize-none bg-transparent outline-none",
              "text-[14px] leading-5 text-foreground placeholder:text-muted-foreground",
              "px-2 py-2"
            )}
            style={{ fontVariationSettings: fontWeights.normal }}
            {...restTextareaProps}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">{leftContent}</div>
            <div className="flex items-center gap-1.5 shrink-0">
              {rightContent}
              <Button
                type="button"
                variant="primary"
                size="icon-sm"
                onClick={buttonMode === "stop" ? handleStop : handleSend}
                disabled={buttonMode === "stop" ? disabled : !canSend}
                aria-label={buttonLabel}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <m.span
                    key={buttonMode === "stop" ? "stop" : "arrow"}
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.6 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            scale: 0.6,
                            transition: spring.fast.exit,
                          }
                    }
                    transition={spring.fast}
                    className="flex items-center justify-center leading-none"
                  >
                    {buttonMode === "stop" ? (
                      <span className="h-3 w-3 rounded-[3px] bg-current" />
                    ) : (
                      <ArrowUpIcon
                        size={19}
                        className="block !h-[19px] !w-[19px]"
                      />
                    )}
                  </m.span>
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </SurfaceProvider>
      </div>
    </LazyMotion>
  );
}

// ─── InputMessage ─────────────────────────────────────────────────────────

const InputMessage = forwardRef<HTMLDivElement, InputMessageProps>(
  (
    {
      value,
      onValueChange,
      onSend,
      placeholder = "Ask me anything…",
      leftSlot,
      rightSlot,
      disabled,
      minRows = 1,
      maxRows = 8,
      clickToFocus = true,
      sendLabel = "Send",
      files,
      onFilesChange,
      accept = DEFAULT_ACCEPT,
      maxFiles,
      filePreviewSize = 80,
      textareaProps,
      status,
      onStop,
      queue,
      onQueueChange,
      showQueue = true,
      history = EMPTY_HISTORY,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const reduceMotion = useReducedMotion() ?? false;
    const isTouch = useIsTouch();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [focusVisible, setFocusVisible] = useState(false);
    const [hovered, setHovered] = useState(false);

    // Split out onFocus/onBlur so the rest-spread onto the textarea can't
    // clobber the composed handlers below.
    const {
      onFocus: _textareaOnFocus,
      onBlur: _textareaOnBlur,
      ...restTextareaProps
    } = textareaProps ?? {};

    const filesArr = useMemo(() => files ?? [], [files]);
    const {
      dragOver,
      fileInputRef,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      handleFileInputChange,
      leftContent,
      removeFile,
      rightContent,
      supportsFiles,
    } = useFileControls({
      accept,
      disabled,
      files: filesArr,
      leftSlot,
      maxFiles,
      onFilesChange,
      rightSlot,
    });

    // Sent-message history navigation (readline-style). `historyIndex` is null
    // when not browsing; `draftBeforeHistory` stashes the in-progress text so
    // ArrowDown past the newest entry restores it.
    const [historyIndex, setHistoryIndex] = useState<number | null>(null);
    const draftBeforeHistory = useRef("");
    const {
      canSend,
      editQueued,
      handleSend,
      moveQueued,
      queueItems: queueArr,
      removeQueued,
      streaming,
      supportsQueue,
    } = useQueueControls({
      disabled,
      files: filesArr,
      maxFiles,
      onFilesChange,
      onHistoryReset: () => setHistoryIndex(null),
      onQueueChange,
      onSend,
      onValueChange,
      queue,
      status,
      supportsFiles,
      textareaRef,
      value,
    });

    // Parsed line-height, cached per textarea element — getComputedStyle on
    // every keystroke is needless work when the value only changes with font
    // or zoom changes.
    const lineHeightCache = useRef<{ el: HTMLTextAreaElement; value: number } | null>(null);

    useIsoLayoutEffect(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      let cache = lineHeightCache.current;
      if (!cache || cache.el !== el) {
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
        cache = { el, value: Number.isNaN(lineHeight) ? 20 : lineHeight };
        lineHeightCache.current = cache;
      }
      const min = cache.value * minRows;
      const max = cache.value * maxRows;
      const next = Math.min(Math.max(el.scrollHeight, min), max);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
    }, [value, minRows, maxRows]);

    // Edge = the box-shadow's 1px ring, recoloured in place per state so the
    // stroke gains contrast without ever appearing to thicken (no second
    // border band layered beside it). The drop (`0 1px 1px`) is kept so the
    // composer holds its lift across states. Applied inline (not via a Tailwind
    // `shadow-*` utility, which mangles multi-layer arbitrary values) with the
    // precedence drag > focus > hover; when none are active, the className's
    // `shadow-surface-2` supplies the resting edge.
    const EDGE_DROP = "0 1px 1px -0.5px var(--shadow-color)";
    const edgeShadow = dragOver
      ? `0 0 0 1px #6B97FF, ${EDGE_DROP}`
      : focusVisible
        ? `0 0 0 1px color-mix(in oklab, var(--foreground) 20%, transparent), ${EDGE_DROP}`
        : hovered && clickToFocus && !disabled
          ? `0 0 0 1px var(--border), ${EDGE_DROP}`
          : undefined;

    const handleStop = useCallback(() => onStop?.(), [onStop]);

    // Send button morph: Stop (streaming + empty draft) → Queue (streaming +
    // draft) → Send (idle). Send and Queue share the arrow-up glyph; only the
    // Stop⇄arrow swap animates.
    const buttonMode: "send" | "queue" | "stop" = !streaming
      ? "send"
      : canSend && supportsQueue
        ? "queue"
        : onStop
          ? "stop"
          : "send";
    const buttonLabel =
      buttonMode === "stop"
        ? "Stop"
        : buttonMode === "queue"
          ? "Queue message"
          : sendLabel;

    const setCaretEnd = useCallback(() => {
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) el.setSelectionRange(el.value.length, el.value.length);
      });
    }, []);

    const handleKeyDown = useCallback(
      (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        if (e.nativeEvent.isComposing) return;

        // Readline-style history. Only plain ArrowUp/ArrowDown navigate (no
        // modifiers), and only when the caret is on the first/last line so
        // multi-line editing still works normally.
        if (
          history.length > 0 &&
          (e.key === "ArrowUp" || e.key === "ArrowDown") &&
          !e.shiftKey &&
          !e.altKey &&
          !e.metaKey &&
          !e.ctrlKey
        ) {
          const el = e.currentTarget;
          const caret = el.selectionStart ?? 0;
          const end = el.selectionEnd ?? caret;
          if (e.key === "ArrowUp" && !value.slice(0, caret).includes("\n")) {
            const start = historyIndex == null ? history.length : historyIndex;
            if (start > 0) {
              e.preventDefault();
              if (historyIndex == null) draftBeforeHistory.current = value;
              const ni = start - 1;
              setHistoryIndex(ni);
              onValueChange(history[ni]);
              setCaretEnd();
            }
            return;
          }
          if (
            e.key === "ArrowDown" &&
            historyIndex != null &&
            !value.slice(end).includes("\n")
          ) {
            e.preventDefault();
            const ni = historyIndex + 1;
            if (ni >= history.length) {
              setHistoryIndex(null);
              onValueChange(draftBeforeHistory.current);
            } else {
              setHistoryIndex(ni);
              onValueChange(history[ni]);
            }
            setCaretEnd();
            return;
          }
        }

        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      },
      [history, value, historyIndex, onValueChange, setCaretEnd, handleSend]
    );

    const handleContainerMouseDown = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!clickToFocus || disabled) return;
        const target = e.target as HTMLElement;
        if (target === textareaRef.current) return;
        if (
          target.closest(
            'button, a, input, select, textarea, [contenteditable], [role="button"], [data-im-queue]'
          )
        ) {
          return;
        }
        e.preventDefault();
        textareaRef.current?.focus();
      },
      [clickToFocus, disabled]
    );

    return (
      <InputMessageView
        accept={accept}
        buttonLabel={buttonLabel}
        buttonMode={buttonMode}
        canSend={canSend}
        className={className}
        clickToFocus={clickToFocus}
        composerProps={props}
        disabled={disabled}
        dragOver={dragOver}
        edgeShadow={edgeShadow}
        fileInputRef={fileInputRef}
        filePreviewSize={filePreviewSize}
        files={filesArr}
        forwardedRef={ref}
        handleContainerMouseDown={handleContainerMouseDown}
        handleDragLeave={handleDragLeave}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        handleFileInputChange={handleFileInputChange}
        handleKeyDown={handleKeyDown}
        handleSend={handleSend}
        handleStop={handleStop}
        isTouch={isTouch}
        leftContent={leftContent}
        maxFiles={maxFiles}
        minRows={minRows}
        onFilesRemove={removeFile}
        onHoverChange={setHovered}
        onQueueChange={onQueueChange}
        onQueueEdit={editQueued}
        onQueueMove={moveQueued}
        onQueueRemove={removeQueued}
        onValueChange={onValueChange}
        placeholder={placeholder}
        queue={queueArr}
        reduceMotion={reduceMotion}
        restTextareaProps={restTextareaProps}
        rightContent={rightContent}
        setFocusVisible={setFocusVisible}
        setHistoryIndex={setHistoryIndex}
        showQueue={showQueue}
        style={style}
        supportsFiles={supportsFiles}
        supportsQueue={supportsQueue}
        textareaProps={textareaProps}
        textareaRef={textareaRef}
        value={value}
      />
    );
  }
);

InputMessage.displayName = "InputMessage";

export { InputMessage };
export type { InputMessageProps, InputMessageSlotContext, QueuedMessage };
export default InputMessage;
