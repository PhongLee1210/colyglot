"use client";

import type { CardExample } from "@/lib/game/content/types";
import { useT } from "@/lib/i18n/use-t";

export function AnswerReveal({
  hanzi,
  pinyin,
  translation,
  example,
  correct,
  canUndo,
  canContinue,
  onUndo,
  onContinue,
}: {
  hanzi: string;
  pinyin: string;
  translation: string;
  example: CardExample | undefined;
  correct: boolean;
  canUndo: boolean;
  canContinue: boolean;
  onUndo: () => void;
  onContinue: () => void;
}) {
  const t = useT();
  return (
    <div
      aria-live="polite"
      data-testid="harvest-answer"
      className="flex w-full max-w-md flex-col items-center gap-2 rounded-3xl border border-line bg-surface-2 p-4 text-center"
    >
      <p className="text-sm font-bold">
        {correct ? t.answer.correct : t.answer.wrong}
      </p>
      <p className="font-hanzi text-3xl font-bold">{hanzi}</p>
      <p className="text-sm text-fg-muted">{pinyin}</p>
      <p className="text-xl font-bold text-green-700 dark:text-green-400">
        {translation}
      </p>
      {example ? (
        <p className="text-sm text-fg-muted">
          <span className="font-hanzi">{example.hanzi}</span>
          {" — "}
          {example.translation}
        </p>
      ) : null}
      {correct ? null : (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {canUndo ? (
            <button
              type="button"
              className="min-h-11 rounded-full border border-line px-5 py-2 text-sm font-bold transition hover:bg-surface"
              onClick={onUndo}
            >
              {t.answer.mistapped}
            </button>
          ) : null}
          {canContinue ? (
            <button
              type="button"
              className="min-h-11 rounded-full bg-primary px-5 py-2 text-sm font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800 dark:hover:bg-primary-500"
              onClick={onContinue}
            >
              {t.common.continue}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
