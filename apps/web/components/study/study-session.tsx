"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { CardRecordingControls } from "@/components/study/card-recording-controls";
import { SpeakButton } from "@/components/study/speak-button";
import type { SessionCard } from "@/components/study/study-content";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  finishSessionAction,
  gradeCardAction,
  revalidateDeckAction,
} from "@/lib/actions/study";
import { ReviewGrade } from "@/lib/db/schema";

type Direction = "left" | "right" | "up";

const GRADE_BY_DIRECTION: Record<Direction, ReviewGrade> = {
  left: ReviewGrade.FORGOT,
  right: ReviewGrade.GOOD,
  up: ReviewGrade.EASY,
};

const FLY_MS = 260;
const DRAG_TRIGGER_PX = 90;
const TAP_SLOP_PX = 8;

const GRADE_LABELS: Record<number, string> = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
  5: "Perfect",
};

function intervalLabel(days: number): string {
  if (days < 1) {
    return "later today";
  }
  if (days === 1) {
    return "tomorrow";
  }
  if (days < 30) {
    return `in ${days} days`;
  }
  const months = Math.round(days / 30);
  return `in ${months} month${months === 1 ? "" : "s"}`;
}

function shortInterval(days: number): string {
  if (days < 30) {
    return `${days}d`;
  }
  return `${Math.max(1, Math.round(days / 30))}mo`;
}

