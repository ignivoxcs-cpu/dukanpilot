"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  Mic,
  Square,
  Volume2,
  VolumeX,
  X,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import { LogoMark } from "../logo";
import { useVoice } from "./use-voice";
import type { AssistantReply } from "@/lib/assistant/answer";

const SUGGESTIONS = [
  "What are my total sales today?",
  "How much is outstanding?",
  "Show pending orders",
  "Best selling products",
  "This month's sales",
  "Compare this month with last month",
  "Show low-stock products",
  "Open customers",
];

type Msg =
  | { id: number; role: "user"; text: string; at: string }
  | { id: number; role: "assistant"; reply: AssistantReply; at: string }
  | { id: number; role: "error"; text: string; at: string };

const time = () => new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export function AssistantPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voice = useVoice((t) => ask(t, true));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  async function ask(text: string, fromVoice = false) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    voice.setError(null);
    setMsgs((m) => [...m, { id: ++idRef.current, role: "user", text: q, at: time() }]);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.reply) throw new Error(body?.error ?? "The assistant couldn't answer right now.");
      const reply = body.reply as AssistantReply;
      setMsgs((m) => [...m, { id: ++idRef.current, role: "assistant", reply, at: time() }]);
      if (fromVoice && voiceReplies) voice.speak(reply.speech);
      if (reply.navigate) router.push(reply.navigate);
    } catch (e) {
      setMsgs((m) => [
        ...m,
        { id: ++idRef.current, role: "error", text: e instanceof Error ? e.message : "Something went wrong.", at: time() },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 px-5 pb-4 pt-5">
        <span className="grid size-11 place-items-center rounded-full bg-forest">
          <LogoMark className="size-6" />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight">DukaanPilot AI</h2>
            <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold text-forest">Beta</span>
          </div>
          <p className="text-xs text-muted">Your voice-powered business assistant</p>
        </div>
        <button
          onClick={() => {
            setVoiceReplies((v) => !v);
            voice.stopSpeaking();
          }}
          className="grid size-9 place-items-center rounded-lg text-muted hover:bg-cream-200 hover:text-ink"
          aria-label={voiceReplies ? "Turn off spoken answers" : "Turn on spoken answers"}
          aria-pressed={voiceReplies}
          title={voiceReplies ? "Spoken answers on" : "Spoken answers off"}
        >
          {voiceReplies ? <Volume2 className="size-[18px]" /> : <VolumeX className="size-[18px]" />}
        </button>
        <button onClick={onClose} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-cream-200 hover:text-ink" aria-label="Close assistant">
          <X className="size-[18px]" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 pb-4" aria-live="polite">
        <Bubble side="left" at="">
          Hi! Ask me about your sales, payments, orders or stock — or tell me which page to open.
        </Bubble>
        {msgs.map((m) =>
          m.role === "user" ? (
            <Bubble key={m.id} side="right" at={m.at}>{m.text}</Bubble>
          ) : m.role === "error" ? (
            <div key={m.id} className="flex items-start gap-2 rounded-2xl border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger" role="alert">
              <AlertCircle className="mt-0.5 size-4 shrink-0" /> {m.text}
            </div>
          ) : (
            <ReplyCard key={m.id} reply={m.reply} at={m.at} />
          ),
        )}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted" role="status">
            <span className="typing flex gap-1 rounded-2xl bg-white px-3 py-2.5 shadow-[var(--shadow-card)]">
              <span className="size-1.5 rounded-full bg-forest" />
              <span className="size-1.5 rounded-full bg-forest" />
              <span className="size-1.5 rounded-full bg-forest" />
            </span>
            Checking your records…
          </div>
        )}
      </div>

      <div className="border-t border-line/70 px-5 pb-5 pt-3">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={busy}
              className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:border-forest-600 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        {voice.error && (
          <p className="mb-2 flex items-start gap-1.5 text-xs text-danger" role="alert">
            <AlertCircle className="mt-px size-3.5 shrink-0" /> {voice.error}
          </p>
        )}
        {voice.speaking && (
          <button onClick={voice.stopSpeaking} className="mb-2 flex items-center gap-1.5 rounded-full bg-forest px-3 py-1 text-xs font-medium text-white">
            <Square className="size-3 fill-current" /> Stop speaking
          </button>
        )}

        <form
          className="flex items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <div className="relative">
            {voice.listening && <span className="mic-ring absolute inset-0 rounded-full bg-lime" aria-hidden />}
            <button
              type="button"
              onClick={voice.listening ? voice.stop : voice.start}
              disabled={busy}
              className={clsx(
                "relative grid size-14 place-items-center rounded-full ring-4 transition-colors disabled:opacity-60",
                voice.listening ? "bg-lime text-forest ring-lime/40" : "bg-forest text-lime ring-lime/60 hover:bg-forest-700",
              )}
              aria-label={voice.listening ? "Stop listening" : "Speak your question"}
              aria-pressed={voice.listening}
              title={voice.supported.listen ? undefined : "Voice input isn't supported in this browser"}
            >
              {voice.listening ? <Square className="size-5 fill-current" /> : <Mic className="size-6" />}
            </button>
          </div>
          <div className="relative flex-1">
            <label htmlFor="assistant-input" className="sr-only">Type your question</label>
            <input
              id="assistant-input"
              value={voice.listening ? voice.interim : input}
              onChange={(e) => setInput(e.target.value)}
              readOnly={voice.listening}
              placeholder={voice.listening ? "Listening…" : "Tap to speak or type your question…"}
              maxLength={300}
              className="h-14 w-full rounded-2xl border border-line bg-white pl-4 pr-14 text-sm outline-none focus:border-forest-600"
            />
            <button
              type="submit"
              disabled={busy || !input.trim() || voice.listening}
              className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-forest text-white disabled:opacity-40"
              aria-label="Send"
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </form>
        {voice.listening && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-forest" role="status">
            <span className="size-2 rounded-full bg-danger" /> Microphone is on — listening
          </p>
        )}
      </div>
    </div>
  );
}

