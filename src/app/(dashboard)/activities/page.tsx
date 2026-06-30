import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ArrowLeft, Activity, Calendar } from "lucide-react";

export const revalidate = 0; // Fresh calculations on every request

export default async function ActivitiesPage() {
  const session = await getCurrentUser();
  if (!session) return null;

  // Get user groups
  const userGroupMember = await db.groupMember.findMany({
    where: { userId: session.userId },
    select: { groupId: true },
  });
  const groupIds = userGroupMember.map((ug) => ug.groupId);

  // Fetch all related activity logs
  const logs = await db.activityLog.findMany({
    where: {
      OR: [
        { userId: session.userId },
        { groupId: { in: groupIds } },
      ],
    },
    include: {
      user: {
        select: { name: true, username: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50, // limit to last 50 activities
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      <Link href="/dashboard" style={styles.backLink}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div style={styles.header}>
        <h1 style={styles.title}>
          <Activity size={28} color="var(--primary)" style={{ flexShrink: 0 }} />
          Activity Log
        </h1>
        <p style={styles.subtitle}>Audit history of expenses, groups, and payments.</p>
      </div>

      <div className="glass-card" style={styles.logsCard}>
        {logs.length === 0 ? (
          <div style={styles.emptyLogs}>
            <Activity size={48} color="var(--text-muted)" style={{ marginBottom: "1rem" }} />
            <h3>No activities yet</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Log entries will appear here when you create groups, add expenses, or settle debts.
            </p>
          </div>
        ) : (
          <div style={styles.logsList}>
            {logs.map((log, index) => {
              const dateObj = new Date(log.createdAt);
              const formattedDate = dateObj.toLocaleDateString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              });
              const formattedTime = dateObj.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={log.id} style={{
                  ...styles.logItem,
                  borderBottom: index === logs.length - 1 ? "none" : "1px solid rgba(255, 255, 255, 0.05)"
                }}>
                  <div style={styles.logLeft}>
                    <div style={styles.avatar}>
                      {log.user.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div style={styles.logContent}>
                      <span style={styles.logText}>
                        <strong style={{ color: "#fff" }}>{log.user.name}</strong> (@{log.user.username}) {log.description}
                      </span>
                      <div style={styles.logMeta}>
                        <span style={styles.logTime}>
                          <Calendar size={12} style={{ display: "inline", marginRight: "0.25rem", verticalAlign: "middle" }} />
                          {formattedDate} at {formattedTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    width: "100%",
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    width: "fit-content",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  title: {
    fontSize: "2.25rem",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    background: "linear-gradient(to right, #ffffff, #cbd5e1)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
  },
  logsCard: {
    padding: "2rem",
  },
  emptyLogs: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem 2rem",
    textAlign: "center",
  },
  logsList: {
    display: "flex",
    flexDirection: "column",
  },
  logItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.25rem 0",
  },
  logLeft: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    border: "1px solid rgba(99, 102, 241, 0.2)",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: "1rem",
    flexShrink: 0,
  },
  logContent: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  logText: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  logMeta: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  logTime: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
  },
};
