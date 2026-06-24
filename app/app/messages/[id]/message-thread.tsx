"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition, startTransition } from "react";
import { sendMessageAsCoach } from "./actions";

type Message = {
  id: string;
  sender: "coach" | "client";
  body: string;
  created_at: string;
  pending?: boolean;
  failed?: boolean;
};

type Props = {
  threadId: string;
  initialMessages: Message[];
};

export function MessageThread({ threadId, initialMessages }: Props) {
  const [, startSubmit] = useTransition();
  const [optimisticMessages, addOptimistic] = useOptimistic<Message[], Message>(
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
          sender: "coach",
          body,
          created_at: new Date().toISOString(),
          pending: true
        });
      });
      // Fire the server action (it triggers a redirect/refresh once committed)
      sendMessageAsCoach(fd);
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
            Start the conversation. Say hi, ask about their week, share a quick tip.
          </div>
        ) : (
          optimisticMessages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === "coach" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  m.sender === "coach"
                    ? "bg-[var(--color-blue)] text-black"
                    : "bg-[var(--color-surface)] border border-[var(--color-line)]"
                } ${m.pending ? "opacity-70" : ""}`}
              >
                <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                <div className={`text-[10px] mt-1 flex items-center gap-1.5 ${m.sender === "coach" ? "text-black/60" : "text-[var(--color-subtle)]"}`}>
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
          ))
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
