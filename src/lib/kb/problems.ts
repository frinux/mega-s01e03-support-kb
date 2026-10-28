// The problems in a merged ticket, counted the way the desk counts them: by cause (causes.ts), each
// report where it is filed. Reports the desk read as a one-day move (desk-notes.json) are a problem
// of their own, but they stay counted under the cause they are filed under, as CauseTable does.
import { groupByCause, type CauseGroup, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = CauseGroup['cause'] | 'one-day';

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: number;
  firstSeen: string;
  lastSeen: string;
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
};

function summarize(problem: Problem, rs: Report[]): ProblemGroup {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    tenants: new Set(rs.map((r) => r.tenant)).size,
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
    taggedAs: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
  };
}

export function problemGroups(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const causes = groupByCause(reports, tenantOf).map((g) => summarize(g.cause, g.reports));
  const moved = reports.filter((r) => oneDayMove.includes(r.id));
  return moved.length ? [...causes, summarize('one-day', moved)] : causes;
}

// Reports whose intake tag names a different cause than their tenant does.
export function mistagged(g: ProblemGroup): number {
  return g.problem === 'parser' || g.problem === 'hint'
    ? g.reports.filter((r) => r.meta.intakeTag !== g.problem).length
    : 0;
}