export function StudySession({
  deckId,
  deckName,
  sessionId,
  initialQueue,
}: {
  deckId: string;
  deckName: string;
  sessionId: string;
  initialQueue: SessionCard[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [queue, setQueue] = useState(initialQueue);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [flyDirection, setFlyDirection] = useState<Direction | null>(null);
  const [leaving, setLeaving] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const busy = useRef(false);
  const reviewedCountRef = useRef(0);

  const current = queue[0];
  const remaining = queue.length;

  const finish = useCallback(
    async (target: string) => {
      await finishSessionAction(sessionId, reviewedCountRef.current);
      await revalidateDeckAction(deckId);
      router.replace(target);
    },
    [deckId, router, sessionId]
  );

  useEffect(() => {
    if (queue.length === 0 && !busy.current) {
      busy.current = true;
      void finish(`/decks/${deckId}/complete?session=${sessionId}`);
    }
  }, [deckId, finish, queue.length, sessionId]);

  const grade = useCallback(
    (gradeValue: ReviewGrade) => {
      if (!current || busy.current || !flipped) {
        return;
      }
      busy.current = true;
      const card = current;
      const direction: Direction | null =
        gradeValue === ReviewGrade.FORGOT
          ? "left"
          : gradeValue === ReviewGrade.EASY ||
              gradeValue === ReviewGrade.PERFECT
            ? "up"
            : "right";
      setFlyDirection(direction);
      const nextReviewed = reviewedCountRef.current + 1;
      reviewedCountRef.current = nextReviewed;
      setReviewedCount(nextReviewed);

      window.setTimeout(() => {
        setQueue((currentQueue) => {
          const [head, ...rest] = currentQueue;
          return gradeValue < ReviewGrade.GOOD && head ? [...rest, head] : rest;
        });
        setFlipped(false);
        setDrag({ x: 0, y: 0 });
        setFlyDirection(null);
        busy.current = false;
      }, FLY_MS);

      void gradeCardAction(card.id, sessionId, gradeValue).then((result) => {
        if (!result.ok) {
          toast(result.error, "danger");
          return;
        }
        if (result.data.requeued) {
          toast("Again — this card will come back this session", "danger");
        } else {
          toast(
            `${GRADE_LABELS[gradeValue]} · next review ${intervalLabel(result.data.intervalDays)}`,
            "success"
          );
        }
      });
    },
    [current, flipped, sessionId, toast]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setFlipped((value) => !value);
        return;
      }
      const numeric = Number.parseInt(event.key, 10);
      if (numeric >= 1 && numeric <= 5) {
        grade(numeric as ReviewGrade);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [grade]);

  function onPointerDown(event: React.PointerEvent) {
    if (busy.current || flyDirection) {
      return;
    }
    pointerStart.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!pointerStart.current) {
      return;
    }
    setDrag({
      x: event.clientX - pointerStart.current.x,
      y: event.clientY - pointerStart.current.y,
    });
  }

  function onPointerUp() {
    if (!pointerStart.current) {
      return;
    }
    pointerStart.current = null;
    setDragging(false);
    const dx = drag.x;
    const dy = drag.y;

    if (Math.abs(dx) < TAP_SLOP_PX && Math.abs(dy) < TAP_SLOP_PX) {
      setDrag({ x: 0, y: 0 });
      setFlipped((value) => !value);
      return;
    }

    const horizontal = Math.abs(dx) > Math.abs(dy);
    if (horizontal && dx <= -DRAG_TRIGGER_PX) {
      grade(GRADE_BY_DIRECTION.left);
    } else if (horizontal && dx >= DRAG_TRIGGER_PX) {
      grade(GRADE_BY_DIRECTION.right);
    } else if (!horizontal && dy <= -DRAG_TRIGGER_PX) {
      grade(GRADE_BY_DIRECTION.up);
    } else {
      setDrag({ x: 0, y: 0 });
    }
  }

  function exit() {
    if (leaving) {
      return;
    }
    setLeaving(true);
    if (reviewedCountRef.current > 0) {
      toast("Progress saved", "success");
    }
    void finish(`/decks/${deckId}`);
  }

  if (!current) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-fg-muted">Finishing up…</p>
      </div>
    );
  }

  const stamp =
    drag.x <= -DRAG_TRIGGER_PX
      ? { label: "AGAIN", tone: "text-red-500 border-red-400", visible: true }
      : drag.x >= DRAG_TRIGGER_PX
        ? {
            label: "GOOD",
            tone: "text-green-600 border-green-500",
            visible: true,
          }
        : drag.y <= -DRAG_TRIGGER_PX
          ? {
              label: "EASY",
              tone: "text-yellow-500 border-yellow-400",
              visible: true,
            }
          : { label: "", tone: "", visible: false };

  const rotation = Math.min(drag.x / 18, 12);
  const flyClass =
    flyDirection === "left"
      ? "animate-[fly-off-left_260ms_ease-in_forwards]"
      : flyDirection === "right"
        ? "animate-[fly-off-right_260ms_ease-in_forwards]"
        : flyDirection === "up"
          ? "animate-[fly-off-up_260ms_ease-in_forwards]"
          : "";
  const totalCards = reviewedCount + remaining;
  const progressPct =
    totalCards === 0 ? 100 : Math.round((reviewedCount / totalCards) * 100);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 select-none">
      <header className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <button
            onClick={exit}
            aria-label="End session"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{deckName}</p>
            <p className="text-xs text-fg-muted tabular-nums">
              {reviewedCount} reviewed · {remaining} in queue
            </p>
          </div>
          <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-fg-muted">
            {flipped ? "back" : "front"}
          </span>
        </div>
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label="Session progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-700 via-primary-500 to-primary-400 [background-size:200%_100%] animate-[progress-sheen_2.4s_linear_infinite] transition-[width] duration-300 dark:from-primary-600 dark:via-primary-400 dark:to-primary-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <div className="perspective-card relative flex min-h-0 flex-1 items-center justify-center py-2">
        {queue[2] ? (
          <div
            className="pointer-events-none absolute inset-x-8 top-1/2 h-[68%] -translate-y-[60%] rotate-[-1.5deg] rounded-3xl border border-line bg-surface-2 opacity-60"
            aria-hidden
          />
        ) : null}
        {queue[1] ? (
          <div
            className="pointer-events-none absolute inset-x-4 top-1/2 h-[68%] -translate-y-[58%] rotate-2 rounded-3xl border border-line bg-surface-2"
            aria-hidden
          />
        ) : null}
        <div
          className={`preserve-3d relative h-[68%] max-h-[560px] min-h-[420px] w-full cursor-pointer touch-none rounded-3xl border border-line bg-surface shadow-lg transition-transform animate-[deck-stack-in_240ms_ease-out] ${flyClass}`}
          style={
            flyDirection
              ? undefined
              : {
                  transform: `translate(${drag.x}px, ${drag.y}px) rotate(${rotation}deg)${flipped ? " rotateY(180deg)" : ""}`,
                  transition: dragging
                    ? "none"
                    : "transform 380ms cubic-bezier(0.34, 1.4, 0.5, 1)",
                }
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="button"
          aria-label={`Card: ${current.hanzi}. Tap to flip.`}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              setFlipped((value) => !value);
            }
          }}
        >
          <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
            {stamp.visible ? (
              <span
                className={`absolute top-5 left-6 rotate-[-12deg] rounded-xl border-2 px-3 py-1 text-sm font-extrabold tracking-widest ${stamp.tone}`}
              >
                {stamp.label}
              </span>
            ) : null}
            <span className="absolute top-5 left-1/2 -translate-x-1/2 font-mono text-xs tracking-widest text-fg-subtle tabular-nums">
              {reviewedCount + 1} / {totalCards}
            </span>
            <SpeakButton
              text={current.hanzi}
              className="absolute top-4 right-4"
            />
            <p
              className="text-center font-hanzi text-[clamp(2.75rem,15vw,4.75rem)] leading-tight font-black break-words text-balance"
              lang="zh-CN"
            >
              {current.hanzi}
            </p>
            <p className="font-mono text-base tracking-widest text-fg-muted">
              {current.pinyin}
            </p>
            <p className="absolute bottom-5 text-xs text-fg-subtle">
              tap to flip · ← again · → good · ↑ easy
            </p>
          </div>

          <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center gap-3 overflow-y-auto overscroll-contain p-6 pt-16">
            <SpeakButton
              text={current.hanzi}
              className="absolute top-4 right-4"
            />
            <p className="font-hanzi text-3xl font-bold" lang="zh-CN">
              {current.hanzi}
            </p>
            <p className="font-mono text-sm tracking-widest text-fg-muted">
              {current.pinyin}
            </p>
            <p className="text-center text-xl font-semibold text-primary">
              {current.translation}
            </p>
            {current.examples.map((example, index) => (
              <div
                key={index}
                className="w-full rounded-xl border border-line border-l-2 border-l-primary/50 bg-surface-2 p-3 text-sm"
              >
                <p lang="zh-CN" className="font-hanzi">
                  {example.hanzi}
                </p>
                <p className="font-mono text-xs tracking-wide text-fg-muted">
                  {example.pinyin}
                </p>
                <p className="text-fg">{example.translation}</p>
              </div>
            ))}
            {current.collocations.length > 0 ? (
              <div className="w-full rounded-xl border border-line bg-surface-2 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold tracking-wide text-fg-subtle uppercase">
                  Collocations
                </p>
                {current.collocations.map((collocation, index) => (
                  <p key={index} lang="zh-CN" className="font-hanzi">
                    {collocation.phrase}{" "}
                    <span className="font-mono text-xs text-fg-muted">
                      {collocation.pinyin}
                    </span>{" "}
                    <span className="font-sans text-fg">
                      — {collocation.translation}
                    </span>
                  </p>
                ))}
              </div>
            ) : null}
            <CardRecordingControls
              cardId={current.id}
              speakText={current.hanzi}
            />
          </div>
        </div>
      </div>

      <footer className="flex flex-col gap-2 pb-1">
        {flipped ? (
          <div className="flex items-stretch gap-1.5">
            <Button
              size="sm"
              variant="danger"
              disabled={!flipped}
              aria-label="Grade Again (1)"
              title="Again (1)"
              onClick={() => grade(ReviewGrade.FORGOT)}
              className="min-h-12 flex-1 flex-col gap-0 px-1 py-1.5"
            >
              <span className="text-sm leading-none font-bold">Again</span>
              <span className="text-[10px] leading-none font-medium opacity-80 tabular-nums">
                {shortInterval(current.hints.again)}
              </span>
            </Button>
            <Button
              size="sm"
              variant="warning"
              disabled={!flipped}
              aria-label="Grade Hard (2)"
              title="Hard (2)"
              onClick={() => grade(ReviewGrade.HARD)}
              className="min-h-12 flex-1 flex-col gap-0 px-1 py-1.5"
            >
              <span className="text-sm leading-none font-bold">Hard</span>
              <span className="text-[10px] leading-none font-medium opacity-80 tabular-nums">
                {shortInterval(current.hints.hard)}
              </span>
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!flipped}
              aria-label="Grade Good (3)"
              title="Good (3)"
              onClick={() => grade(ReviewGrade.GOOD)}
              className="min-h-12 flex-1 flex-col gap-0 px-1 py-1.5"
            >
              <span className="text-sm leading-none font-bold">Good</span>
              <span className="text-[10px] leading-none font-medium opacity-80 tabular-nums">
                {shortInterval(current.hints.good)}
              </span>
            </Button>
            <Button
              size="sm"
              variant="success"
              disabled={!flipped}
              aria-label="Grade Easy (4)"
              title="Easy (4)"
              onClick={() => grade(ReviewGrade.EASY)}
              className="min-h-12 flex-1 flex-col gap-0 px-1 py-1.5"
            >
              <span className="text-sm leading-none font-bold">Easy</span>
              <span className="text-[10px] leading-none font-medium opacity-80 tabular-nums">
                {shortInterval(current.hints.easy)}
              </span>
            </Button>
          </div>
        ) : (
          <Button
            block
            size="lg"
            aria-label="Show answer"
            onClick={() => setFlipped(true)}
          >
            Show answer
          </Button>
        )}
        <p className="text-center text-xs text-fg-subtle">
          {flipped
            ? "swipe ← → ↑ or press 1–5"
            : "tap the card or press Space to reveal"}
        </p>
      </footer>
    </div>
  );
}
