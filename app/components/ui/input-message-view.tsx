"use client";

import type {
  ChangeEvent,
  CSSProperties,
  DragEvent as ReactDragEvent,
  ForwardedRef,
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  RefObject,
  TextareaHTMLAttributes,
} from "react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  Reorder,
} from "framer-motion";
import { FilePreviewTile } from "~/components/ui/input-message-attachments";
import { QueuedRow } from "~/components/ui/input-message-queue";
import type {
  InputMessageProps,
  QueuedMessage,
} from "~/components/ui/input-message-types";
import { Button } from "~/components/ui/button";
import { fontWeights } from "~/lib/font-weight";
import { useIcon } from "~/lib/icon-context";
import { useShape } from "~/lib/shape-context";
import { spring } from "~/lib/springs";
import { surfaceClasses } from "~/lib/surface-classes";
import { SurfaceProvider } from "~/lib/surface-context";
import { cn } from "~/lib/utils";

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
  handleContainerMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
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

export { InputMessageView };
export type { ButtonMode };
