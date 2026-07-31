"use client";

import { cn } from "@/lib/utils";

/* Sirt soch chizig'i bilan ajratiladi, soya bilan emas. */
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("pane-solid rounded-[var(--r-pane)]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-[var(--edge)] px-6 py-5",
        className,
      )}
    >
      <div className="min-w-0">
        {title ? (
          <h3 className="truncate text-[15px] font-semibold text-[var(--ink)]">{title}</h3>
        ) : null}
        {description ? (
          <p className="mt-1 text-[13px] text-[var(--ink-3)]">{description}</p>
        ) : null}
        {children}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-[var(--edge)] px-6 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "enter flex flex-col items-center justify-center gap-4 px-6 py-16 text-center",
        className,
      )}
    >
      {icon ? (
        // Soch chizig'idagi doira — rangli plitka e'tiborni matndan tortadi
        <span className="flex size-12 items-center justify-center rounded-full border border-[var(--edge-strong)] bg-[var(--pane)] text-[var(--ink-4)]">
          {icon}
        </span>
      ) : null}
      <div>
        <p className="text-[15px] font-semibold text-[var(--ink)]">{title}</p>
        {description ? (
          <p className="mt-1.5 max-w-sm text-[13.5px] text-[var(--ink-3)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("loading-block", className)} />;
}
