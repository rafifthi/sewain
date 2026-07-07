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
      {withImage && <Skeleton className="skeleton-card-image" />}
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

// ── Property Detail Skeleton ───────────────────────────

/**
 * Full property detail page skeleton — shape-matched to PropertyDetail layout.
 * Covers: back button, page head, overview panel (image + text + metrics), tabs, and content area.
 */
export function SkeletonPropertyDetail() {
  return (
    <div className="skeleton-property-detail" aria-hidden="true">
      {/* Back button */}
      <Skeleton width={140} height={34} rounded={6} className="skeleton-back-btn" />

      {/* Page head: title + status + actions */}
      <div className="skeleton-property-head">
        <div>
          <Skeleton width="65%" height={28} className="skeleton-text-lg" />
          <Skeleton width={80} height={22} rounded={12} />
        </div>
        <div className="skeleton-property-actions">
          <Skeleton width={72} height={34} rounded={6} />
          <Skeleton width={72} height={34} rounded={6} />
          <Skeleton width={140} height={34} rounded={6} />
        </div>
      </div>

      {/* Overview panel: image + info + metrics */}
      <div className="skeleton-property-overview">
        <div className="skeleton-property-overview-main">
          <Skeleton className="skeleton-property-overview-image" />
          <div className="skeleton-property-overview-info">
            <Skeleton width="35%" height={22} rounded={14} />
            <Skeleton width="70%" height={14} className="skeleton-text" />
            <Skeleton width="55%" height={14} className="skeleton-text" />
            <Skeleton width="40%" height={14} className="skeleton-text" />
          </div>
        </div>
        <div className="skeleton-property-metrics">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton width="65%" height={11} className="skeleton-text-sm" />
              <Skeleton width={i === 3 ? "55%" : "40%"} height={20} />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="skeleton-tabs">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} width={100} height={34} rounded={6} />
        ))}
      </div>

      {/* Content area: toolbar + table */}
      <div className="skeleton-property-content">
        <Skeleton height={34} className="skeleton-toolbar" />
        <SkeletonTable rows={4} cols={5} />
      </div>
    </div>
  );
}

// ── Tenant Detail Skeleton ─────────────────────────────

/**
 * Full tenant detail page skeleton — shape-matched to TenantDetail layout.
 * Covers: back button, summary card (avatar + name + metrics), dual-column layout.
 */
export function SkeletonTenantDetail() {
  return (
    <div className="skeleton-tenant-detail" aria-hidden="true">
      {/* Back button */}
      <Skeleton width={140} height={34} rounded={6} className="skeleton-back-btn" />

      {/* Summary card */}
      <div className="skeleton-tenant-summary">
        <div className="skeleton-tenant-summary-main">
          <div className="skeleton-tenant-heading">
            <SkeletonCircle size={56} />
            <div>
              <Skeleton width="55%" height={22} className="skeleton-text-lg" />
              <Skeleton width={80} height={22} rounded={12} />
              <Skeleton width="40%" height={14} className="skeleton-text" />
            </div>
          </div>
          <div className="skeleton-tenant-summary-actions">
            <Skeleton width={130} height={34} rounded={6} />
            <Skeleton width={72} height={34} rounded={6} />
            <SkeletonCircle size={34} />
          </div>
        </div>
        <div className="skeleton-tenant-metrics">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton width="60%" height={11} className="skeleton-text-sm" />
              <Skeleton width="35%" height={20} />
            </div>
          ))}
        </div>
      </div>

      {/* Dual column layout */}
      <div className="skeleton-tenant-columns">
        <div className="skeleton-tenant-main">
          {/* Lease status card */}
          <div className="skeleton-tenant-card">
            <Skeleton width="50%" height={18} className="skeleton-text" />
            <Skeleton width="85%" height={14} className="skeleton-text-sm" />
            <div className="skeleton-tenant-card-body">
              <Skeleton width="100%" height={72} rounded={8} />
            </div>
          </div>
          {/* Payment history card */}
          <div className="skeleton-tenant-card">
            <Skeleton width="50%" height={18} className="skeleton-text" />
            <Skeleton width="35%" height={14} className="skeleton-text-sm" />
            <div className="skeleton-tenant-card-body">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} width="100%" height={48} rounded={6} />
              ))}
            </div>
          </div>
        </div>
        <div className="skeleton-tenant-side">
          {/* Contact card */}
          <div className="skeleton-tenant-card">
            <Skeleton width="55%" height={18} className="skeleton-text" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="90%" height={40} rounded={6} />
            ))}
          </div>
          {/* Documents card */}
          <div className="skeleton-tenant-card">
            <Skeleton width="40%" height={18} className="skeleton-text" />
            <Skeleton width="65%" height={14} className="skeleton-text-sm" />
            <Skeleton width="100%" height={80} rounded={8} />
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={52} rounded={6} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dialog Form Skeleton ───────────────────────────────

/**
 * Skeleton for form dialogs that depend on async data (edit mode only).
 * Shows placeholder form fields matching the dialog layout.
 */
export function SkeletonDialogForm({
  fields = 4,
  showSectionHeads = false,
}: {
  fields?: number;
  showSectionHeads?: boolean;
}) {
  return (
    <div className="skeleton-dialog-form" aria-hidden="true">
      {/* Header */}
      <div className="skeleton-dialog-head">
        <div>
          <Skeleton width="45%" height={22} className="skeleton-text-lg" />
          <Skeleton width="70%" height={14} className="skeleton-text" />
        </div>
        <SkeletonCircle size={32} />
      </div>

      {/* Form fields */}
      <div className="skeleton-dialog-body">
        {showSectionHeads && (
          <div className="skeleton-form-section-head">
            <Skeleton width="35%" height={16} />
            <SkeletonCircle size={22} />
          </div>
        )}
        <div className="skeleton-form-fields">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="skeleton-form-field">
              <Skeleton width={i === 0 ? "35%" : "40%"} height={12} className="skeleton-text-sm" />
              <Skeleton width="100%" height={36} rounded={6} />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="skeleton-dialog-actions">
        <Skeleton width={80} height={34} rounded={6} />
        <Skeleton width={140} height={34} rounded={6} />
      </div>
    </div>
  );
}

// ── Pagination Skeleton ────────────────────────────────

/**
 * Skeleton for next-page items while pagination is fetching.
 */
export function SkeletonPagination({
  items = 3,
}: {
  items?: number;
}) {
  return (
    <div className="skeleton-pagination" aria-hidden="true">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="skeleton-pagination-item">
          <Skeleton width="100%" height={56} rounded={8} />
        </div>
      ))}
      <div className="skeleton-pagination-indicator">
        <Skeleton width={120} height={14} />
      </div>
    </div>
  );
}

// ── Error State ────────────────────────────────────────

/**
 * Error display with retry button. Replaces skeleton on timeout/error.
 */
export function ErrorState({
  message = "Gagal memuat data",
  detail = "Terjadi kesalahan saat mengambil data. Silakan coba lagi.",
  onRetry,
}: {
  message?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <div className="error-state-icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M24 14v12M24 32v1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <h3>{message}</h3>
      <p>{detail}</p>
      {onRetry && (
        <button className="button primary" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}
