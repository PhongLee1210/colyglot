"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ErrorInline } from "@/components/ui/error-inline";
import { Field, Input } from "@/components/ui/input";
import {
  signInWithEmailAction,
  signInWithGoogleAction,
} from "@/lib/actions/auth";

const CALLBACK_ERRORS: Record<string, string> = {
  callback: "That sign-in link is invalid or expired — request a new one.",
  oauth: "Google sign-in isn't available yet.",
};

export function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [error, setError] = useState<string | null>(
    CALLBACK_ERRORS[searchParams.get("error") ?? ""] ?? null
  );
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitEmail(formData: FormData) {
    const value = String(formData.get("email") ?? "");
    startTransition(async () => {
      const result = await signInWithEmailAction(value, next);
      if (result.ok) {
        setSentTo(value.trim());
        setError(null);
      } else {
        setError(result.error);
      }
    });
  }

  function submitGoogle() {
    startTransition(async () => {
      await signInWithGoogleAction(next);
    });
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-fg-muted">
          Check your email — we sent a sign-in link to{" "}
          <span className="font-medium text-fg">{sentTo}</span>.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setSentTo(null);
            setEmail("");
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <ErrorInline message={error} /> : null}
      <form
        className="flex flex-col gap-4"
        action={submitEmail}
        aria-label="Sign in with email"
      >
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Button type="submit" block disabled={pending}>
          {pending ? "Sending…" : "Send magic link"}
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-fg-subtle">
        <span className="h-px flex-1 bg-line" aria-hidden />
        or
        <span className="h-px flex-1 bg-line" aria-hidden />
      </div>
      <Button
        variant="secondary"
        block
        disabled={pending}
        onClick={submitGoogle}
      >
        Continue with Google
      </Button>
    </div>
  );
}
