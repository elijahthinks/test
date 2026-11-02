import type { ReactNode } from "react";
import type { Confidence, SourceRef, ThreatGroup } from "../../shared/schema";
import { CONFIDENCE_LABEL } from "../lib/taxonomy";

export function SectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h3 className="text-sm font-bold text-paper">{children}</h3>
      {action}
    </div>
  );
}

export function TextButton({ onClick, children, label }: { onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded text-sm text-muted underline decoration-rule underline-offset-4 hover:text-paper hover:decoration-paper"
    >
      {children}
    </button>
  );
}

/**
 * Three segments, filled up to the level, always with words beside them.
 * Confidence is never shown by color alone.
 */
export function ConfidenceMeter({ level, subject }: { level: Confidence; subject?: string }) {
  const filled = { low: 1, medium: 2, high: 3 }[level];
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted">
      <span className="inline-flex gap-[3px]" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-2.5 w-[6px] rounded-[1px] ${i <= filled ? "bg-paper" : "border border-rule"}`}
          />
        ))}
      </span>
      <span>
        {CONFIDENCE_LABEL[level]}
        {subject ? <span className="sr-only"> {subject}</span> : null}
      </span>
    </span>
  );
}

/**
 * "Suspected: OilRig". The underline gets more solid as confidence rises:
 * dotted for low, dashed for medium, solid for high.
 */
export function AttributionLine({
  group,
  confidence,
  onOpenGroup,
}: {
  group: ThreatGroup | null;
  confidence: Confidence;
  onOpenGroup?: (id: string) => void;
}) {
  if (!group) return <span className="text-sm text-muted">Unattributed</span>;
  const line = { low: "decoration-dotted", medium: "decoration-dashed", high: "decoration-solid" }[confidence];
  const name = onOpenGroup ? (
    <button
      type="button"
      onClick={() => onOpenGroup(group.id)}
      className={`rounded underline decoration-1 underline-offset-4 ${line} hover:text-focus`}
    >
      {group.name}
    </button>
  ) : (
    <span className={`underline decoration-1 underline-offset-4 ${line}`}>{group.name}</span>
  );
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span>
        <span className="text-muted">Suspected </span>
        {name}
      </span>
      <ConfidenceMeter level={confidence} subject="in this attribution" />
    </span>
  );
}

export function SampleTag() {
  return (
    <span
      className="hatch inline-flex items-center rounded-sm border border-rule px-1.5 py-px text-xs text-paper"
      title="Generated for this demo. Not a real event."
    >
      Sample record
    </span>
  );
}

export function SourceLine({ source }: { source: SourceRef }) {
  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {source.url ? (
          <a href={source.url} target="_blank" rel="noreferrer" className="underline decoration-rule underline-offset-4 hover:decoration-paper">
            {source.name}
          </a>
        ) : (
          <span>{source.name}</span>
        )}
        {source.synthetic ? <SampleTag /> : null}
      </div>
      {source.retrieved ? <p className="text-xs text-muted">Retrieved {source.retrieved}</p> : null}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex w-full items-start gap-3 rounded text-left"
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors ${
          checked ? "border-paper bg-paper" : "border-rule bg-ink"
        }`}
      >
        <span
          className={`h-3.5 w-3.5 rounded-full transition-transform ${checked ? "translate-x-4 bg-ink" : "bg-muted"}`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
    </button>
  );
}

export function Chip({
  pressed,
  onClick,
  children,
  swatch,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
        pressed ? "border-paper/70 bg-land text-paper" : "border-rule text-muted line-through decoration-muted/60 hover:text-paper"
      }`}
    >
      {swatch ? (
        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: pressed ? swatch : "transparent", boxShadow: `inset 0 0 0 1.5px ${swatch}` }} />
      ) : null}
      {children}
    </button>
  );
}
