"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { deleteDeckAndRedirectAction } from "@/lib/actions/decks";

export function DeleteDeckButton({
  deckId,
  deckName,
}: {
  deckId: string;
  deckName: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      await deleteDeckAndRedirectAction(deckId);
      toast(`Deck “${deckName}” deleted`, "info");
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete deck"
        onClick={() => setOpen(true)}
        className="text-danger hover:bg-red-50 dark:hover:bg-red-950"
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete deck?">
        <p className="text-sm text-fg-muted">
          This permanently deletes “{deckName}” with all its cards, schedules,
          review history and recordings.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            {pending ? "Deleting…" : "Delete deck"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
