import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "framer-motion";
import { Sparkles, X } from "lucide-react";

import {
  QueuedMessageStack,
  queuedStackMetrics,
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
import { cn } from "~/lib/utils";

const MODELS = ["Sonnet 5", "Sonnet 4.6", "Sonnet 4.5", "Haiku 4"] as const;
type Model = (typeof MODELS)[number];

const BALL = 56;
const PANEL_W = 400;
const PANEL_H = 560;
const GENERATE_MS = 10_000;
const THINK_MS = 2_500;

type Turn = {
  id: string;
  from: "user" | "assistant";
  text: string;
  thinking?: boolean;
  files?: File[];
};

const BALL_LABEL = "打开 AI 聊天（⌘I）";

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

function AiChatPanel({
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

interface AiChatPopupShellProps {
  open: boolean;
  reduceMotion: boolean;
  transition: { duration: number } | typeof spring.slow;
  onOpen: () => void;
  panel: ReactNode;
}

function AiChatPopupShell({
  open,
  reduceMotion,
  transition,
  onOpen,
  panel,
}: AiChatPopupShellProps) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        layout
        className={cn(
          "fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden",
          "border border-border/70 bg-background text-foreground shadow-surface-6",
          open ? "origin-bottom-right" : "origin-center cursor-pointer"
        )}
        style={{
          width: open ? PANEL_W : BALL,
          height: open ? PANEL_H : BALL,
          borderRadius: open ? 20 : BALL / 2,
        }}
        initial={false}
        transition={transition}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {open ? (
            panel
          ) : (
            <m.button
              key="ball"
              type="button"
              aria-label={BALL_LABEL}
              aria-expanded={false}
              onClick={onOpen}
              className="flex size-full items-center justify-center bg-foreground text-background"
              initial={
                reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.85 }
              }
              animate={{ opacity: 1, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: 0,
                      scale: 0.85,
                      transition: spring.fast.exit,
                    }
              }
              transition={spring.moderate}
            >
              <Sparkles className="size-5" />
            </m.button>
          )}
        </AnimatePresence>
      </m.div>
    </LazyMotion>
  );
}

