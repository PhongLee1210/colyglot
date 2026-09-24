"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createCardAction, updateCardAction } from "@/lib/actions/decks";
import type { Card, CardCollocation, CardExample } from "@/lib/db/schema";

type ExampleDraft = { hanzi: string; pinyin: string; translation: string };
type CollocationDraft = { phrase: string; pinyin: string; translation: string };

const EMPTY_EXAMPLE: ExampleDraft = { hanzi: "", pinyin: "", translation: "" };
const EMPTY_COLLOCATION: CollocationDraft = {
  phrase: "",
  pinyin: "",
  translation: "",
};

function toDrafts(card?: Card) {
  return {
    hanzi: card?.hanzi ?? "",
    pinyin: card?.pinyin ?? "",
    translation: card?.translation ?? "",
    examples: (card?.examples ?? []) as CardExample[],
    collocations: (card?.collocations ?? []) as CardCollocation[],
  };
}

export function CardFormDialog({
  deckId,
  card,
  label,
  triggerVariant = "primary",
}: {
  deckId: string;
  card?: Card;
  label?: string;
  triggerVariant?: "primary" | "ghost";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const editing = Boolean(card);
  const [open, setOpen] = useState(false);
  const [hanzi, setHanzi] = useState(card?.hanzi ?? "");
  const [pinyin, setPinyin] = useState(card?.pinyin ?? "");
  const [translation, setTranslation] = useState(card?.translation ?? "");
  const [examples, setExamples] = useState<ExampleDraft[]>(
    card?.examples?.length ? [...card.examples] : []
  );
  const [collocations, setCollocations] = useState<CollocationDraft[]>(
    card?.collocations?.length ? [...card.collocations] : []
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    const drafts = toDrafts(card);
    setHanzi(drafts.hanzi);
    setPinyin(drafts.pinyin);
    setTranslation(drafts.translation);
    setExamples([...drafts.examples]);
    setCollocations([...drafts.collocations]);
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const payload = {
      hanzi,
      pinyin,
      translation,
      examples: examples
        .map((row) => ({
          hanzi: row.hanzi.trim(),
          pinyin: row.pinyin.trim(),
          translation: row.translation.trim(),
        }))
        .filter((row) => row.hanzi || row.translation),
      collocations: collocations
        .map((row) => ({
          phrase: row.phrase.trim(),
          pinyin: row.pinyin.trim(),
          translation: row.translation.trim(),
        }))
        .filter((row) => row.phrase || row.translation),
    };
    startTransition(async () => {
      const result = editing
        ? await updateCardAction(card!.id, deckId, payload)
        : await createCardAction({ deckId, ...payload });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      close();
      toast(editing ? "Card updated" : `Card “${hanzi}” added`, "success");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant={triggerVariant}
        size={triggerVariant === "ghost" ? "sm" : "md"}
        aria-haspopup="dialog"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        {triggerVariant === "primary" ? (
          <Plus className="size-4" aria-hidden />
        ) : null}
        {label ?? (editing ? "Edit" : "Add card")}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={editing ? "Edit card" : "Add card"}
      >
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <Field label="Hanzi" htmlFor="card-hanzi">
            <Input
              id="card-hanzi"
              value={hanzi}
              onChange={(event) => setHanzi(event.target.value)}
              placeholder="你好"
              lang="zh-CN"
              required
            />
          </Field>
          <Field label="Pinyin" htmlFor="card-pinyin">
            <Input
              id="card-pinyin"
              value={pinyin}
              onChange={(event) => setPinyin(event.target.value)}
              placeholder="nǐ hǎo"
              required
            />
          </Field>
          <Field label="Vietnamese translation" htmlFor="card-translation">
            <Textarea
              id="card-translation"
              value={translation}
              onChange={(event) => setTranslation(event.target.value)}
              placeholder="xin chào"
              required
            />
          </Field>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                Examples
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setExamples((rows) => [...rows, { ...EMPTY_EXAMPLE }])
                }
              >
                + Add
              </Button>
            </div>
            {examples.map((row, index) => (
              <div
                key={index}
                className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface-2 p-2.5"
              >
                <Input
                  value={row.hanzi}
                  onChange={(event) =>
                    setExamples((rows) =>
                      rows.map((item, i) =>
                        i === index
                          ? { ...item, hanzi: event.target.value }
                          : item
                      )
                    )
                  }
                  placeholder="例句 hanzi"
                  lang="zh-CN"
                />
                <Input
                  value={row.pinyin}
                  onChange={(event) =>
                    setExamples((rows) =>
                      rows.map((item, i) =>
                        i === index
                          ? { ...item, pinyin: event.target.value }
                          : item
                      )
                    )
                  }
                  placeholder="lì jù pinyin"
                />
                <Input
                  value={row.translation}
                  onChange={(event) =>
                    setExamples((rows) =>
                      rows.map((item, i) =>
                        i === index
                          ? { ...item, translation: event.target.value }
                          : item
                      )
                    )
                  }
                  placeholder="nghĩa tiếng Việt"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-end text-danger"
                  onClick={() =>
                    setExamples((rows) => rows.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                Collocations
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCollocations((rows) => [...rows, { ...EMPTY_COLLOCATION }])
                }
              >
                + Add
              </Button>
            </div>
            {collocations.map((row, index) => (
              <div
                key={index}
                className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface-2 p-2.5"
              >
                <Input
                  value={row.phrase}
                  onChange={(event) =>
                    setCollocations((rows) =>
                      rows.map((item, i) =>
                        i === index
                          ? { ...item, phrase: event.target.value }
                          : item
                      )
                    )
                  }
                  placeholder="搭配 phrase"
                  lang="zh-CN"
                />
                <Input
                  value={row.pinyin}
                  onChange={(event) =>
                    setCollocations((rows) =>
                      rows.map((item, i) =>
                        i === index
                          ? { ...item, pinyin: event.target.value }
                          : item
                      )
                    )
                  }
                  placeholder="pinyin"
                />
                <Input
                  value={row.translation}
                  onChange={(event) =>
                    setCollocations((rows) =>
                      rows.map((item, i) =>
                        i === index
                          ? { ...item, translation: event.target.value }
                          : item
                      )
                    )
                  }
                  placeholder="nghĩa tiếng Việt"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-end text-danger"
                  onClick={() =>
                    setCollocations((rows) =>
                      rows.filter((_, i) => i !== index)
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save changes" : "Add card"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
