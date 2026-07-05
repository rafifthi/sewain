"use client";

import React from "react";

// ── Types ──────────────────────────────────────────────

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: string | number;
  className?: string;
  inline?: boolean;
}

// ── Base Primitives ────────────────────────────────────

/**
 * Atomic skeleton block. The fundamental building block.
 * Accepts width/height/rounded for maximum flexibility.
 */
export function Skeleton({
  width,
  height,
  rounded,
  className = "",
  inline = false,
}: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === "number" ? `${height}px` : height;
  if (rounded !== undefined) style.borderRadius = typeof rounded === "number" ? `${rounded}px` : rounded;

  return (
    <div
      className={`skeleton ${inline ? "" : "skeleton-block"} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  );
}

/**
 * Circle skeleton — avatar, icon placeholder, etc.
 */
export function SkeletonCircle({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Skeleton
      width={size}
      height={size}
      rounded="50%"
      className={`skeleton-circle ${className}`.trim()}
    />
  );
}

/**
 * Multi-line text skeleton.
 * @param lines — number of text lines
 * @param width — width of each line (default "100%")
 * @param lastLineWidth — width of the last line (default "60%", simulates shorter final line)
 */
export function SkeletonText({
  lines = 3,
  width = "100%",
  lastLineWidth = "60%",
  size = "md",
  className = "",
}: {
  lines?: number;
  width?: string | number;
  lastLineWidth?: string | number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = size === "sm" ? "skeleton-text-sm" : size === "lg" ? "skeleton-text-lg" : "skeleton-text";

  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => {
        const isLast = i === lines - 1 && lines > 1;
        return (
          <Skeleton
            key={i}
            width={isLast ? lastLineWidth : width}
            className={sizeClass}
          />
        );
      })}
    </div>
  );
}

// ── Composite Layout Skeletons ─────────────────────────

/**
 * Card-shaped skeleton — title line + multiple content lines.
 */
export function SkeletonCard({
  contentLines = 3,
  withImage = false,
  className = "",
}: {
  contentLines?: number;
  withImage?: boolean;
  className?: string;
}) {
  return (
    <div className={`skeleton-card ${className}`.trim()} aria-hidden="true">
      {withImage && <Skeleton height={0} className="skeleton-card-image" />}
      <div className={withImage ? "skeleton-card-body" : ""}>
        <Skeleton width="65%" height={18} className="skeleton-text-lg" />
        <SkeletonText lines={contentLines} size="sm" width="90%" lastLineWidth="45%" />
      </div>
    </div>
  );
}

/**
 * List row skeleton — small circle avatar + two text lines.
 */
export function SkeletonListRow({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`skeleton-list-row ${className}`.trim()} aria-hidden="true">
      <SkeletonCircle size={36} />
      <div>
        <Skeleton width="55%" height={13} className="skeleton-text" />
        <Skeleton width="38%" height={11} className="skeleton-text-sm" />
      </div>
    </div>
  );
}

/**
 * Detail page skeleton — image placeholder + text blocks.
 * Matches the property-overview layout.
 */
export function SkeletonDetail({
  textBlocks = 4,
  className = "",
}: {
  textBlocks?: number;
  className?: string;
}) {
  return (
    <div className={`skeleton-detail ${className}`.trim()} aria-hidden="true">
      <Skeleton className="skeleton-detail-image" />
      <div className="skeleton-detail-lines">
        <Skeleton width="45%" height={22} />
        {Array.from({ length: textBlocks }).map((_, i) => (
          <Skeleton key={i} width={i === textBlocks - 1 ? "55%" : "75%"} height={14} className="skeleton-text" />
        ))}
      </div>
    </div>
  );
}

// ── Data Table Skeleton ────────────────────────────────

/**
 * Table-shaped skeleton — header row + N data rows.
 */
export function SkeletonTable({
  rows = 5,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="table-wrap" aria-hidden="true">
      <table>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><Skeleton height={16} className="skeleton-th" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><Skeleton height={14} className="skeleton-td" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Stats Strip Skeleton ───────────────────────────────

/**
 * Dashboard stats strip skeleton — 4 stat cards.
 */
export function SkeletonStats() {
  return (
    <div className="stats-strip" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="stat">
          <Skeleton height={12} width="60%" className="skeleton-stat-label" />
          <Skeleton height={20} width="40%" className="skeleton-stat-value" />
        </div>
      ))}
    </div>
  );
}
