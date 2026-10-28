// Splits a merged ticket into the problems its reports describe. Builds on causes.ts.

// A cause from causes.ts, or `one-day`: the desk read the report as a one-day move
// (desk-notes.json), not a month flip, so the tenant's cause does not apply to it.
import { causeOf, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'one-day';

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem | null {
  return oneDayMove.includes(r.id) ? 'one-day' : causeOf(r, t);
}

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  tenants: number;
  firstSeen: string;
  lastSeen: string;
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
};

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const by = new Map<ProblemGroup['problem'], Report[]>();
  for (const r of reports) {
    const p = problemOf(r, tenantOf(r), oneDayMove) ?? 'unplaced';
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  return [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: new Set(rs.map((r) => r.tenant)).size,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
        taggedAs: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}

// Reports whose intake tag names a different cause than their tenant does.
export function mistagged(g: ProblemGroup): number {
  return g.problem === 'parser' || g.problem === 'hint'
    ? g.reports.filter((r) => r.meta.intakeTag !== g.problem).length
    : 0;
}
