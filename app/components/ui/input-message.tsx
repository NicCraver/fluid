"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useReducedMotion } from "framer-motion";
import { useFileControls } from "~/components/ui/input-message-attachments";
import {
  useIsTouch,
  useQueueControls,
} from "~/components/ui/input-message-queue";
import {
  DEFAULT_ACCEPT,
  EMPTY_HISTORY,
  type InputMessageProps,
} from "~/components/ui/input-message-types";
import {
  InputMessageView,
  type ButtonMode,
} from "~/components/ui/input-message-view";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
const EDGE_DROP = "0 1px 1px -0.5px var(--shadow-color)";

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
    // clobber the composed handlers in the view.
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
    const lineHeightCache = useRef<{
      element: HTMLTextAreaElement;
      value: number;
    } | null>(null);

    useIsoLayoutEffect(() => {
      const element = textareaRef.current;
      if (!element) return;
      element.style.height = "auto";
      let cache = lineHeightCache.current;
      if (!cache || cache.element !== element) {
        const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
        cache = {
          element,
          value: Number.isNaN(lineHeight) ? 20 : lineHeight,
        };
        lineHeightCache.current = cache;
      }
      const min = cache.value * minRows;
      const max = cache.value * maxRows;
      const next = Math.min(Math.max(element.scrollHeight, min), max);
      element.style.height = `${next}px`;
      element.style.overflowY = element.scrollHeight > max ? "auto" : "hidden";
    }, [value, minRows, maxRows]);

    // Recolour the surface's existing one-pixel edge without thickening it.
    // State precedence is drag > focus > hover.
    const edgeShadow = dragOver
      ? `0 0 0 1px #6B97FF, ${EDGE_DROP}`
      : focusVisible
        ? `0 0 0 1px color-mix(in oklab, var(--foreground) 20%, transparent), ${EDGE_DROP}`
        : hovered && clickToFocus && !disabled
          ? `0 0 0 1px var(--border), ${EDGE_DROP}`
          : undefined;

    const handleStop = useCallback(() => onStop?.(), [onStop]);

    // Send button morph: Stop (streaming + empty draft) → Queue (streaming +
    // draft) → Send (idle). Send and Queue share the arrow-up glyph.
    const buttonMode: ButtonMode = !streaming
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
        const element = textareaRef.current;
        if (element) {
          element.setSelectionRange(element.value.length, element.value.length);
        }
      });
    }, []);

    const handleKeyDown = useCallback(
      (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
        if (event.nativeEvent.isComposing) return;

        // Readline-style history. Only plain ArrowUp/ArrowDown navigate, and
        // only at the first/last line so multiline editing still works.
        if (
          history.length > 0 &&
          (event.key === "ArrowUp" || event.key === "ArrowDown") &&
          !event.shiftKey &&
          !event.altKey &&
          !event.metaKey &&
          !event.ctrlKey
        ) {
          const element = event.currentTarget;
          const caret = element.selectionStart ?? 0;
          const end = element.selectionEnd ?? caret;
          if (
            event.key === "ArrowUp" &&
            !value.slice(0, caret).includes("\n")
          ) {
            const start =
              historyIndex == null ? history.length : historyIndex;
            if (start > 0) {
              event.preventDefault();
              if (historyIndex == null) draftBeforeHistory.current = value;
              const nextIndex = start - 1;
              setHistoryIndex(nextIndex);
              onValueChange(history[nextIndex]);
              setCaretEnd();
            }
            return;
          }
          if (
            event.key === "ArrowDown" &&
            historyIndex != null &&
            !value.slice(end).includes("\n")
          ) {
            event.preventDefault();
            const nextIndex = historyIndex + 1;
            if (nextIndex >= history.length) {
              setHistoryIndex(null);
              onValueChange(draftBeforeHistory.current);
            } else {
              setHistoryIndex(nextIndex);
              onValueChange(history[nextIndex]);
            }
            setCaretEnd();
            return;
          }
        }

        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          handleSend();
        }
      },
      [history, value, historyIndex, onValueChange, setCaretEnd, handleSend]
    );

    const handleContainerMouseDown = useCallback(
      (event: ReactMouseEvent<HTMLDivElement>) => {
        if (!clickToFocus || disabled) return;
        const target = event.target as HTMLElement;
        if (target === textareaRef.current) return;
        if (
          target.closest(
            'button, a, input, select, textarea, [contenteditable], [role="button"], [data-im-queue]'
          )
        ) {
          return;
        }
        event.preventDefault();
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
export type {
  InputMessageProps,
  InputMessageSlotContext,
  QueuedMessage,
} from "~/components/ui/input-message-types";
export default InputMessage;
