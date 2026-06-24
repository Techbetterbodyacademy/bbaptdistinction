"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition, startTransition } from "react";

export type MessageRow = {
  id: string;
  sender: "coach" | "client";
  body: string;
  created_at: string;
  pending?: boolean;
};

type Props = {
  threadId: string;
  initialMessages: MessageRow[];
  /** Which side this current user is on. Their messages render right + blue. */
  mySide: "coach" | "client";
  /** Server action that takes a FormData with thread_id + body. */
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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

    setDraft("");
    textareaRef.current?.focus();

    startSubmit(() => {
      startTransition(() => {
        addOptimistic({
          id: `pending-${Date.now()}`,
          sender: mySide,
          body,
          created_at: new Date().toISOString(),
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
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    mine
                      ? "bg-[var(--color-blue)] text-black"
                      : "bg-[var(--color-surface)] border border-[var(--color-line)]"
                  } ${m.pending ? "opacity-70" : ""}`}
                >
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
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex gap-2 sticky bottom-0 bg-[var(--color-bg)] pt-3 pb-4 px-4 sm:px-6 lg:px-10 border-t border-[var(--color-line)]"
      >
        <textarea
          ref={textareaRef}
          name="body"
          rows={1}
          required
          placeholder="Type a message…   (Enter to send, Shift+Enter for newline)"
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
    </>
  );
}
