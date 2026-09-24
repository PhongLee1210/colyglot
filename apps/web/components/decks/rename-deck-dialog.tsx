"use client";

import { PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { renameDeckAction } from "@/lib/actions/decks";

export function RenameDeckDialog({
  deckId,
  currentName,
}: {
  deckId: string;
  currentName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await renameDeckAction(deckId, name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast("Deck renamed", "success");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Rename deck"
        aria-haspopup="dialog"
        onClick={() => {
          setName(currentName);
          setOpen(true);
        }}
      >
        <PenLine className="size-4" aria-hidden />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Rename deck">
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <Field label="Deck name" htmlFor="rename-deck">
            <Input
              id="rename-deck"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              required
            />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Rename"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
