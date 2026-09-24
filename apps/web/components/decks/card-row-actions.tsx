"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CardFormDialog } from "@/components/decks/card-form-dialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { deleteCardAction } from "@/lib/actions/decks";
import type { Card } from "@/lib/db/schema";

export function CardRowActions({
  deckId,
  card,
}: {
  deckId: string;
  card: Card;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteCardAction(card.id, deckId);
      if (!result.ok) {
        toast(result.error, "danger");
        return;
      }
      setConfirmOpen(false);
      toast(`Card “${card.hanzi}” deleted`, "info");
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <CardFormDialog
        deckId={deckId}
        card={card}
        triggerVariant="ghost"
        label="Edit"
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete card ${card.hanzi}`}
        onClick={() => setConfirmOpen(true)}
        className="text-danger hover:bg-red-50 dark:hover:bg-red-950"
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete card?"
      >
        <p className="text-sm text-fg-muted">
          “{card.hanzi} · {card.pinyin}” and its study history will be removed.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={pending}>
            {pending ? "Deleting…" : "Delete card"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
