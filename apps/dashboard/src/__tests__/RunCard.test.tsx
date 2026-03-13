import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RunCard from '../components/RunCard';
import type { TaskRunSummary } from '../lib/api';

const baseRun: TaskRunSummary = {
  id: 'run-abc-123',
  planId: 'plan-1',
  userId: 'user-1',
  repo: 'owner/my-repo',
  issueUrl: 'https://github.com/owner/my-repo/issues/42',
  issueNumber: 42,
  description: 'Fix the login bug on mobile',
  status: 'pending_approval',
  channel: 'web',
  branchName: null,
  prUrl: null,
  prNumber: null,
  createdAt: new Date().toISOString(),
};

const renderCard = (run: TaskRunSummary) =>
  render(
    <MemoryRouter>
      <RunCard run={run} />
    </MemoryRouter>
  );

describe('RunCard', () => {
  it('renders the task description', () => {
    renderCard(baseRun);
    expect(screen.getByText('Fix the login bug on mobile')).toBeInTheDocument();
  });

  it('renders the repo name', () => {
    renderCard(baseRun);
    expect(screen.getByText('owner/my-repo')).toBeInTheDocument();
  });

  it('renders the issue number as a link', () => {
    renderCard(baseRun);
    expect(screen.getByText('#42')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    renderCard(baseRun);
    expect(screen.getByText('Awaiting Approval')).toBeInTheDocument();
  });

  it('renders branch name when present', () => {
    renderCard({ ...baseRun, branchName: 'openclaw/plan-1-fix-login', status: 'completed' });
    expect(screen.getByText('openclaw/plan-1-fix-login')).toBeInTheDocument();
  });

  it('renders PR link when present', () => {
    renderCard({
      ...baseRun,
      status: 'completed',
      prUrl: 'https://github.com/owner/my-repo/pull/5',
    });
    expect(screen.getByText('View PR →')).toBeInTheDocument();
  });

  it('links to the run detail page', () => {
    renderCard(baseRun);
    const links = screen.getAllByRole('link');
    const detailLink = links.find((l) => l.getAttribute('href') === `/runs/${baseRun.id}`);
    expect(detailLink).toBeDefined();
  });
});
