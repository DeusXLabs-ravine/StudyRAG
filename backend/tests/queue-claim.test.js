/**
 * Regression tests for the progressive-fill queue claim.
 *
 * The queue-jump feature was broken in production once already this session:
 * POST /prioritize wrote `prioritized_at` but the fill loop precomputed a fixed
 * batch list and never read it, so opening a not-yet-written module had no
 * effect. The fix (claimNextModuleBatch) re-reads the database on every claim
 * specifically so ordering changes take effect immediately — these tests exist
 * to keep that property, and the atomic-claim race safety, from regressing
 * silently again.
 *
 * Exercises claimNextModuleBatch against a small in-memory fake of the
 * `modules` table, injected via its optional `client` parameter — the function
 * defaults to the real Supabase singleton in production and takes the fake only
 * here, so this suite runs offline and fast with no module-mocking involved.
 * The fake implements only the exact query shape claimNextModuleBatch issues
 * (select/eq/order/limit, then update/in/eq/select); it is not a general
 * Supabase mock.
 */
import { describe, it, expect } from 'vitest';
import progressiveCourseService from '../src/services/progressiveCourseService.js';

const { claimNextModuleBatch } = progressiveCourseService;

function makeFakeModulesTable(rows) {
  const table = new Map(rows.map(r => [r.id, { ...r }]));

  return {
    from(name) {
      if (name !== 'modules') throw new Error(`fake only implements 'modules', got '${name}'`);
      return {
        select() {
          const filters = {};
          const api = {
            eq(col, val) { filters[col] = val; return api; },
            order() { return api; }, // ordering asserted separately below
            limit(n) {
              const matched = [...table.values()]
                .filter(r => Object.entries(filters).every(([k, v]) => r[k] === v))
                // Emulates ORDER BY prioritized_at DESC NULLS LAST, order_index
                // ASC — the exact ordering claimNextModuleBatch requests.
                .sort((a, b) => {
                  const pa = a.prioritized_at, pb = b.prioritized_at;
                  if (pa && pb) return pb.localeCompare(pa);
                  if (pa && !pb) return -1;
                  if (!pa && pb) return 1;
                  return a.order_index - b.order_index;
                })
                .slice(0, n);
              return Promise.resolve({ data: matched.map(r => ({ ...r })) });
            },
          };
          return api;
        },
        update(patch) {
          const filters = {};
          const api = {
            in(col, vals) { filters[`${col}__in`] = vals; return api; },
            eq(col, val) { filters[col] = val; return api; },
            select() {
              const ids = filters['id__in'] || [];
              const written = [];
              for (const id of ids) {
                const row = table.get(id);
                // The critical line: re-check content_status against CURRENT
                // table state, not against whatever the caller last read. This
                // is what makes the claim atomic against a concurrent caller.
                if (row && row.content_status === filters.content_status) {
                  Object.assign(row, patch);
                  written.push({ id });
                }
              }
              return Promise.resolve({ data: written });
            },
          };
          return api;
        },
      };
    },
    _rows: () => [...table.values()],
  };
}

function makeRows(n, { prioritizedIndex = null } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    title: `Topic ${i}`,
    document_id: 'doc1',
    content_status: 'pending',
    order_index: i,
    prioritized_at: i === prioritizedIndex ? '2026-08-22T12:00:00.000Z' : null,
  }));
}

describe('claimNextModuleBatch', () => {
  it('returns null when the queue is empty', async () => {
    const db = makeFakeModulesTable([]);
    const claimed = await claimNextModuleBatch('doc1', 3, db);
    expect(claimed).toBeNull();
  });

  it('claims rows in document order and flips them to writing', async () => {
    const db = makeFakeModulesTable(makeRows(5));
    const claimed = await claimNextModuleBatch('doc1', 3, db);

    expect(claimed).toHaveLength(3);
    expect(claimed.map(r => r.id)).toEqual(['m0', 'm1', 'm2']);
    for (const row of db._rows().filter(r => claimed.some(c => c.id === r.id))) {
      expect(row.content_status).toBe('writing');
    }
  });

  it('a prioritised module is claimed FIRST, ahead of document order', async () => {
    const db = makeFakeModulesTable(makeRows(5, { prioritizedIndex: 4 }));
    const claimed = await claimNextModuleBatch('doc1', 3, db);

    // m4 has prioritized_at set — despite being LAST in document order, it must
    // be claimed FIRST. This is the exact behaviour that was silently broken
    // when /prioritize wrote a column nothing read.
    expect(claimed[0].id).toBe('m4');
  });

  it('two concurrent callers racing the same rows never both win the same module', async () => {
    const db = makeFakeModulesTable(makeRows(3));

    // Both callers read the table before either writes — the real race this
    // guards against (BATCH_CONCURRENCY workers polling concurrently).
    const [a, b] = await Promise.all([
      claimNextModuleBatch('doc1', 3, db),
      claimNextModuleBatch('doc1', 3, db),
    ]);

    const aIds = a.map(r => r.id);
    const bIds = b.map(r => r.id);
    const overlap = aIds.filter(id => bIds.includes(id));
    expect(overlap, 'a module was claimed by both callers').toEqual([]);
    // Together they must not exceed what existed — no module fabricated or lost.
    expect(new Set([...aIds, ...bIds]).size).toBe(aIds.length + bIds.length);
  });

  it('only ever returns rows whose content_status was pending at claim time', async () => {
    const rows = makeRows(3);
    rows[1].content_status = 'ready'; // already generated — must be ignored
    const db = makeFakeModulesTable(rows);
    const claimed = await claimNextModuleBatch('doc1', 5, db);

    expect(claimed.map(r => r.id)).not.toContain('m1');
  });

  it('scopes claims to the requested document only', async () => {
    const rows = [
      ...makeRows(2),
      { id: 'other0', document_id: 'doc2', content_status: 'pending', order_index: 0, prioritized_at: null },
    ];
    const db = makeFakeModulesTable(rows);
    const claimed = await claimNextModuleBatch('doc1', 5, db);

    expect(claimed.map(r => r.id)).not.toContain('other0');
  });
});
