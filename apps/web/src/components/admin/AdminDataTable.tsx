// @version 0.9.0 - Lens: generic reusable admin data table
// Supports loading skeleton, empty state, and arbitrary JSX cells
"use client";

interface AdminDataTableProps {
  headers: string[];
  rows: React.ReactNode[][];
  emptyMessage?: string;
  isLoading?: boolean;
}

export function AdminDataTable({
  headers,
  rows,
  emptyMessage = "No data to display",
  isLoading = false,
}: AdminDataTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--bg-surface)] border-b border-border">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left font-sans font-medium text-xs uppercase tracking-wider text-ink-light"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-border">
                  {headers.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="bg-[var(--bg-surface)] animate-pulse rounded h-4 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}
            </>
          )}

          {!isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="py-12 text-center">
                <p className="font-display italic font-light text-ink-light">
                  {emptyMessage}
                </p>
              </td>
            </tr>
          )}

          {!isLoading &&
            rows.map((cells, i) => (
              <tr
                key={i}
                className={`border-b border-border last:border-0 ${
                  i % 2 === 1 ? "bg-[var(--bg-surface)]/50" : ""
                }`}
              >
                {cells.map((cell, j) => (
                  <td key={j} className="px-4 py-3 text-ink">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
