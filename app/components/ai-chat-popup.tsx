import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
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
  from: "user" | "assistant";
  text: string;
  thinking?: boolean;
  files?: File[];
  id?: string;
};

const BALL_LABEL = "打开 AI 聊天（⌘I）";

// Stable, unique id for each chat turn so list rows key by identity instead of
// array index (keeps React reconciliation correct across streaming + morphing).
let turnSeq = 0;
const nextTurnId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `turn-${(turnSeq += 1)}`;

// ─── useChatEngine ──────────────────────────────────────────────────────────
// Owns the transcript plus the simulated think→stream→settle lifecycle so the
// popup shell stays small. Every turn is minted with a stable `id`; the thinking
// placeholder keeps its id through streaming so the row reconciles in place.
function useChatEngine(model: Model) {
  const [chat, setChat] = useState<Turn[]>([
    {
      from: "assistant",
      text: "嗨，我是 Fluid 助手。按 ⌘I 打开；回复中继续发送会进入队列。",
      id: nextTurnId(),
    },
  ]);
  const [chatStatus, setChatStatus] = useState<"idle" | "streaming">("idle");
  const [morphingId, setMorphingId] = useState<string | null>(null);

  const morphTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepRef = useRef<{
    id: ReturnType<typeof setTimeout> | null;
    cb: (() => void) | null;
  }>({ id: null, cb: null });

  const clearStep = useCallback(() => {
    const step = stepRef.current;
    if (step.id != null) clearTimeout(step.id);
    step.id = null;
    step.cb = null;
  }, []);

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

      const userId = queuedId ?? nextTurnId();
      const assistantId = nextTurnId();

      setChat((prev) => [
        ...prev,
        { from: "user", text, files, id: userId },
        { from: "assistant", text: "", thinking: true, id: assistantId },
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
          setChatStatus("idle");
          return;
        }
        armStep(() => revealUnit(index + 1), unitDelay);
      };

      armStep(() => revealUnit(0), THINK_MS);
    },
    [armStep, model]
  );

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
    setChatStatus("idle");
  };

  useEffect(
    () => () => {
      clearStep();
      if (morphTimerRef.current) clearTimeout(morphTimerRef.current);
    },
    [clearStep]
  );

  return { chat, chatStatus, morphingId, respond, handleStop };
}

// ─── ChatHeader ─────────────────────────────────────────────────────────────
function ChatHeader({
  model,
  onClose,
}: {
  model: Model;
  onClose: () => void;
}) {
  return (
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
  );
}

