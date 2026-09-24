"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function DialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete deck?">
        <p className="text-sm text-fg-muted">
          This permanently deletes the deck and all its cards.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => setOpen(false)}>
            Delete
          </Button>
        </div>
      </Dialog>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
    </>
  );
}
