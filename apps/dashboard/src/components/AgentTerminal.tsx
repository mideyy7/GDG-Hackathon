/**
 * AgentTerminal — Live Agent Terminal (Phase 2)
 *
 * Connects to the SSE event stream for a given runId and renders:
 * - Stage badge timeline
 * - Real-time log rows
 * - Summary cards (affected files, reviewer decision, security status, PR)
 * - Error states
 *
 * Falls back to polling run status if SSE is unavailable.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { openRunEventStream } from '../lib/api';
import type { RunEvent } from '../lib/api';
import { StageBadge } from './StatusBadge';

interface AgentTerminalProps {
  runId: string;
  status: string;
  branchName?: string | null;
  prUrl?: string | null;
  onStatusChange?: (status: string) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

const EVENT_TYPE_COLOR: Record<string, string> = {
  stage_change:       'text-blue-400',
  log:                'text-gray-400',
  plan_ready:         'text-yellow-400',
  execution_started:  'text-purple-400',
  agent_iteration:    'text-indigo-400',
  security_scan:      'text-orange-400',
  branch_pushed:      'text-teal-400',
  pr_opened:          'text-green-400',
  error:              'text-red-400',
  completed:          'text-green-400',
};

function LogRow({ event }: { event: RunEvent }) {
  const msgColor = EVENT_TYPE_COLOR[event.eventType] || 'text-gray-400';
  return (
    <div className="log-row group">
      <span className="log-row-timestamp">{formatTime(event.createdAt)}</span>
      <StageBadge stage={event.stage} />
      <span className={`log-row-message ${msgColor}`}>{event.message}</span>
    </div>
  );
}

const STAGE_ORDER = [
  'intake',
  'planning',
  'pending_approval',
  'approved',
  'generating',
  'reviewing',
  'testing',
  'security_scan',
  'pushing',
  'pr_open',
  'completed',
];

function StageTimeline({ events, currentStatus }: { events: RunEvent[]; currentStatus: string }) {
  // Compute which stages have been seen
  const seenStages = new Set(events.map((e) => e.stage));
  const currentStageIdx = STAGE_ORDER.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-1 flex-wrap mb-4">
      {STAGE_ORDER.map((stage, idx) => {
        const seen = seenStages.has(stage) || idx <= currentStageIdx;
        const active = stage === currentStatus || (stage === 'completed' && currentStatus === 'completed');
        const failed = currentStatus === 'failed' && idx === currentStageIdx;
        return (
          <div key={stage} className="flex items-center gap-1">
            <div
              className={`stage-step-dot ${
                failed
                  ? 'bg-red-500'
                  : active
                  ? 'bg-brand animate-pulse'
                  : seen
                  ? 'bg-green-500'
                  : 'bg-gray-700'
              }`}
              title={stage}
            />
            {idx < STAGE_ORDER.length - 1 && (
              <div className={`h-px w-3 ${seen ? 'bg-gray-600' : 'bg-gray-800'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SummaryCards({ events, branchName, prUrl }: {
  events: RunEvent[];
  branchName?: string | null;
  prUrl?: string | null;
}) {
  // Extract meaningful data from events
  const completedEvent = events.find((e) => e.eventType === 'completed');
  const errorEvent = events.find((e) => e.eventType === 'error');
  const secEvent = events.find((e) => e.eventType === 'security_scan');
  const iterEvents = events.filter((e) => e.eventType === 'agent_iteration');

  const cards = [];

  if (completedEvent?.data?.branchName || branchName) {
    const branch = (completedEvent?.data?.branchName as string) || branchName;
    cards.push(
      <div key="branch" className="card p-3">
        <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Branch</p>
        <p className="font-mono text-xs text-teal-300 truncate">{branch}</p>
      </div>
    );
  }

  if (completedEvent?.data?.prUrl || prUrl) {
    const url = (completedEvent?.data?.prUrl as string) || prUrl;
    cards.push(
      <div key="pr" className="card p-3">
        <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Pull Request</p>
        <a
          href={url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-green-400 hover:text-green-300 transition-colors"
        >
          View PR →
        </a>
      </div>
    );
  }

  if (iterEvents.length > 0) {
    cards.push(
      <div key="iters" className="card p-3">
        <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Agent Iterations</p>
        <p className="text-sm font-bold text-white">{iterEvents.length}</p>
      </div>
    );
  }

  if (secEvent) {
    const isBlocked = secEvent.data?.blocked;
    cards.push(
      <div key="sec" className={`card p-3 ${isBlocked ? 'border-orange-500/20' : 'border-green-500/20'}`}>
        <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Security Scan</p>
        <p className={`text-xs font-semibold ${isBlocked ? 'text-orange-400' : 'text-green-400'}`}>
          {isBlocked ? '⚠ Blocked' : '✓ Passed'}
        </p>
      </div>
    );
  }

  if (errorEvent) {
    cards.push(
      <div key="err" className="card p-3 border-red-500/20 bg-red-500/5">
        <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Error</p>
        <p className="text-xs text-red-400 line-clamp-2">{errorEvent.message}</p>
      </div>
    );
  }

  if (cards.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      {cards}
    </div>
  );
}

const TERMINAL_EVENT_TYPES = new Set(['completed', 'error']);
const TERMINAL_STAGE_MAP: Record<string, string> = {
  completed: 'completed',
  failed: 'failed',
  security_blocked: 'security_blocked',
};

export default function AgentTerminal({
  runId,
  status,
  branchName,
  prUrl,
  onStatusChange,
}: AgentTerminalProps) {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [sseError, setSseError] = useState(false);
  // Effective status — can be updated by incoming SSE events before the parent polls
  const [effectiveStatus, setEffectiveStatus] = useState(status);
  const logRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  // Sync prop status into effective status (parent poll wins after terminal events)
  useEffect(() => { setEffectiveStatus(status); }, [status]);

  const addEvent = useCallback((event: RunEvent) => {
    setEvents((prev) => {
      if (prev.some((e) => e.id === event.id)) return prev;
      return [...prev, event];
    });
    // Immediately update effective status from terminal events
    if (TERMINAL_EVENT_TYPES.has(event.eventType)) {
      const newStatus = TERMINAL_STAGE_MAP[event.stage] || event.stage;
      setEffectiveStatus(newStatus);
      onStatusChange?.(newStatus);
    }
  }, [onStatusChange]);

  useEffect(() => {
    let es: EventSource;
    try {
      es = openRunEventStream(runId);
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        setSseError(false);
      };

      es.onmessage = (event) => {
        try {
          const data: RunEvent = JSON.parse(event.data);
          addEvent(data);
        } catch {
          // Malformed event — skip
        }
      };

      es.onerror = () => {
        setConnected(false);
        setSseError(true);
        es.close();
      };
    } catch {
      setSseError(true);
    }

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [runId, addEvent]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  const isLive = ['approved', 'generating'].includes(effectiveStatus);
  const isTerminal = ['completed', 'failed', 'security_blocked', 'rejected'].includes(effectiveStatus);

  return (
    <div className="card" data-testid="agent-terminal">
      {/* Terminal header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Agent Terminal
          </h3>
          {isLive && !sseError && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {connected ? 'Live' : 'Connecting…'}
            </span>
          )}
          {sseError && (
            <span className="text-xs text-yellow-500">Stream unavailable — polling</span>
          )}
          {isTerminal && (
            <span className="text-xs text-gray-600">
              {events.length} events
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-gray-700 truncate max-w-[120px]">{runId}</span>
      </div>

      {/* Stage timeline */}
      <StageTimeline events={events} currentStatus={status} />

      {/* Summary cards */}
      <SummaryCards events={events} branchName={branchName} prUrl={prUrl} />

      {/* Log stream */}
      <div
        ref={logRef}
        className="admin-scroll overflow-y-auto max-h-80 bg-gray-950 rounded-lg p-3 border border-gray-800 font-mono"
        data-testid="terminal-log"
      >
        {events.length === 0 ? (
          <div className="text-center py-6">
            {isLive ? (
              <p className="text-xs text-gray-600 cursor-blink">
                Waiting for events
              </p>
            ) : (
              <p className="text-xs text-gray-700">No events recorded</p>
            )}
          </div>
        ) : (
          events.map((event) => <LogRow key={event.id} event={event} />)
        )}

        {/* Cursor for live runs */}
        {isLive && events.length > 0 && (
          <div className="log-row">
            <span className="log-row-timestamp">
              {formatTime(new Date().toISOString())}
            </span>
            <span className="text-gray-700 cursor-blink text-xs">processing</span>
          </div>
        )}
      </div>
    </div>
  );
}
