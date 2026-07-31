import { type RefObject } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Sparkles, X } from "lucide-react";

import {
  QueuedMessageStack,
} from "~/components/queued-message-stack";
import { Button } from "~/components/ui/button";
import { ChatMessage } from "~/components/ui/chat-message";
import { Dropdown } from "~/components/ui/dropdown";
import {
  InputMessage,
  type InputMessageProps,
  type QueuedMessage,
} from "~/components/ui/input-message";
import { MenuItem } from "~/components/ui/menu-item";
import { ThinkingIndicator } from "~/components/ui/thinking-indicator";
import { Tooltip } from "~/components/ui/tooltip";
import { useIcon } from "~/lib/icon-context";
import { spring } from "~/lib/springs";

const MODELS = ["Sonnet 5", "Sonnet 4.6", "Sonnet 4.5", "Haiku 4"] as const;

export type Model = (typeof MODELS)[number];

export type Turn = {
  id: string;
  from: "user" | "assistant";
  text: string;
  thinking?: boolean;
  files?: File[];
};

function userHistory(chat: Turn[]) {
  return chat.reduce<string[]>((history, message) => {
    if (message.from === "user" && message.text) history.push(message.text);
    return history;
  }, []);
}

interface AiChatPanelProps {
  model: Model;
  onModelChange: (model: Model) => void;
  onClose: () => void;
  reduceMotion: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLDivElement | null>;
  attachRef: RefObject<HTMLDivElement | null>;
  modelRef: RefObject<HTMLDivElement | null>;
  inputH: number;
  queue: QueuedMessage[];
  stackPad: number;
  chat: Turn[];
  morphingId: string | null;
  onQueueChange: (queue: QueuedMessage[]) => void;
  onEditQueued: (item: QueuedMessage) => void;
  value: string;
  onValueChange: (value: string) => void;
  chatStatus: "idle" | "streaming";
  composerFiles: File[];
  onComposerFilesChange: (files: File[]) => void;
  onSend: InputMessageProps["onSend"];
  onStop: () => void;
  attachOpen: boolean;
  onAttachOpenChange: (open: boolean) => void;
  modelOpen: boolean;
  onModelOpenChange: (open: boolean) => void;
}

export function AiChatPanel({
  model,
  onModelChange,
  onClose,
  reduceMotion,
  scrollRef,
  inputRef,
  attachRef,
  modelRef,
  inputH,
  queue,
  stackPad,
  chat,
  morphingId,
  onQueueChange,
  onEditQueued,
  value,
  onValueChange,
  chatStatus,
  composerFiles,
  onComposerFilesChange,
  onSend,
  onStop,
  attachOpen,
  onAttachOpenChange,
  modelOpen,
  onModelOpenChange,
}: AiChatPanelProps) {
  const PlusIcon = useIcon("plus");
  const ChevronDownIcon = useIcon("chevron-down");
  const ImageIcon = useIcon("image");
  const FileTextIcon = useIcon("square-library");

  return (
    <m.div
      role="dialog"
      aria-label="AI 聊天"
      className="flex h-full min-h-0 w-full flex-col"
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, transition: spring.fast.exit }
      }
      transition={{ ...spring.moderate, delay: reduceMotion ? 0 : 0.06 }}
    >
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-background">
            <Sparkles className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">AI Chat</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {model} · ⌘I / Esc
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="关闭"
          onClick={onClose}
          leadingIcon={X}
        />
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto px-3 scrollbar-hide"
        >
          <div
            className="flex min-h-full flex-col justify-start gap-2 pt-2"
            style={{
              paddingBottom:
                inputH + 8 + (queue.length > 0 ? stackPad + 8 : 0),
            }}
          >
            {chat.map((message) =>
              message.thinking ? (
                <ChatMessage key={message.id} from="assistant">
                  <ThinkingIndicator showIcon={false} className="px-0 py-0" />
                </ChatMessage>
              ) : message.id === morphingId ? (
                <ChatMessage
                  key={message.id}
                  from={message.from}
                  layoutId={`qm-${message.id}`}
                  layout
                  initial={false}
                  transition={spring.moderate}
                >
                  <m.span layout className="inline-block align-top">
                    {message.text}
                  </m.span>
                </ChatMessage>
              ) : (
                <ChatMessage
                  key={message.id}
                  from={message.from}
                  files={message.files}
                >
                  {message.text}
                </ChatMessage>
              )
            )}
          </div>
        </div>

        <div className="absolute inset-x-3 bottom-3">
          <div className="relative">
            <QueuedMessageStack
              queue={queue}
              onQueueChange={onQueueChange}
              bottom={inputH + 8}
              onEdit={onEditQueued}
            />

            <InputMessage
              ref={inputRef}
              value={value}
              onValueChange={onValueChange}
              status={chatStatus}
              queue={queue}
              onQueueChange={onQueueChange}
              showQueue={false}
              history={userHistory(chat)}
              files={composerFiles}
              onFilesChange={onComposerFilesChange}
              onSend={onSend}
              onStop={onStop}
              placeholder="Send while I’m responding to queue a message…"
              leftSlot={({ openFilePicker }) => (
                <div ref={attachRef} className="relative">
                  <Tooltip content="Add" side="top">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Attach files"
                      active={attachOpen}
                      onClick={() => onAttachOpenChange(!attachOpen)}
                    >
                      <PlusIcon />
                    </Button>
                  </Tooltip>
                  <AnimatePresence>
                    {attachOpen && (
                      <m.div
                        className="absolute bottom-full left-0 z-10 mb-2"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{
                          opacity: 0,
                          y: 4,
                          transition: spring.fast.exit,
                        }}
                        transition={spring.fast}
                      >
                        <Dropdown>
                          <MenuItem
                            index={0}
                            label="Image"
                            icon={ImageIcon}
                            onSelect={() => {
                              onAttachOpenChange(false);
                              openFilePicker("image/png,image/jpeg");
                            }}
                          />
                          <MenuItem
                            index={1}
                            label="PDF"
                            icon={FileTextIcon}
                            onSelect={() => {
                              onAttachOpenChange(false);
                              openFilePicker("application/pdf");
                            }}
                          />
                        </Dropdown>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              rightSlot={
                <div ref={modelRef} className="relative">
                  <Tooltip content="Select model" side="top">
                    <Button
                      variant="ghost"
                      size="sm"
                      trailingIcon={ChevronDownIcon}
                      active={modelOpen}
                      onClick={() => onModelOpenChange(!modelOpen)}
                    >
                      {model}
                    </Button>
                  </Tooltip>
                  <AnimatePresence>
                    {modelOpen && (
                      <m.div
                        className="absolute right-0 bottom-full z-10 mb-2"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{
                          opacity: 0,
                          y: 4,
                          transition: spring.fast.exit,
                        }}
                        transition={spring.fast}
                      >
                        <Dropdown checkedIndex={MODELS.indexOf(model)}>
                          {MODELS.map((name, index) => (
                            <MenuItem
                              key={name}
                              index={index}
                              label={name}
                              checked={name === model}
                              onSelect={() => {
                                onModelChange(name);
                                onModelOpenChange(false);
                              }}
                            />
                          ))}
                        </Dropdown>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </m.div>
  );
}
