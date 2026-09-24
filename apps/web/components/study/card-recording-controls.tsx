"use client";

import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { speakChinese, useChineseVoice } from "@/components/study/speak-button";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const RECORDING_MAX_MS = 10_000;

type RecordingState = "idle" | "recording" | "saving" | "saved";

export function CardRecordingControls({
  cardId,
  speakText,
}: {
  cardId: string;
  speakText: string;
}) {
  const { toast } = useToast();
  const { voices } = useChineseVoice();
  const [state, setState] = useState<RecordingState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [hasTake, setHasTake] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const capTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const takeUrl = `/api/cards/${cardId}/recording`;

  useEffect(() => {
    let cancelled = false;
    fetch(takeUrl, { method: "HEAD" })
      .then((response) => {
        if (!cancelled) {
          setHasTake(response.ok);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [takeUrl]);

  useEffect(() => {
    return () => {
      if (capTimer.current) {
        window.clearTimeout(capTimer.current);
      }
      if (tickTimer.current) {
        window.clearInterval(tickTimer.current);
      }
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function clearTimers() {
    if (capTimer.current) {
      window.clearTimeout(capTimer.current);
      capTimer.current = null;
    }
    if (tickTimer.current) {
      window.clearInterval(tickTimer.current);
      tickTimer.current = null;
    }
  }

  async function startRecording() {
    if (state === "recording" || state === "saving") {
      return;
    }
    if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
      toast("Recording is not supported on this device", "danger");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast("Microphone permission denied — check browser settings", "danger");
      return;
    }
    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : undefined;
    const instance = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined
    );
    chunks.current = [];
    instance.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.current.push(event.data);
      }
    };
    instance.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      void upload();
    };
    recorder.current = instance;
    instance.start();
    setState("recording");
    setSecondsLeft(10);
    tickTimer.current = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    capTimer.current = window.setTimeout(() => {
      stopRecording();
    }, RECORDING_MAX_MS);
  }

  function stopRecording() {
    clearTimers();
    if (recorder.current?.state === "recording") {
      recorder.current.stop();
    }
  }

  async function upload() {
    setState("saving");
    const blob = new Blob(chunks.current, { type: "audio/webm" });
    const form = new FormData();
    const extension = blob.type.includes("webm") ? "webm" : "audio";
    form.append("take", blob, `take.${extension}`);
    try {
      const response = await fetch(takeUrl, { method: "POST", body: form });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Upload failed");
      }
      setState("saved");
      setHasTake(true);
      toast("Take saved to this card", "success");
    } catch (error) {
      setState("idle");
      toast(error instanceof Error ? error.message : "Upload failed", "danger");
    }
  }

  function playTake() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.src = `${takeUrl}?v=${Date.now()}`;
    void audio.play().catch(() => {
      toast("Couldn't play your take", "danger");
    });
  }

  function compare() {
    speakChinese(speakText, voices);
    const check = window.setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        window.clearInterval(check);
        playTake();
      }
    }, 250);
  }

  return (
    <div className="mt-1 flex w-full flex-col gap-2 rounded-xl border border-line bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          <Mic className="size-3.5" aria-hidden />
          Say it
        </span>
        {state === "recording" ? (
          <span className="flex items-center gap-2 text-xs font-bold text-red-500">
            <span className="size-2 animate-pulse rounded-full bg-red-500" />
            {secondsLeft}s
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {state === "recording" ? (
          <Button variant="danger" size="sm" onClick={stopRecording}>
            Stop ({secondsLeft}s)
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={startRecording}
            disabled={state === "saving"}
            aria-label="Record yourself saying this word"
          >
            {state === "saving"
              ? "Saving…"
              : hasTake
                ? "Re-record"
                : "Record yourself"}
          </Button>
        )}
        {hasTake ? (
          <>
            <Button variant="ghost" size="sm" onClick={playTake}>
              Play my take
            </Button>
            <Button variant="ghost" size="sm" onClick={compare}>
              Compare
            </Button>
          </>
        ) : null}
      </div>
      <p className="text-center text-[11px] text-fg-subtle">
        {hasTake
          ? "Compare plays the reference voice, then your take"
          : "10 second cap — re-recording replaces your take"}
      </p>
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
