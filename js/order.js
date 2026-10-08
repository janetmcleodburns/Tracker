// Reorder: plan new sort_order values that change as few rows as possible, then write
// only those rows. Ordering is (sort_order, id), same as the original page's query.
export function planOrder(rows) {
  const n = rows.length;
  const ks = rows.map(r => [Number.isInteger(r.sort_order) ? r.sort_order : null, r.id]);
  const lt = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  // Longest increasing subsequence of current keys = rows we can leave untouched.
  const len = Array(n).fill(0), prev = Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    if (ks[i][0] === null) continue;
    len[i] = 1;
    for (let j = 0; j < i; j++) if (len[j] && lt(ks[j], ks[i]) && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; }
  }
  const keep = new Set();
  let best = len.indexOf(Math.max(0, ...len));
  while (best >= 0 && len[best]) { keep.add(best); best = prev[best]; }
  for (let guard = 0; guard <= n; guard++) {
    const vals = rows.map((r, i) => (keep.has(i) ? r.sort_order : undefined));
    let failed = null;
    for (let i = 0; i < n && !failed;) {
      if (keep.has(i)) { i++; continue; }
      let j = i;
      while (j < n && !keep.has(j)) j++;
      const lo = i > 0 ? ks[i - 1] : null, hi = j < n ? ks[j] : null;
      let v = lo ? lo[0] : hi ? hi[0] - (j - i) : 0;
      let p = lo;
      if (v < 0) { failed = [i, j]; break; }
      for (let t = i; t < j; t++) {
        if (p && !lt(p, [v, rows[t].id])) v++;
        p = [v, rows[t].id]; vals[t] = v;
      }
      if (hi && !lt(p, hi)) failed = [i, j];
      i = j;
    }
    if (!failed) return vals;
    const [i, j] = failed; // widen the gap and try again
    if (j < n && keep.has(j)) keep.delete(j); else if (i > 0 && keep.has(i - 1)) keep.delete(i - 1); else break;
  }
  return rows.map((_, i) => i);
}
