import { Layers } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/card";
import { DialogDemo } from "@/components/ui/dialog-demo";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorInline } from "@/components/ui/error-inline";
import { Field, Input, Textarea } from "@/components/ui/input";
import { CardListSkeleton, Skeleton } from "@/components/ui/skeleton";
import { ToastDemo } from "@/components/ui/toast-demo";

const SCALES = ["primary", "gray", "green", "red", "orange", "yellow"] as const;

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

export default function DevUiPage() {
  return (
    <AppShell title="UI gallery" backHref="/">
      <div className="flex flex-col gap-8 pb-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            Color scales (both themes — toggle above)
          </h2>
          {SCALES.map((scale) => (
            <div key={scale} className="flex flex-col gap-1">
              <p className="text-xs text-fg-subtle">{scale}</p>
              <div className="flex overflow-hidden rounded-xl border border-line">
                {STEPS.map((step) => (
                  <div
                    key={step}
                    className="h-9 flex-1"
                    style={{ backgroundColor: `var(--${scale}-${step})` }}
                    title={`${scale}-${step}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            Typography — Be Vietnam Pro · Noto Serif SC · mono
          </h2>
          <Card className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-xs tracking-wide text-fg-subtle uppercase">
                Sans · display & body (Vietnamese-ready)
              </p>
              <p className="text-2xl font-bold tracking-tight">
                Học tiếng Trung mỗi ngày
              </p>
              <p className="text-sm text-fg-muted">
                Xin chào — từ vựng, phiên âm, ví dụ.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs tracking-wide text-fg-subtle uppercase">
                Hanzi · serif display
              </p>
              <p className="font-hanzi text-4xl font-black" lang="zh-CN">
                學中文你好
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs tracking-wide text-fg-subtle uppercase">
                Mono · pinyin & numerals
              </p>
              <p className="font-mono text-sm tracking-widest">
                nǐ hǎo · xué zhōngwén · 42 / 100
              </p>
            </div>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            Buttons
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="success">Success</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">9</Button>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            Card · Inputs
          </h2>
          <Card className="flex flex-col gap-4">
            <div>
              <CardTitle>Cards due today</CardTitle>
              <CardSubtitle>
                Swipe through them before the day ends.
              </CardSubtitle>
            </div>
            <Field label="Hanzi" htmlFor="dev-hanzi">
              <Input id="dev-hanzi" placeholder="你好" />
            </Field>
            <Field label="Translation" htmlFor="dev-translation">
              <Textarea id="dev-translation" placeholder="xin chào" />
            </Field>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            Patterns
          </h2>
          <ToastDemo />
          <EmptyState
            icon={<Layers className="size-full" aria-hidden />}
            title="No decks yet"
            description="Create your first deck to start studying."
            action={<Button size="sm">Create deck</Button>}
          />
          <CardListSkeleton count={2} />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-16" />
          </div>
          <ErrorInline message="Couldn't load decks." />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            Dialog
          </h2>
          <DialogDemo />
        </section>
      </div>
    </AppShell>
  );
}
