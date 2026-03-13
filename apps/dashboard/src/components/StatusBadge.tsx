interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  pending_approval: {
    label: 'Awaiting Approval',
    className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    dot: 'bg-yellow-400',
  },
  approved: {
    label: 'Approved',
    className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    dot: 'bg-blue-400',
  },
  generating: {
    label: 'Generating',
    className: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    dot: 'bg-purple-400 animate-pulse',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-500/10 text-green-400 border border-green-500/20',
    dot: 'bg-green-400',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-gray-500/10 text-gray-400 border border-gray-700',
    dot: 'bg-gray-500',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/10 text-red-400 border border-red-500/20',
    dot: 'bg-red-400',
  },
  security_blocked: {
    label: 'Security Blocked',
    className: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    dot: 'bg-orange-400',
  },
};

// Stage-specific badges for the live terminal
export const STAGE_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  intake: { label: 'Intake', className: 'bg-gray-700/60 text-gray-300' },
  planning: { label: 'Planning', className: 'bg-blue-500/20 text-blue-300' },
  pending_approval: { label: 'Awaiting Approval', className: 'bg-yellow-500/20 text-yellow-300' },
  approved: { label: 'Approved', className: 'bg-blue-500/20 text-blue-300' },
  generating: { label: 'Generating', className: 'bg-purple-500/20 text-purple-300' },
  reviewing: { label: 'Reviewing', className: 'bg-indigo-500/20 text-indigo-300' },
  testing: { label: 'Testing', className: 'bg-cyan-500/20 text-cyan-300' },
  security_scan: { label: 'Security Scan', className: 'bg-orange-500/20 text-orange-300' },
  pushing: { label: 'Pushing Branch', className: 'bg-teal-500/20 text-teal-300' },
  pr_open: { label: 'Opening PR', className: 'bg-green-500/20 text-green-300' },
  completed: { label: 'Completed', className: 'bg-green-500/20 text-green-300' },
  failed: { label: 'Failed', className: 'bg-red-500/20 text-red-300' },
  security_blocked: { label: 'Security Blocked', className: 'bg-orange-500/20 text-orange-300' },
  rejected: { label: 'Rejected', className: 'bg-gray-500/20 text-gray-400' },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-gray-700/60 text-gray-400 border border-gray-700',
    dot: 'bg-gray-500',
  };

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`badge ${config.className} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function StageBadge({ stage }: { stage: string }) {
  const config = STAGE_CONFIG[stage] ?? {
    label: stage,
    className: 'bg-gray-700/60 text-gray-400',
  };
  return (
    <span className={`badge text-xs px-2 py-0.5 font-mono ${config.className}`}>
      {config.label}
    </span>
  );
}
