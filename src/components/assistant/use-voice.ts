"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// Minimal typings for the Web Speech API (not in TS DOM lib everywhere).
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type Ctor = new () => SpeechRecognitionLike;

function getRecognition(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone permission was denied. You can type your question instead, or allow the microphone in your browser settings.",
  "service-not-allowed": "Voice input isn't allowed in this browser. Please type your question.",
  "no-speech": "I didn't hear anything. Tap the mic and try again.",
  "audio-capture": "No microphone was found on this device.",
  network: "Voice recognition needs an internet connection. Please type instead.",
};

export function useVoice(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef(onFinal);
  useEffect(() => {
    finalRef.current = onFinal;
  }, [onFinal]);

  const canListen = useSyncExternalStore(noopSubscribe, () => !!getRecognition(), () => false);
  const canSpeak = useSyncExternalStore(noopSubscribe, () => "speechSynthesis" in window, () => false);
  const supported = { listen: canListen, speak: canSpeak };

  // Microphone permission is requested by the browser only when start() runs.
  const start = useCallback(() => {
    const R = getRecognition();
    if (!R) {
      setError("Voice input isn't supported in this browser. Try Chrome or Edge, or type your question.");
      return;
    }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setError(null);
    setInterim("");
    const rec = new R();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i]![0]!.transcript;
        if (e.results[i]!.isFinal) finalText = text;
      }
      setInterim(text);
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted") setError(ERRORS[e.error] ?? "Voice input stopped unexpectedly. Please try again or type.");
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      recRef.current = null;
      if (finalText.trim()) finalRef.current(finalText.trim());
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Couldn't start the microphone. Please try again.");
    }
  }, []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/₹\s?([\d,.]+)/g, "$1 rupees"));
    u.lang = "en-IN";
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang === "en-IN");
    if (voice) u.voice = voice;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => () => {
    recRef.current?.abort();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  return { supported, listening, interim, speaking, error, setError, start, stop, speak, stopSpeaking };
}
