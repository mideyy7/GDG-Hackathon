import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge, { StageBadge } from '../components/StatusBadge';

describe('StatusBadge', () => {
  it('renders pending_approval status', () => {
    render(<StatusBadge status="pending_approval" />);
    expect(screen.getByText('Awaiting Approval')).toBeInTheDocument();
  });

  it('renders completed status', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders failed status', () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders security_blocked status', () => {
    render(<StatusBadge status="security_blocked" />);
    expect(screen.getByText('Security Blocked')).toBeInTheDocument();
  });

  it('renders generating status', () => {
    render(<StatusBadge status="generating" />);
    expect(screen.getByText('Generating')).toBeInTheDocument();
  });

  it('falls back gracefully for unknown status', () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });
});

describe('StageBadge', () => {
  it('renders planning stage', () => {
    render(<StageBadge stage="planning" />);
    expect(screen.getByText('Planning')).toBeInTheDocument();
  });

  it('renders generating stage', () => {
    render(<StageBadge stage="generating" />);
    expect(screen.getByText('Generating')).toBeInTheDocument();
  });

  it('renders security_scan stage', () => {
    render(<StageBadge stage="security_scan" />);
    expect(screen.getByText('Security Scan')).toBeInTheDocument();
  });

  it('falls back gracefully for unknown stage', () => {
    render(<StageBadge stage="custom_stage" />);
    expect(screen.getByText('custom_stage')).toBeInTheDocument();
  });
});
