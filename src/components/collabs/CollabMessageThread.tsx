"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import type { CollabMessage } from "@/types";
import { initials, formatRelativeDate, cn } from "@/lib/utils";
import { CollabFileList } from "@/components/collabs/CollabFileList";
import { uploadFileDirectToR2 } from "@/lib/upload-client";

export function CollabMessageThread({ projectId, r2Enabled }: { projectId: string; r2Enabled: boolean }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<CollabMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const res = await fetch(`/api/collab-projects/${projectId}/messages`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      // keep last known state
    }
  }

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body && !attachment) return;
    setSending(true);
    setError(null);

    try {
      let res: Response;
      if (r2Enabled) {
        let uploadedAttachment: { key: string; filename: string } | undefined;
        if (attachment) {
          const uploaded = await uploadFileDirectToR2(attachment, "collab-project-file", { projectId });
          uploadedAttachment = { key: uploaded.key, filename: attachment.name };
        }
        res = await fetch(`/api/collab-projects/${projectId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, attachment: uploadedAttachment }),
        });
      } else {
        const formData = new FormData();
        formData.set("body", body);
        if (attachment) formData.set("attachment", attachment);
        res = await fetch(`/api/collab-projects/${projectId}/messages`, { method: "POST", body: formData });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send message");
        return;
      }
      setMessages((prev) => [...(prev ?? []), data.message]);
      setDraft("");
      setAttachment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  const myId = session?.user?.id;

  if (!messages) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={20} className="animate-spin text-muted-2" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-20rem)] min-h-[24rem] flex-col">
      <div className="flex-1 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-2">Say hello to your collaborators.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => {
              const fromMe = m.sender.id === myId;
              return (
                <div key={m.id} className={cn("flex flex-col", fromMe ? "items-end" : "items-start")}>
                  {!fromMe && (
                    <div className="mb-0.5 flex items-center gap-1.5 pl-1">
                      <div className="relative h-4 w-4 overflow-hidden rounded-full bg-accent">
                        {m.sender.profileImageUrl ? (
                          <Image src={m.sender.profileImageUrl} alt="" fill sizes="16px" className="object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[7px] font-semibold text-accent-foreground">
                            {initials(m.sender.producerName)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-2">{m.sender.producerName}</span>
                    </div>
                  )}
                  {m.body && (
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                        fromMe ? "rounded-br-sm bg-accent text-accent-foreground" : "rounded-bl-sm bg-surface text-foreground"
                      )}
                    >
                      {m.body}
                    </div>
                  )}
                  {m.files.length > 0 && (
                    <div className="mt-1 w-full max-w-[75%]">
                      <CollabFileList files={m.files} />
                    </div>
                  )}
                  <span className="mt-1 text-[10px] text-muted-2">{formatRelativeDate(m.createdAt)}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {attachment && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5">
          <span className="truncate text-xs text-foreground">{attachment.name}</span>
          <button onClick={() => setAttachment(null)} className="text-muted-2 hover:text-danger" aria-label="Remove attachment">
            <X size={12} />
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && setAttachment(e.target.files[0])}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-foreground"
          aria-label="Attach file"
        >
          <Paperclip size={16} />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder="Message the project..."
          className="input py-2.5"
        />
        <button
          type="submit"
          disabled={sending || (!draft.trim() && !attachment)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
          aria-label="Send"
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
