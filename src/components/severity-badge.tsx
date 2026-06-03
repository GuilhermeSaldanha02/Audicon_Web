import type { InfractionSeverity } from '@/lib/types';

const SEVERITY_LABEL: Record<InfractionSeverity, string> = {
  LEVE:  'Leve',
  MEDIA: 'Média',
  GRAVE: 'Grave',
};

/**
 * Returns Tailwind class string for the given severity.
 * Uses literal strings so Tailwind's scanner can detect them.
 * Returns a neutral fallback for undefined/null values.
 */
export function severityBadgeClass(severity: InfractionSeverity | null | undefined): string {
  switch (severity) {
    case 'LEVE':  return 'bg-sev-leve-bg text-sev-leve';
    case 'MEDIA': return 'bg-sev-media-bg text-sev-media';
    case 'GRAVE': return 'bg-sev-grave-bg text-sev-grave';
    default:      return 'bg-muted text-muted-foreground';
  }
}

export function SeverityBadge({
  severity,
  className = '',
}: {
  severity: InfractionSeverity | null | undefined;
  className?: string;
}) {
  if (!severity) return null;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${severityBadgeClass(severity)} ${className}`}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
