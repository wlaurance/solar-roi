"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "@/components/icons";
import { track } from "@/lib/analytics";

type Props = {
  projectId: string;
  unlocked: boolean;
  lockedHref?: string;
};

export function SolarBotWidget({
  projectId,
  unlocked,
  lockedHref = `/projects/${projectId}/hoa`,
}: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/hoa/chat",
        body: { projectId },
      }),
    [projectId],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: `hoa-bot-${projectId}`,
    transport,
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, busy]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy || !unlocked) return;
    setInput("");
    track("hoa_bot_message_sent", { project_id: projectId });
    await sendMessage({ text });
  }

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {open ? (
        <div className="pointer-events-auto flex h-[min(28rem,70vh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-stone-2/90 bg-surface shadow-xl shadow-ink/10">
          <header className="flex items-center justify-between gap-2 border-b border-stone-2/80 bg-canopy px-4 py-3 text-white">
            <div>
              <p className="font-display text-lg leading-none">Solar bot</p>
              <p className="mt-1 text-[11px] text-white/80">
                HOA approval assistant
              </p>
            </div>
            <button
              type="button"
              className="rounded-md p-1.5 hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </header>

          {!unlocked ? (
            <div className="flex flex-1 flex-col justify-center gap-3 p-5 text-sm text-ink-muted">
              <p>
                Unlock the HOA package to chat with Solar bot — upload CC&Rs,
                extract requirements, and draft your application.
              </p>
              <a href={lockedHref} className="btn-primary self-start">
                Open HOA package
              </a>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
                {messages.length === 0 ? (
                  <p className="rounded-lg bg-sage/40 px-3 py-2 text-ink-muted">
                    Hi — upload your HOA rules, then ask me to extract
                    requirements or draft the application.
                  </p>
                ) : null}
                {messages.map((m) => {
                  const text = m.parts
                    ?.filter((p) => p.type === "text")
                    .map((p) => ("text" in p ? String(p.text) : ""))
                    .join("")
                    .trim();
                  if (!text && m.role !== "assistant") return null;
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[90%] rounded-2xl px-3 py-2 ${
                          isUser
                            ? "bg-canopy text-white"
                            : "bg-stone-2/70 text-ink"
                        }`}
                      >
                        {text ||
                          (busy && m.role === "assistant"
                            ? "Working…"
                            : "…")}
                      </div>
                    </div>
                  );
                })}
                {error ? (
                  <p className="text-xs text-danger">{error.message}</p>
                ) : null}
                <div ref={bottomRef} />
              </div>
              <form
                onSubmit={onSubmit}
                className="border-t border-stone-2/80 p-2"
              >
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-sm"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Solar bot…"
                    disabled={busy}
                  />
                  <button
                    type="submit"
                    className="btn-primary px-3"
                    disabled={busy || !input.trim()}
                  >
                    {busy ? (
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      "Send"
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-canopy text-white shadow-lg shadow-canopy/30 transition hover:bg-canopy-deep"
        onClick={() => {
          setOpen((v) => !v);
          track("hoa_bot_toggled", { open: !open, project_id: projectId });
        }}
        aria-label={open ? "Close Solar bot" : "Open Solar bot"}
      >
        <Icons.sun className="h-6 w-6" />
      </button>
    </div>
  );
}
