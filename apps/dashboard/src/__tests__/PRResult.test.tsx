import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PRResult from '../components/PRResult';

describe('PRResult', () => {
  it('renders PR URL', () => {
    render(
      <PRResult
        prUrl="https://github.com/owner/repo/pull/5"
        prNumber={5}
        branchName="openclaw/plan-1"
        repo="owner/repo"
      />
    );
    expect(screen.getByText('View PR →')).toBeInTheDocument();
    expect(screen.getByText('PR #5')).toBeInTheDocument();
  });

  it('renders branch name', () => {
    render(
      <PRResult
        prUrl="https://github.com/owner/repo/pull/5"
        branchName="openclaw/plan-1"
        repo="owner/repo"
      />
    );
    expect(screen.getByText('openclaw/plan-1')).toBeInTheDocument();
  });

  it('renders issue link when provided', () => {
    render(
      <PRResult
        prUrl="https://github.com/owner/repo/pull/5"
        repo="owner/repo"
        issueUrl="https://github.com/owner/repo/issues/10"
      />
    );
    expect(screen.getAllByRole('link').some(el =>
      el.getAttribute('href')?.includes('/issues/10')
    )).toBe(true);
  });

  it('shows Code Ready header', () => {
    render(
      <PRResult
        prUrl="https://github.com/owner/repo/pull/5"
        repo="owner/repo"
      />
    );
    expect(screen.getByText('Code Ready')).toBeInTheDocument();
  });
});
