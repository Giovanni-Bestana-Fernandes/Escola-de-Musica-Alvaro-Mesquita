"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Paperclip, Send, Video, FileText, Download, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";

const MAX_FILE_MB = 25;

interface Props {
  conversationId: string;
  meId: string;
  meetLink: string | null;
  participants: Record<string, string>;
  initialMessages: Message[];
}

function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="break-all underline">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function dayLabel(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(iso));
}

export function ChatRoom({ conversationId, meId, meetLink, participants, initialMessages }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Tempo real: novas mensagens aparecem sem recarregar.
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function insert(row: Partial<Message>) {
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: meId, ...row })
      .select()
      .single<Message>();
    if (error) {
      setError(error.message);
      return false;
    }
    setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
    return true;
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    if (await insert({ body })) setText("");
    setSending(false);
  }

  async function upload(file: File) {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`O arquivo pode ter no máximo ${MAX_FILE_MB} MB.`);
      return;
    }
    setUploading(true);
    setError(null);
    const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
    const path = `${conversationId}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from("chat-files").upload(path, file, { contentType: file.type });
    if (error) setError(error.message);
    else await insert({ attachment_path: path, attachment_name: file.name });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function download(path: string) {
    const { data, error } = await supabase.storage.from("chat-files").createSignedUrl(path, 3600);
    if (error) return setError(error.message);
    window.open(data.signedUrl, "_blank", "noopener");
  }

  let lastDay = "";

  return (
    <div className="card flex h-[calc(100dvh-16rem)] min-h-[420px] flex-col p-0 lg:h-[calc(100dvh-14rem)]">
      {meetLink && (
        <a
          href={meetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 border-b border-accent/40 bg-accent-soft px-4 py-3 text-sm"
        >
          <span className="bg-accent flex h-8 w-8 items-center justify-center rounded-full text-fg">
            <Video className="h-4 w-4" />
          </span>
          <span className="flex-1">
            <span className="block font-medium text-accent-strong">Aula online · Google Meet</span>
            <span className="block truncate text-xs text-muted">{meetLink}</span>
          </span>
          <span className="btn btn-primary btn-sm">Entrar</span>
        </a>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">Nenhuma mensagem ainda. Diga olá! 🎵</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          const day = dayLabel(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={m.id}>
              {showDay && <p className="my-3 text-center text-xs first-letter:uppercase text-muted">{day}</p>}
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                    mine ? "bg-accent rounded-br-sm text-fg" : "rounded-bl-sm border border-line bg-surface-2",
                  )}
                >
                  {!mine && <p className="mb-0.5 text-xs font-semibold text-accent-strong">{participants[m.sender_id] ?? "—"}</p>}
                  {m.body && (
                    <p className="whitespace-pre-wrap break-words">
                      <Linkified text={m.body} />
                    </p>
                  )}
                  {m.attachment_path && (
                    <button
                      onClick={() => download(m.attachment_path!)}
                      className={cn(
                        "mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-left",
                        mine ? "bg-page/10" : "bg-page/40",
                      )}
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="break-all">{m.attachment_name}</span>
                      <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    </button>
                  )}
                  <p className={cn("mt-1 text-right text-[10px]", mine ? "text-fg/60" : "text-muted")}>
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="border-t border-line px-4 py-2 text-xs text-danger">{error}</p>}

      <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn btn-ghost px-3"
          aria-label="Enviar arquivo"
          title="Enviar arquivo (PDF, partitura, áudio...)"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={1}
          placeholder="Escreva uma mensagem ou cole um link..."
          className="input max-h-32 min-h-[42px] flex-1 resize-none"
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn btn-primary px-3" aria-label="Enviar">
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </form>
    </div>
  );
}
