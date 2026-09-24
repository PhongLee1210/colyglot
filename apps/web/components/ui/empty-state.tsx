import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-surface-2 px-6 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-300 [&_svg]:size-7">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      <p className="max-w-[36ch] text-sm text-fg-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