export function AiChatPopup() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [composerFiles, setComposerFiles] = useState<File[]>([]);
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [chatStatus, setChatStatus] = useState<"idle" | "streaming">("idle");
  const [chat, setChat] = useState<Turn[]>([
    {
      id: "welcome",
      from: "assistant",
      text: "嗨，我是 Fluid 助手。按 ⌘I 打开；回复中继续发送会进入队列。",
    },
  ]);
  const [morphingId, setMorphingId] = useState<string | null>(null);
  const [model, setModel] = useState<Model>("Sonnet 5");
  const [attachOpen, setAttachOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [inputH, setInputH] = useState(0);

  const reduceMotion = useReducedMotion() ?? false;
  const modelRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const morphTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<QueuedMessage[]>([]);
  const respondRef = useRef<
    ((text: string, files?: File[], queuedId?: string) => void) | null
  >(null);
  const stepRef = useRef<{
    id: ReturnType<typeof setTimeout> | null;
    cb: (() => void) | null;
  }>({ id: null, cb: null });

  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  const clearStep = useCallback(() => {
    const step = stepRef.current;
    if (step.id != null) clearTimeout(step.id);
    step.id = null;
    step.cb = null;
  }, []);

  const updateQueue = useCallback((next: QueuedMessage[]) => {
    queueRef.current = next;
    setQueue(next);
  }, []);

  const finishCurrentResponse = useCallback(() => {
    setChatStatus("idle");
    const [next, ...rest] = queueRef.current;
    if (!next) return;
    updateQueue(rest);
    respondRef.current?.(next.text, next.files, next.id);
  }, [updateQueue]);

  const armStep = useCallback((cb: () => void, delay: number) => {
    const step = stepRef.current;
    if (step.id != null) clearTimeout(step.id);
    step.cb = cb;
    step.id = setTimeout(() => {
      step.id = null;
      const next = step.cb;
      step.cb = null;
      next?.();
    }, delay);
  }, []);

  const respond = useCallback(
    (text: string, files: File[] = [], queuedId?: string) => {
      const reply = `【${model}】收到「${text || "附件"}」。这是一条约 ${
        GENERATE_MS / 1000
      } 秒的模拟回复：先思考，再逐词流式输出；期间继续发送会进入上方队列。`;

      setChat((prev) => [
        ...prev,
        {
          id: queuedId ?? crypto.randomUUID(),
          from: "user",
          text,
          files,
        },
        {
          id: crypto.randomUUID(),
          from: "assistant",
          text: "",
          thinking: true,
        },
      ]);
      setChatStatus("streaming");

      if (queuedId && files.length === 0) {
        setMorphingId(queuedId);
        if (morphTimerRef.current) clearTimeout(morphTimerRef.current);
        morphTimerRef.current = setTimeout(() => setMorphingId(null), 450);
      }

      const patchAssistant = (
        patch: (message: { text: string; thinking?: boolean }) => {
          text: string;
          thinking?: boolean;
        }
      ) =>
        setChat((prev) => {
          const next = [...prev];
          for (let index = next.length - 1; index >= 0; index -= 1) {
            if (next[index]?.from === "assistant") {
              next[index] = {
                ...next[index]!,
                from: "assistant",
                ...patch(next[index]!),
              };
              break;
            }
          }
          return next;
        });

      const units = Array.from(reply);
      const streamMs = Math.max(1_000, GENERATE_MS - THINK_MS);
      const unitDelay = Math.max(16, Math.floor(streamMs / units.length));

      const revealUnit = (index: number) => {
        patchAssistant(() => ({
          text: units.slice(0, index + 1).join(""),
          thinking: false,
        }));
        if (index >= units.length - 1) {
          finishCurrentResponse();
          return;
        }
        armStep(() => revealUnit(index + 1), unitDelay);
      };

      armStep(() => revealUnit(0), THINK_MS);
    },
    [armStep, finishCurrentResponse, model]
  );

  useEffect(() => {
    respondRef.current = respond;
  }, [respond]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isChord =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "i";

      if (isChord) {
        event.preventDefault();
        toggle();
        return;
      }

      if (event.key === "Escape" && open) {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open, toggle]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (attachRef.current && !attachRef.current.contains(event.target as Node)) {
        setAttachOpen(false);
      }
      if (modelRef.current && !modelRef.current.contains(event.target as Node)) {
        setModelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const el = inputRef.current;
    if (!el || !open) return;
    const ro = new ResizeObserver(() => setInputH(el.offsetHeight));
    ro.observe(el);
    setInputH(el.offsetHeight);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat, inputH, queue, open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      inputRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    }, 220);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(
    () => () => {
      clearStep();
      if (morphTimerRef.current) clearTimeout(morphTimerRef.current);
    },
    [clearStep]
  );

  const editQueuedMsg = (item: QueuedMessage) => {
    setValue(item.text);
    setComposerFiles(item.files);
    updateQueue(queueRef.current.filter((entry) => entry.id !== item.id));
    requestAnimationFrame(() => {
      const el = inputRef.current?.querySelector("textarea");
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const handleStop = () => {
    clearStep();
    setChat((prev) => {
      const next = [...prev];
      for (let index = next.length - 1; index >= 0; index -= 1) {
        const message = next[index];
        if (message?.from !== "assistant") continue;
        if (message.thinking || message.text === "") {
          next[index] = { ...message, text: "Stopped.", thinking: false };
        } else {
          next[index] = { ...message, thinking: false };
        }
        break;
      }
      return next;
    });
    finishCurrentResponse();
  };

  const stackPad = queuedStackMetrics.collapsedHeight(queue.length);
  const transition = reduceMotion
    ? { duration: 0.01 }
    : { ...spring.slow, bounce: 0.08 };

  return (
    <AiChatPopupShell
      open={open}
      reduceMotion={reduceMotion}
      transition={transition}
      onOpen={() => setOpen(true)}
      panel={
        <AiChatPanel
          key="panel"
          model={model}
          onModelChange={setModel}
          onClose={close}
          reduceMotion={reduceMotion}
          scrollRef={scrollRef}
          inputRef={inputRef}
          attachRef={attachRef}
          modelRef={modelRef}
          inputH={inputH}
          queue={queue}
          stackPad={stackPad}
          chat={chat}
          morphingId={morphingId}
          onQueueChange={updateQueue}
          onEditQueued={editQueuedMsg}
          value={value}
          onValueChange={setValue}
          chatStatus={chatStatus}
          composerFiles={composerFiles}
          onComposerFilesChange={setComposerFiles}
          onSend={(text, files, meta) => {
            respond(text, files, meta?.queuedId);
            if (!meta?.queuedId) {
              setValue("");
              setComposerFiles([]);
            }
          }}
          onStop={handleStop}
          attachOpen={attachOpen}
          onAttachOpenChange={setAttachOpen}
          modelOpen={modelOpen}
          onModelOpenChange={setModelOpen}
        />
      }
    />
  );
}
