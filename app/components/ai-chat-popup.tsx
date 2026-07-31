import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "framer-motion";

import {
  AiChatPanel,
  type Model,
  type Turn,
} from "~/components/ai-chat-panel";
import { AiChatPopupShell } from "~/components/ai-chat-popup-shell";
import { queuedStackMetrics } from "~/components/queued-message-stack";
import { type QueuedMessage } from "~/components/ui/input-message";
import { spring } from "~/lib/springs";

const GENERATE_MS = 10_000;
const THINK_MS = 2_500;

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
