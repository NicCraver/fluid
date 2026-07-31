import type {
  HTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

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
  | ((context: InputMessageSlotContext) => ReactNode);

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

export { DEFAULT_ACCEPT, EMPTY_HISTORY };
export type {
  InputMessageProps,
  InputMessageSlot,
  InputMessageSlotContext,
  QueuedMessage,
};
