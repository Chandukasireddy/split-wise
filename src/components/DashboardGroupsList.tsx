"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  ChevronRight,
  GripVertical,
  Check,
  RotateCcw,
} from "lucide-react";

export interface DashboardGroupItem {
  id: string;
  name: string;
  description: string | null;
  balances: Record<string, number>;
  latestActivityAt?: string | null;
}

interface DashboardGroupsListProps {
  groups: DashboardGroupItem[];
  userId: string;
}

function formatCurrency(amount: number, currency: string = "EUR") {
  return new Intl.NumberFormat("en-EU", { style: "currency", currency }).format(amount);
}

export default function DashboardGroupsList({
  groups: initialGroups,
  userId,
}: DashboardGroupsListProps) {
  const [groups, setGroups] = useState<DashboardGroupItem[]>(initialGroups);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [hasCustomOrder, setHasCustomOrder] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Touch tracking refs
  const touchStartY = useRef<number>(0);
  const touchCurrentIndex = useRef<number | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const storageKey = `splitwise_groups_order_${userId}`;

  // Load custom order from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const orderIds: string[] = JSON.parse(saved);
        if (Array.isArray(orderIds) && orderIds.length > 0) {
          const map = new Map(initialGroups.map((g) => [g.id, g]));
          const ordered: DashboardGroupItem[] = [];
          
          for (const id of orderIds) {
            const item = map.get(id);
            if (item) {
              ordered.push(item);
              map.delete(id);
            }
          }
          // Append any new groups that were not in saved custom order
          map.forEach((item) => ordered.push(item));

          setGroups(ordered);
          setHasCustomOrder(true);
          return;
        }
      }
    } catch {
      // Ignore parse errors
    }
    // Default: use server's latest-activity order
    setGroups(initialGroups);
    setHasCustomOrder(false);
  }, [initialGroups, storageKey]);

  // Save current order to localStorage
  function saveOrder(newGroups: DashboardGroupItem[]) {
    try {
      const orderIds = newGroups.map((g) => g.id);
      localStorage.setItem(storageKey, JSON.stringify(orderIds));
      setHasCustomOrder(true);
    } catch {
      // Ignore storage errors
    }
  }

  // Reset to default latest activity sort
  function handleResetToRecent() {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    // Sort by latestActivityAt descending
    const sorted = [...initialGroups].sort((a, b) => {
      const tA = a.latestActivityAt ? new Date(a.latestActivityAt).getTime() : 0;
      const tB = b.latestActivityAt ? new Date(b.latestActivityAt).getTime() : 0;
      return tB - tA;
    });
    setGroups(sorted);
    setHasCustomOrder(false);
    setIsReorderMode(false);
  }

  // HTML5 Mouse Drag handlers
  function handleDragStart(index: number, e: React.DragEvent) {
    if (!isReorderMode) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}`);
  }

  function handleDragOver(index: number, e: React.DragEvent) {
    if (!isReorderMode || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }

  function handleDrop(targetIndex: number, e: React.DragEvent) {
    if (!isReorderMode || draggedIndex === null) return;
    e.preventDefault();
    if (draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...groups];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);

    setGroups(updated);
    saveOrder(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  // Mobile Touch Drag handlers
  function handleTouchStart(index: number, e: React.TouchEvent) {
    if (!isReorderMode) return;
    touchStartY.current = e.touches[0].clientY;
    touchCurrentIndex.current = index;
    setDraggedIndex(index);
    setDragOverIndex(index);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignore
      }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isReorderMode || touchCurrentIndex.current === null) return;
    const clientY = e.touches[0].clientY;
    const clientX = e.touches[0].clientX;

    // Find element under finger
    const element = document.elementFromPoint(clientX, clientY);
    if (element) {
      const card = element.closest("[data-group-index]") as HTMLElement | null;
      if (card && card.dataset.groupIndex !== undefined) {
        const hoverIndex = parseInt(card.dataset.groupIndex, 10);
        if (!isNaN(hoverIndex) && hoverIndex !== dragOverIndex) {
          setDragOverIndex(hoverIndex);
        }
      }
    }
  }

  function handleTouchEnd() {
    if (!isReorderMode || touchCurrentIndex.current === null) return;
    const source = touchCurrentIndex.current;
    const target = dragOverIndex;

    if (target !== null && source !== target) {
      const updated = [...groups];
      const [moved] = updated.splice(source, 1);
      updated.splice(target, 0, moved);

      setGroups(updated);
      saveOrder(updated);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(10);
        } catch {
          // Ignore
        }
      }
    }

    touchCurrentIndex.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  return (
    <div style={styles.groupsSection}>
      {/* Section Header with Reorder Controls */}
      <div style={styles.secHeader}>
        <div style={styles.secTitleWrap}>
          <h2 style={styles.secTitle}>
            <Users size={17} color="var(--primary)" />
            <span>Your Groups</span>
          </h2>
          <span style={styles.secBadge}>{groups.length} active</span>
        </div>

        {/* Action controls: Sort status & Reorder button */}
        {groups.length > 1 && (
          <div style={styles.secActions}>
            {hasCustomOrder && !isReorderMode && (
              <button
                type="button"
                onClick={handleResetToRecent}
                style={styles.resetBtn}
                title="Reset to default recent activity sorting"
              >
                <RotateCcw size={12} />
                <span>Reset order</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsReorderMode((prev) => !prev)}
              style={isReorderMode ? styles.reorderBtnActive : styles.reorderBtn}
              title={isReorderMode ? "Finish reordering" : "Reorder groups"}
            >
              {isReorderMode ? (
                <>
                  <Check size={13} strokeWidth={2.5} />
                  <span>Done</span>
                </>
              ) : (
                <>
                  <GripVertical size={13} />
                  <span>Reorder</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Helper callout banner when in reorder mode */}
      {isReorderMode && (
        <div style={styles.reorderBanner} className="animate-fade-in">
          <GripVertical size={14} color="var(--primary)" />
          <span>Drag handles or cards to reorder groups</span>
        </div>
      )}

      {/* Group List or Empty State */}
      {groups.length === 0 ? (
        <div className="glass-card" style={styles.emptyCard}>
          <Users size={36} color="var(--text-muted)" style={{ marginBottom: "0.75rem" }} />
          <h3 style={{ fontSize: "1rem", marginBottom: "0.4rem" }}>No groups yet</h3>
          <p style={{ fontSize: "0.82rem", marginBottom: "1.25rem", maxWidth: "260px", color: "var(--text-secondary)" }}>
            Create a group to start splitting bills with friends.
          </p>
          <Link
            href="/groups/new"
            className="btn btn-secondary"
            style={{ fontSize: "0.82rem", padding: "0.5rem 1rem" }}
          >
            <Plus size={14} /> Create Group
          </Link>
        </div>
      ) : (
        <div
          ref={listContainerRef}
          style={styles.groupList}
          onTouchMove={isReorderMode ? handleTouchMove : undefined}
          onTouchEnd={isReorderMode ? handleTouchEnd : undefined}
        >
          {groups.map((group, index) => {
            const hasBal = Object.values(group.balances).some((b) => b !== 0);
            const isDragging = draggedIndex === index;
            const isTarget = dragOverIndex === index && draggedIndex !== index;

            const cardContent = (
              <>
                <div style={styles.groupLeft}>
                  {/* Drag Handle (visible in reorder mode) */}
                  {isReorderMode && (
                    <div
                      style={styles.dragHandle}
                      onTouchStart={(e) => handleTouchStart(index, e)}
                      title="Drag to reorder"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical size={18} />
                    </div>
                  )}

                  <div style={styles.groupAvatar}>
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={styles.groupName}>{group.name}</h3>
                    <p style={styles.groupDesc}>{group.description || "No description"}</p>
                  </div>
                </div>

                <div style={styles.groupRight}>
                  {!hasBal ? (
                    <span style={styles.settled}>settled</span>
                  ) : (
                    Object.entries(group.balances).map(([c, b]) =>
                      b === 0 ? null : (
                        <div key={c} style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            {b > 0 ? "owed" : "owes"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.9rem",
                              fontWeight: 700,
                              color: b > 0 ? "var(--owed)" : "var(--owes)",
                            }}
                          >
                            {formatCurrency(Math.abs(b), c)}
                          </div>
                        </div>
                      )
                    )
                  )}
                  {!isReorderMode && (
                    <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  )}
                </div>
              </>
            );

            // In Reorder mode: render as draggable div to avoid navigation
            if (isReorderMode) {
              return (
                <div
                  key={group.id}
                  data-group-index={index}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(index, e)}
                  onDragOver={(e) => handleDragOver(index, e)}
                  onDrop={(e) => handleDrop(index, e)}
                  onDragEnd={handleDragEnd}
                  className="glass-card"
                  style={{
                    ...styles.groupCard,
                    cursor: "grab",
                    userSelect: "none",
                    touchAction: "none",
                    opacity: isDragging ? 0.45 : 1,
                    borderColor: isTarget
                      ? "var(--primary)"
                      : isDragging
                      ? "var(--primary)"
                      : "var(--border-light)",
                    transform: isTarget ? "scale(1.015)" : "none",
                    boxShadow: isDragging ? "0 10px 24px rgba(0,0,0,0.5)" : undefined,
                    transition: "transform 0.18s ease, border-color 0.18s ease, opacity 0.18s ease",
                  }}
                >
                  {cardContent}
                </div>
              );
            }

            // Normal mode: standard clickable Link
            return (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="glass-card"
                style={styles.groupCard}
              >
                {cardContent}
              </Link>
            );
          })}

          {/* Add Group Pill */}
          {!isReorderMode && (
            <div style={styles.addGroupContainer}>
              <Link href="/groups/new" className="group-add-pill" title="Add group">
                <Plus size={15} strokeWidth={2.2} />
                <span>Add group</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  groupsSection: { display: "flex", flexDirection: "column", gap: "0.875rem" },
  secHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" },
  secTitleWrap: { display: "flex", alignItems: "center", gap: "0.5rem" },
  secTitle: { fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-primary)" },
  secBadge: { fontSize: "0.72rem", color: "var(--primary)", background: "rgba(16,185,129,0.1)", padding: "0.15rem 0.5rem", borderRadius: "20px", fontWeight: 600 },
  secActions: { display: "flex", alignItems: "center", gap: "0.45rem" },

  reorderBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    padding: "0.3rem 0.65rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid var(--border-light)",
    borderRadius: "20px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  reorderBtnActive: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    padding: "0.3rem 0.75rem",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#052e16",
    background: "var(--primary)",
    border: "1px solid var(--primary)",
    borderRadius: "20px",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
    transition: "all 0.15s ease",
  },
  resetBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    padding: "0.3rem 0.6rem",
    fontSize: "0.72rem",
    fontWeight: 500,
    color: "var(--text-muted)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    transition: "color 0.15s ease",
  },

  reorderBanner: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.55rem 0.85rem",
    fontSize: "0.76rem",
    color: "var(--text-secondary)",
    background: "rgba(16, 185, 129, 0.06)",
    border: "1px dashed rgba(16, 185, 129, 0.25)",
    borderRadius: "10px",
  },

  groupList: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  groupCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    textDecoration: "none",
    padding: "0.875rem 1rem",
    gap: "0.75rem",
    minHeight: "56px",
    borderRadius: "14px",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
  },
  groupLeft: { display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 },
  dragHandle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    color: "var(--text-muted)",
    cursor: "grab",
    touchAction: "none",
    flexShrink: 0,
    marginLeft: "-0.2rem",
  },
  groupAvatar: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    flexShrink: 0,
    background: "linear-gradient(135deg,var(--primary) 0%,var(--secondary) 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "1rem",
    color: "#fff",
  },
  groupName: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  groupDesc: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginTop: "0.1rem",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  groupRight: { display: "flex", alignItems: "center", gap: "0.65rem", flexShrink: 0 },
  settled: { fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 },
  addGroupContainer: { display: "flex", justifyContent: "center", marginTop: "0.5rem" },
  emptyCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2.5rem 1rem",
    textAlign: "center",
    borderRadius: "16px",
  },
};

