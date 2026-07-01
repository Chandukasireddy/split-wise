"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Trash2 } from "lucide-react";
import { deleteActivityLog } from "@/app/actions/userActions";

interface LogEntry {
  id: string;
  description: string;
  createdAt: Date;
  userId: string;
  user: { name: string; username: string };
}

interface Props {
  logs: LogEntry[];
  currentUserId: string;
}

export default function ActivitiesClient({ logs, currentUserId }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    await deleteActivityLog(id);
    setDeleting(null);
    router.refresh();
  }

  if (logs.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
          No activities yet. Create groups, add expenses, or settle debts to see logs here.
        </p>
      </div>
    );
  }

  // Group logs by date
  const grouped: Record<string, LogEntry[]> = {};
  logs.forEach((log) => {
    const key = new Date(log.createdAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(log);
  });

  return (
    <div style={styles.list}>
      {Object.entries(grouped).map(([date, entries]) => (
        <div key={date} style={styles.group}>
          <div style={styles.dateLabel}>{date}</div>
          {entries.map((log, i) => {
            const isOpen = expanded === log.id;
            const isOwn = log.userId === currentUserId;
            const short = log.description.length > 60 ? log.description.slice(0, 60) + "…" : log.description;
            const time = new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

            return (
              <div
                key={log.id}
                style={{
                  ...styles.item,
                  borderBottom: i < entries.length - 1 ? "1px solid var(--border-light)" : "none",
                  background: isOpen ? "var(--surface-hover)" : "transparent",
                }}
              >
                {/* Collapsed row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : log.id)}
                  style={styles.itemBtn}
                >
                  <div style={styles.avatarWrap}>
                    <div style={styles.avatar}>{log.user.name.charAt(0).toUpperCase()}</div>
                  </div>

                  <div style={styles.itemMain}>
                    <span style={styles.itemText}>
                      <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                        {log.user.name}
                      </strong>{" "}
                      <span style={{ color: "var(--text-secondary)" }}>{isOpen ? log.description : short}</span>
                    </span>
                    {!isOpen && (
                      <span style={styles.itemTime}>{time}</span>
                    )}
                  </div>

                  <ChevronDown
                    size={15}
                    color="var(--text-muted)"
                    style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}
                  />
                </button>

                {/* Expanded detail row */}
                {isOpen && (
                  <div style={styles.expandedRow}>
                    <div style={styles.expandedMeta}>
                      <span style={styles.expandedBadge}>@{log.user.username}</span>
                      <span style={styles.expandedTime}>{time}</span>
                    </div>
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(log.id)}
                        disabled={deleting === log.id}
                        style={styles.deleteBtn}
                        title="Delete this activity"
                      >
                        <Trash2 size={13} />
                        {deleting === log.id ? "Deleting…" : "Delete"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: { display: "flex", flexDirection: "column", gap: "1.25rem" },
  group: {
    background: "#fff",
    border: "1px solid var(--border-light)",
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  dateLabel: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    padding: "0.6rem 1rem",
    borderBottom: "1px solid var(--border-light)",
    background: "var(--surface-hover)",
  },
  item: { transition: "background 0.15s" },
  itemBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem 1rem",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  avatarWrap: { flexShrink: 0 },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "rgba(16,185,129,0.1)",
    border: "1px solid rgba(16,185,129,0.2)",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.85rem",
  },
  itemMain: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.1rem" },
  itemText: { fontSize: "0.855rem", lineHeight: 1.45, color: "var(--text-secondary)" },
  itemTime: { fontSize: "0.7rem", color: "var(--text-muted)" },
  expandedRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.4rem 1rem 0.75rem 3.5rem",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  expandedMeta: { display: "flex", alignItems: "center", gap: "0.5rem" },
  expandedBadge: {
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "var(--primary)",
    background: "rgba(16,185,129,0.08)",
    padding: "0.15rem 0.5rem",
    borderRadius: "20px",
  },
  expandedTime: { fontSize: "0.72rem", color: "var(--text-muted)" },
  deleteBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#ef4444",
    background: "rgba(239,68,68,0.07)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: "8px",
    padding: "0.25rem 0.6rem",
    cursor: "pointer",
  },
  empty: {
    padding: "3rem 1rem",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
