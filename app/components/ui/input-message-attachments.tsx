"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
} from "react";
import { m } from "framer-motion";
import { FileThumbnail } from "~/components/ui/file-thumbnail";
import { Tooltip } from "~/components/ui/tooltip";
import { useIcon } from "~/lib/icon-context";
import { spring } from "~/lib/springs";
import type {
  InputMessageSlot,
  InputMessageSlotContext,
} from "~/components/ui/input-message-types";

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
      // Exit: 0.06s linear — "exits should be slightly faster than enter".
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: spring.fast.exit }}
      transition={spring.fast}
      className="relative shrink-0 cursor-default group/tile"
    >
      <FileThumbnail file={file} size={size} />
      <Tooltip content="Remove" side="top">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${file.name}`}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-neutral-900 text-white opacity-0 group-hover/tile:opacity-100 transition-opacity duration-80 flex items-center justify-center cursor-pointer outline-none focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]"
        >
          <XIcon size={12} strokeWidth={2.5} />
        </button>
      </Tooltip>
    </m.div>
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

export { FilePreviewTile, useFileControls };
