<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import tickets from '#lib/data/tickets-4471.json';
  import { uniqueById, type Report } from '#lib/kb/causes';
  import { groupByProblem, mistagged } from '#lib/kb/problems';
  import { tenantOf } from '#lib/kb/locales';

  let { ticket }: { ticket: number } = $props();

  type Filed = { label: string; issue: string | null };
  const filed = tickets as Record<string, Filed>;

  const merged = $derived(uniqueById(reports as Report[]).filter((r) => r.mergedInto === ticket));
  const groups = $derived(groupByProblem(merged, tenantOf, notes.oneDayMove));
  const tags = (g: { taggedAs: Record<string, number> }) =>
    Object.entries(g.taggedAs)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, n]) => `${tag} ×${n}`)
      .join(' · ');
  const issueNo = (url: string) => url.split('/').pop();
</script>

<p class="sum">
  <strong>{merged.length}</strong> reports merged into #{ticket} ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>intake tagged</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      <tr class:open={!filed[g.problem]?.issue}>
        <td><code>{g.problem}</code><br /><span class="label">{filed[g.problem]?.label ?? 'no tenant on file'}</span></td>
        <td>{g.reports.length}</td>
        <td class="tags">{tags(g)}</td>
        <td>{g.tenants}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if filed[g.problem]?.issue}
            <a href={filed[g.problem].issue}>issue #{issueNo(filed[g.problem].issue as string)}</a>
          {:else}
            not filed
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

{#each groups as g (g.problem)}
  {@const off = mistagged(g)}
  {#if off}
    <p class="note">{off} of the <code>{g.problem}</code> reports were tagged otherwise by intake; placed by tenant.</p>
  {/if}
{/each}

<h3>One report from each</h3>
{#each groups as g (g.problem)}
  {@const r = g.reports[0]}
  <blockquote>
    <p>{r.body}</p>
    <footer><code>{g.problem}</code> · {r.id} · {r.tenant} · {r.channel} · {r.receivedAt.slice(0, 10)}</footer>
  </blockquote>
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .label { color: var(--muted); font-size: 0.85em; }
  .tags { color: var(--muted); font-size: 0.85em; }
  .note { color: var(--muted); font-size: 0.85em; }
  .open td:last-child { color: var(--warn); font-weight: 600; }
  blockquote { margin: 0.75rem 0; padding: 0.25rem 1rem; border-left: 3px solid var(--line); }
  blockquote p { margin: 0.25rem 0; }
  blockquote footer { color: var(--muted); font-size: 0.8rem; }
</style>
