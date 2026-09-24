"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createDeckAction } from "@/lib/actions/decks";

export function CreateDeckDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDeckAction({ name });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setName("");
      toast(`Deck “${result.data.name}” created`, "success");
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Plus className="size-4" aria-hidden />
        New deck
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Create deck">
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <Field label="Deck name" htmlFor="deck-name">
            <Input
              id="deck-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Chinese Starter"
              autoFocus
              required
            />
          </Field>
          <p className="text-xs text-fg-subtle">
            Language pair defaults to zh → vi.
          </p>
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
              {pending ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