function Bubble({ side, at, children }: { side: "left" | "right"; at: string; children: React.ReactNode }) {
  return (
    <div className={clsx("flex flex-col", side === "right" ? "items-end" : "items-start")}>
      <div
        className={clsx(
          "max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm",
          side === "right" ? "rounded-br-md bg-lime/45 text-ink" : "rounded-bl-md bg-[#e6efdc] text-ink",
        )}
      >
        {children}
      </div>
      {at && <span className="mt-1 text-[10.5px] text-muted">{at}</span>}
    </div>
  );
}

function ReplyCard({ reply, at }: { reply: AssistantReply; at: string }) {
  return (
    <div className="flex flex-col items-start gap-2">
      {reply.metric && (
        <div className="w-full rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold text-muted">{reply.metric.label}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="tabular text-[28px] font-bold tracking-tight">{reply.metric.value}</span>
            {reply.metric.change !== undefined && reply.metric.change !== null && (
              <span
                className={clsx(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold",
                  reply.metric.change >= 0 ? "bg-lime/60 text-forest" : "bg-danger-bg text-danger",
                )}
              >
                {reply.metric.change >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {Math.abs(reply.metric.change)}%
              </span>
            )}
          </div>
          {reply.period && <p className="mt-1 text-xs text-muted">{reply.period}</p>}
        </div>
      )}
      <Bubble side="left" at={at}>
        {reply.text}
      </Bubble>
      {reply.definition && (
        <p className="max-w-[88%] text-[11px] leading-relaxed text-muted">
          <span className="font-semibold">How this is calculated:</span> {reply.definition}
          {!reply.metric && reply.period ? ` Period: ${reply.period}.` : ""}
        </p>
      )}
      {reply.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {reply.actions.map((a) => (
            <Link key={a.href} href={a.href} className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold hover:border-forest-600">
              {a.label} <ArrowRight className="size-3.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
