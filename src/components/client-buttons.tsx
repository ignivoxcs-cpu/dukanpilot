"use client";

import { useState } from "react";
import { Check, Copy, Share2, MessageCircle, X } from "lucide-react";
import { Button } from "./ui";
import { waLink } from "@/lib/whatsapp";

export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [done, setDone] = useState<null | "ok" | "fail">(null);
  return (
    <Button
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone("ok");
        } catch {
          setDone("fail");
        }
        setTimeout(() => setDone(null), 2000);
      }}
    >
      {done === "ok" ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      {done === "ok" ? "Copied" : done === "fail" ? "Copy failed" : label}
    </Button>
  );
}

export function ShareButton({ url, title }: { url: string; title: string }) {
  return (
    <Button
      variant="lime"
      onClick={async () => {
        if (navigator.share) {
          try {
            await navigator.share({ url, title });
          } catch {
            /* user cancelled */
          }
        } else {
          window.open(`https://wa.me/?text=${encodeURIComponent(`${title}: ${url}`)}`, "_blank", "noopener");
        }
      }}
    >
      <Share2 className="size-4" /> Share store
    </Button>
  );
}

/**
 * Lets the merchant review and edit the message, then opens WhatsApp.
 * We never claim the message was sent — only that WhatsApp was opened.
 */
export function WhatsAppComposer({
  phone,
  message,
  label,
}: {
  phone: string | null;
  message: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(message);
  const [opened, setOpened] = useState(false);
  const href = waLink(phone, text);
  return (
    <>
      <Button variant="outline" onClick={() => { setOpen(true); setOpened(false); setText(message); }}>
        <MessageCircle className="size-4 text-[#1f8a4c]" /> {label}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-forest/40 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={label}>
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-[var(--shadow-pop)] sm:rounded-3xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{label}</h3>
              <button onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg hover:bg-cream-200" aria-label="Close"><X className="size-4" /></button>
            </div>
            <label htmlFor="wa-msg" className="text-xs font-medium text-muted">Review the message before sending</label>
            <textarea id="wa-msg" value={text} onChange={(e) => setText(e.target.value)} rows={8} maxLength={1500}
              className="mt-1 w-full rounded-xl border border-line p-3 text-sm outline-none focus:border-forest-600" />
            {opened && <p className="mt-2 text-xs text-muted" role="status">WhatsApp opened. Tap send in WhatsApp to deliver the message.</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpened(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1f8a4c] px-4 text-sm font-semibold text-white hover:bg-[#18733f]">
                <MessageCircle className="size-4" /> Open WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