// ─── ChatMessageList ────────────────────────────────────────────────────────
function ChatMessageList({
  scrollRef,
  chat,
  morphingId,
  bottomPad,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  chat: Turn[];
  morphingId: string | null;
  bottomPad: number;
}) {
  return (
    <div
      ref={scrollRef}
      className="absolute inset-0 overflow-y-auto px-3 scrollbar-hide"
    >
      <div
        className="flex min-h-full flex-col justify-start gap-2 pt-2"
        style={{ paddingBottom: bottomPad }}
      >
        {chat.map((message) =>
          message.thinking ? (
            <ChatMessage key={message.id} from="assistant">
              <ThinkingIndicator showIcon={false} className="px-0 py-0" />
            </ChatMessage>
          ) : message.id && message.id === morphingId ? (
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
  );
}

// ─── AttachMenu (composer left slot) ────────────────────────────────────────
function AttachMenu({
  attachRef,
  open,
  onToggle,
  onClose,
  openFilePicker,
}: {
  attachRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  openFilePicker: (acceptOverride?: string) => void;
}) {
  const PlusIcon = useIcon("plus");
  const ImageIcon = useIcon("image");
  const FileTextIcon = useIcon("square-library");

  return (
    <div ref={attachRef} className="relative">
      <Tooltip content="Add" side="top">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Attach files"
          active={open}
          onClick={onToggle}
        >
          <PlusIcon />
        </Button>
      </Tooltip>
      <AnimatePresence>
        {open && (
          <m.div
            className="absolute bottom-full left-0 z-10 mb-2"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4, transition: spring.fast.exit }}
            transition={spring.fast}
          >
            <Dropdown>
              <MenuItem
                index={0}
                label="Image"
                icon={ImageIcon}
                onSelect={() => {
                  onClose();
                  openFilePicker("image/png,image/jpeg");
                }}
              />
              <MenuItem
                index={1}
                label="PDF"
                icon={FileTextIcon}
                onSelect={() => {
                  onClose();
                  openFilePicker("application/pdf");
                }}
              />
            </Dropdown>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ModelMenu (composer right slot) ────────────────────────────────────────
function ModelMenu({
  modelRef,
  model,
  onSelect,
  open,
  onToggle,
}: {
  modelRef: RefObject<HTMLDivElement | null>;
  model: Model;
  onSelect: (name: Model) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const ChevronDownIcon = useIcon("chevron-down");

  return (
    <div ref={modelRef} className="relative">
      <Tooltip content="Select model" side="top">
        <Button
          variant="ghost"
          size="sm"
          trailingIcon={ChevronDownIcon}
          active={open}
          onClick={onToggle}
        >
          {model}
        </Button>
      </Tooltip>
      <AnimatePresence>
        {open && (
          <m.div
            className="absolute right-0 bottom-full z-10 mb-2"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4, transition: spring.fast.exit }}
            transition={spring.fast}
          >
            <Dropdown checkedIndex={MODELS.indexOf(model)}>
              {MODELS.map((name, index) => (
                <MenuItem
                  key={name}
                  index={index}
                  label={name}
                  checked={name === model}
                  onSelect={() => onSelect(name)}
                />
              ))}
            </Dropdown>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ChatPanelRefs {
  scroll: RefObject<HTMLDivElement | null>;
  input: RefObject<HTMLDivElement | null>;
  attach: RefObject<HTMLDivElement | null>;
  model: RefObject<HTMLDivElement | null>;
}

interface ChatPanelProps {
  refs: ChatPanelRefs;
  model: Model;
  onClose: () => void;
  onSelectModel: (name: Model) => void;
  chat: Turn[];
  morphingId: string | null;
  chatStatus: "idle" | "streaming";
  inputH: number;
  queue: QueuedMessage[];
  setQueue: Dispatch<SetStateAction<QueuedMessage[]>>;
  onEditQueued: (item: QueuedMessage) => void;
  value: string;
  onValueChange: (value: string) => void;
  composerFiles: File[];
  onFilesChange: (files: File[]) => void;
  onSend: (
    text: string,
    files: File[],
    meta?: { queuedId?: string }
  ) => void;
  onStop: () => void;
  attachOpen: boolean;
  setAttachOpen: Dispatch<SetStateAction<boolean>>;
  modelOpen: boolean;
  setModelOpen: Dispatch<SetStateAction<boolean>>;
}

// ─── ChatPanel (open state) ─────────────────────────────────────────────────
function ChatPanel({
  refs,
  model,
  onClose,
  onSelectModel,
  chat,
  morphingId,
  chatStatus,
  inputH,
  queue,
  setQueue,
  onEditQueued,
  value,
  onValueChange,
  composerFiles,
  onFilesChange,
  onSend,
  onStop,
  attachOpen,
  setAttachOpen,
  modelOpen,
  setModelOpen,
}: ChatPanelProps) {
  const stackPad = queuedStackMetrics.collapsedHeight(queue.length);
  const bottomPad = inputH + 8 + (queue.length > 0 ? stackPad + 8 : 0);
  const stackBottom = inputH + 8;
  const history = chat.reduce<string[]>((acc, message) => {
    if (message.from === "user" && message.text) acc.push(message.text);
    return acc;
  }, []);

  return (
    <>
      <ChatHeader model={model} onClose={onClose} />

      <div className="relative min-h-0 flex-1">
        <ChatMessageList
          scrollRef={refs.scroll}
          chat={chat}
          morphingId={morphingId}
          bottomPad={bottomPad}
        />

        <div className="absolute inset-x-3 bottom-3">
          <div className="relative">
            <QueuedMessageStack
              queue={queue}
              onQueueChange={setQueue}
              bottom={stackBottom}
              onEdit={onEditQueued}
            />

            <InputMessage
              ref={refs.input}
              value={value}
              onValueChange={onValueChange}
              status={chatStatus}
              queue={queue}
              onQueueChange={setQueue}
              showQueue={false}
              history={history}
              files={composerFiles}
              onFilesChange={onFilesChange}
              onSend={onSend}
              onStop={onStop}
              placeholder="Send while I’m responding to queue a message…"
              leftSlot={({ openFilePicker }) => (
                <AttachMenu
                  attachRef={refs.attach}
                  open={attachOpen}
                  onToggle={() => setAttachOpen((prev) => !prev)}
                  onClose={() => setAttachOpen(false)}
                  openFilePicker={openFilePicker}
                />
              )}
              rightSlot={
                <ModelMenu
                  modelRef={refs.model}
                  model={model}
                  onSelect={onSelectModel}
                  open={modelOpen}
                  onToggle={() => setModelOpen((prev) => !prev)}
                />
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}

export function AiChatPopup() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [composerFiles, setComposerFiles] = useState<File[]>([]);
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [model, setModel] = useState<Model>("Sonnet 5");
  const [attachOpen, setAttachOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [inputH, setInputH] = useState(0);

  const { chat, chatStatus, morphingId, respond, handleStop } =
    useChatEngine(model);

  const reduceMotion = useReducedMotion() ?? false;
  const modelRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => setOpen(false), []);

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

  const editQueuedMsg = (item: QueuedMessage) => {
    setValue(item.text);
    setComposerFiles(item.files);
    setQueue((prev) => prev.filter((entry) => entry.id !== item.id));
    requestAnimationFrame(() => {
      const el = inputRef.current?.querySelector("textarea");
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const transition = reduceMotion
    ? { duration: 0.01 }
    : { ...spring.slow, bounce: 0.08 };

  return (
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
      onClick={() => {
        if (!open) setOpen(true);
      }}
      onKeyDown={(event) => {
        if (open) return;
        if (
          event.key === "Enter" ||
          event.key === " " ||
          event.key === "Spacebar"
        ) {
          event.preventDefault();
          setOpen(true);
        }
      }}
      tabIndex={open ? -1 : 0}
      role={open ? "dialog" : "button"}
      aria-label={open ? "AI 聊天" : BALL_LABEL}
      aria-expanded={open}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {open ? (
          <m.div
            key="panel"
            className="flex h-full min-h-0 w-full flex-col"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, transition: spring.fast.exit }
            }
            transition={{ ...spring.moderate, delay: reduceMotion ? 0 : 0.06 }}
            onClick={(event) => event.stopPropagation()}
          >
            <ChatPanel
              refs={{
                scroll: scrollRef,
                input: inputRef,
                attach: attachRef,
                model: modelRef,
              }}
              model={model}
              onClose={close}
              onSelectModel={(name) => {
                setModel(name);
                setModelOpen(false);
              }}
              chat={chat}
              morphingId={morphingId}
              chatStatus={chatStatus}
              inputH={inputH}
              queue={queue}
              setQueue={setQueue}
              onEditQueued={editQueuedMsg}
              value={value}
              onValueChange={setValue}
              composerFiles={composerFiles}
              onFilesChange={setComposerFiles}
              onSend={(text, files, meta) => {
                respond(text, files, meta?.queuedId);
                if (!meta?.queuedId) {
                  setValue("");
                  setComposerFiles([]);
                }
              }}
              onStop={handleStop}
              attachOpen={attachOpen}
              setAttachOpen={setAttachOpen}
              modelOpen={modelOpen}
              setModelOpen={setModelOpen}
            />
          </m.div>
        ) : (
          <m.div
            key="ball"
            className="flex size-full items-center justify-center bg-foreground text-background"
            initial={
              reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.85 }
            }
            animate={{ opacity: 1, scale: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.85, transition: spring.fast.exit }
            }
            transition={spring.moderate}
          >
            <Sparkles className="size-5" />
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}
