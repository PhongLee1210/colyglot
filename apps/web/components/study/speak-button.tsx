"use client";

import { Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

const ZH_LANG = "zh-CN";

export function useChineseVoice() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) {
      return;
    }
    const load = () => {
      setVoices(
        window.speechSynthesis
          .getVoices()
          .filter((voice) => voice.lang.toLowerCase().startsWith("zh"))
      );
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  return { supported, voices };
}

export function speakChinese(
  text: string,
  voices: SpeechSynthesisVoice[]
): boolean {
  if (!("speechSynthesis" in window)) {
    return false;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = ZH_LANG;
  const voice =
    voices.find((item) => item.lang.toLowerCase().startsWith("zh")) ?? null;
  if (voice) {
    utterance.voice = voice;
  }
  window.speechSynthesis.speak(utterance);
  return true;
}

export function SpeakButton({
  text,
  className,
  onSpeakEnd,
}: {
  text: string;
  className?: string;
  onSpeakEnd?: () => void;
}) {
  const { supported, voices } = useChineseVoice();
  const [available, setAvailable] = useState(true);

  return (
    <button
      type="button"
      aria-label="Hear this word"
      onClick={() => {
        if (!supported || voices.length === 0) {
          setAvailable(false);
          return;
        }
        speakChinese(text, voices);
        if (onSpeakEnd) {
          const check = window.setInterval(() => {
            if (!window.speechSynthesis.speaking) {
              window.clearInterval(check);
              onSpeakEnd();
            }
          }, 200);
        }
      }}
      className={cn(
        "flex size-9 items-center justify-center rounded-full border border-line bg-surface-2 text-fg-muted transition-colors hover:text-primary active:scale-95",
        !available && "opacity-50",
        className
      )}
      title={available ? "Hear it" : "No Chinese voice on this device"}
    >
      <Volume2 className="size-4.5" aria-hidden />
    </button>
  );
}
