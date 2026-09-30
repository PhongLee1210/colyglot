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
import { useT } from "@/lib/i18n/use-t";

export function SignInForm() {
  const t = useT();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const callbackErrors: Record<string, string> = {
    callback: t.signIn.errorCallback,
    oauth: t.signIn.errorOauth,
  };
  const [error, setError] = useState<string | null>(
    callbackErrors[searchParams.get("error") ?? ""] ?? null
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
          {t.signIn.sentPrefix}{" "}
          <span className="font-medium text-fg">{sentTo}</span>
          {t.signIn.sentSuffix}
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setSentTo(null);
            setEmail("");
          }}
        >
          {t.signIn.useDifferentEmail}
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
        aria-label={t.signIn.emailFormLabel}
      >
        <Field label={t.signIn.emailLabel} htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t.signIn.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Button type="submit" block disabled={pending}>
          {pending ? t.signIn.sending : t.signIn.sendMagicLink}
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-fg-subtle">
        <span className="h-px flex-1 bg-line" aria-hidden />
        {t.signIn.or}
        <span className="h-px flex-1 bg-line" aria-hidden />
      </div>
      <Button
        variant="secondary"
        block
        disabled={pending}
        onClick={submitGoogle}
      >
        {t.signIn.continueWithGoogle}
      </Button>
    </div>
  );
}
