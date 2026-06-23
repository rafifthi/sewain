"use client";

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><div className="skeleton skeleton-th" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><div className="skeleton skeleton-td" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="stats-strip">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="stat">
          <div className="skeleton skeleton-stat-label" />
          <div className="skeleton skeleton-stat-value" />
        </div>
      ))}
    </div>
  );
}
