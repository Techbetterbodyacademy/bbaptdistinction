"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition, startTransition } from "react";

export type MessageRow = {
  id: string;
  sender: "coach" | "client";
  body: string;
  created_at: string;
  reply_to_id?: string | null;
  pending?: boolean;
};

type Props = {
  threadId: string;
  initialMessages: MessageRow[];
  /** Which side this current user is on. Their messages render right + blue. */
  mySide: "coach" | "client";
  /** Server action that takes a FormData with thread_id, body, optional reply_to_id. */
  sendAction: (formData: FormData) => Promise<void> | void;
  emptyHint?: string;
};

export function MessageThread({ threadId, initialMessages, mySide, sendAction, emptyHint }: Props) {
  const [, startSubmit] = useTransition();
  const [optimisticMessages, addOptimistic] = useOptimistic<MessageRow[], MessageRow>(
    initialMessages,
    (state, newMessage) => [...state, newMessage]
  );
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Build a lookup of message id -> message for resolving reply_to_id parents (incl. optimistic)
  const messagesById = useMemo(() => {
    const map = new Map<string, MessageRow>();
    for (const m of optimisticMessages) map.set(m.id, m);
    return map;
  }, [optimisticMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [optimisticMessages.length]);

  function submit() {
    const body = draft.trim();
    if (!body) return;

    const fd = new FormData();
    fd.append("thread_id", threadId);
    fd.append("body", body);
    if (replyTo) fd.append("reply_to_id", replyTo.id);

    const currentReply = replyTo;
    setDraft("");
    setReplyTo(null);
    textareaRef.current?.focus();

    startSubmit(() => {
      startTransition(() => {
        addOptimistic({
          id: `pending-${Date.now()}`,
          sender: mySide,
          body,
          created_at: new Date().toISOString(),
          reply_to_id: currentReply?.id ?? null,
          pending: true
        });
      });
      sendAction(fd);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape" && replyTo) {
      e.preventDefault();
      setReplyTo(null);
    }
  }

  function startReplyTo(message: MessageRow) {
    if (message.id.startsWith("pending-")) return;
    setReplyTo(message);
    textareaRef.current?.focus();
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 mb-6 overflow-y-auto px-4 sm:px-6 lg:px-10"
        style={{ minHeight: "300px" }}
      >
        {optimisticMessages.length === 0 ? (
          <div className="text-center py-12 text-sm text-[var(--color-muted)]">
            {emptyHint ?? "Start the conversation."}
          </div>
        ) : (
          optimisticMessages.map((m) => {
            const mine = m.sender === mySide;
            const parent = m.reply_to_id ? messagesById.get(m.reply_to_id) ?? null : null;
            return (
              <div key={m.id} className={`group flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {mine ? (
                  <button
                    type="button"
                    onClick={() => startReplyTo(m)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] uppercase tracking-[1.5px] font-bold text-[var(--color-muted)] hover:text-[var(--color-blue-glow)] px-2 py-1 shrink-0 self-center"
                    aria-label="Reply to message"
                  >
                    Reply
                  </button>
                ) : null}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    mine
                      ? "bg-[var(--color-blue)] text-black"
                      : "bg-[var(--color-surface)] border border-[var(--color-line)]"
                  } ${m.pending ? "opacity-70" : ""}`}
                >
                  {parent ? (
                    <div
                      className={`text-xs mb-2 pl-2.5 border-l-2 rounded-r ${
                        mine
                          ? "border-black/30 bg-black/5 text-black/70"
                          : "border-[var(--color-blue-glow)] bg-[rgba(0,174,239,0.06)] text-[var(--color-muted)]"
                      } py-1.5 pr-2`}
                    >
                      <div className="text-[9px] uppercase tracking-[1.5px] font-bold mb-0.5 opacity-80">
                        Replying to {parent.sender === mySide ? "yourself" : parent.sender === "coach" ? "coach" : "client"}
                      </div>
                      <div className="truncate">{parent.body}</div>
                    </div>
                  ) : null}
                  <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                  <div className={`text-[10px] mt-1 flex items-center gap-1.5 ${mine ? "text-black/60" : "text-[var(--color-subtle)]"}`}>
                    <span>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                    {m.pending ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                        <span>Sending</span>
                      </span>
                    ) : null}
                  </div>
                </div>
                {!mine ? (
                  <button
                    type="button"
                    onClick={() => startReplyTo(m)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] uppercase tracking-[1.5px] font-bold text-[var(--color-muted)] hover:text-[var(--color-blue-glow)] px-2 py-1 shrink-0 self-center"
                    aria-label="Reply to message"
                  >
                    Reply
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <div className="sticky bottom-0 bg-[var(--color-bg)] border-t border-[var(--color-line)]">
        {replyTo ? (
          <div className="px-4 sm:px-6 lg:px-10 pt-3 pb-2 flex items-start gap-3 bg-[rgba(0,174,239,0.04)] border-b border-[var(--color-line)]">
            <div className="w-1 self-stretch rounded bg-[var(--color-blue-glow)]" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[1.5px] font-bold text-[var(--color-blue-glow)] mb-0.5">
                Replying to {replyTo.sender === mySide ? "yourself" : replyTo.sender === "coach" ? "coach" : "client"}
              </div>
              <div className="text-xs text-[var(--color-muted)] truncate">{replyTo.body}</div>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              aria-label="Cancel reply"
              className="text-[var(--color-muted)] hover:text-[var(--color-ink)] shrink-0 leading-none text-lg px-1"
            >
              ×
            </button>
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex gap-2 pt-3 pb-4 px-4 sm:px-6 lg:px-10"
        >
          <textarea
            ref={textareaRef}
            name="body"
            rows={1}
            required
            placeholder={replyTo ? "Write your reply…   (Enter to send, Esc to cancel)" : "Type a message…   (Enter to send, Shift+Enter for newline)"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="input flex-1 resize-none"
            style={{ minHeight: "44px" }}
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="btn btn-primary self-end disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
}
