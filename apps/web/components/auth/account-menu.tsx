"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { signOutAction } from "@/lib/actions/auth";

export function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const initial = email.charAt(0).toUpperCase();

  return (
    <>
      <button
        type="button"
        aria-label="Account"
        onClick={() => setOpen(true)}
        className="flex size-9 items-center justify-center rounded-full border border-line bg-surface-2 text-sm font-bold text-primary transition-colors hover:bg-line"
      >
        {initial}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Account">
        <p className="truncate text-sm text-fg-muted" title={email}>
          {email}
        </p>
        <form action={signOutAction}>
          <Button type="submit" variant="danger" block>
            Sign out
          </Button>
        </form>
      </Dialog>
    </>
  );
}
