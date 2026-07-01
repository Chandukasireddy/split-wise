import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUserOverallBalances } from "@/lib/balances";
import { db } from "@/lib/db";
import {
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export const revalidate = 30;

export default async function DashboardPage() {
  const session = await getCurrentUser();
  if (!session) return null;

  const overall = await getUserOverallBalances(session.userId);

  const userGroupMember = await db.groupMember.findMany({
    where: { userId: session.userId },
    select: { groupId: true },
  });
  const groupIds = userGroupMember.map((ug) => ug.groupId);

  const recentActivities = await db.activityLog.findMany({
    where: {
      OR: [{ userId: session.userId }, { groupId: { in: groupIds } }],
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  function formatCurrency(amount: number, currency: string = "EUR") {
    return new Intl.NumberFormat("en-EU", { style: "currency", currency }).format(amount);
  }

  const hasOwed = Object.keys(overall.totalOwed).length > 0;
  const hasOwes = Object.keys(overall.totalOwes).length > 0;

  return (
    <div style={styles.page} className="animate-fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Your shared expenses at a glance.</p>
        </div>
        <Link href="/groups/new" className="btn btn-primary" style={styles.createBtn}>
          <Plus size={16} />
          New Group
        </Link>
      </div>

      {/* Balance Cards — 3 columns desktop, stack on mobile */}
      <div className="grid-3-cols">
        <div className="glass-card" style={styles.balCard}>
          <div style={{ ...styles.balIcon, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <ArrowUpRight size={18} color="var(--owed)" />
          </div>
          <div>
            <span style={styles.balLabel}>Owed to you</span>
            <div style={styles.balAmounts}>
              {hasOwed
                ? Object.entries(overall.totalOwed).map(([c, a]) => (
                    <div key={c} className="balance-value" style={{ color: "var(--owed)", fontWeight: 700 }}>
                      {formatCurrency(a, c)}
                    </div>
                  ))
                : <div className="balance-value" style={{ color: "var(--text-muted)", fontWeight: 600 }}>{formatCurrency(0, "EUR")}</div>}
            </div>
          </div>
        </div>

        <div className="glass-card" style={styles.balCard}>
          <div style={{ ...styles.balIcon, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <ArrowDownLeft size={18} color="var(--owes)" />
          </div>
          <div>
            <span style={styles.balLabel}>You owe</span>
            <div style={styles.balAmounts}>
              {hasOwes
                ? Object.entries(overall.totalOwes).map(([c, a]) => (
                    <div key={c} className="balance-value" style={{ color: "var(--owes)", fontWeight: 700 }}>
                      {formatCurrency(a, c)}
                    </div>
                  ))
                : <div className="balance-value" style={{ color: "var(--text-muted)", fontWeight: 600 }}>{formatCurrency(0, "EUR")}</div>}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ ...styles.balCard, background: "linear-gradient(135deg,rgba(16,185,129,0.07) 0%,rgba(59,130,246,0.04) 100%)" }}>
          <div style={{ ...styles.balIcon, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <Sparkles size={18} color="var(--primary)" />
          </div>
          <div>
            <span style={styles.balLabel}>Net balance</span>
            <div style={styles.balAmounts}>
              {Object.keys(overall.netBalances).length > 0
                ? Object.entries(overall.netBalances).map(([c, a]) => {
                    const color = a > 0 ? "var(--owed)" : a < 0 ? "var(--owes)" : "var(--text-muted)";
                    return (
                      <div key={c} className="balance-value" style={{ color, fontWeight: 700 }}>
                        {a === 0 ? `${formatCurrency(0, c)} ✓` : formatCurrency(a, c)}
                      </div>
                    );
                  })
                : <div className="balance-value" style={{ color: "var(--text-muted)", fontWeight: 600 }}>{formatCurrency(0, "EUR")} ✓</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Main content — groups + activity */}
      <div style={styles.mainGrid} className="responsive-grid-2-1">
        {/* Groups */}
        <div style={styles.col}>
          <div style={styles.secHeader}>
            <h2 style={styles.secTitle}>
              <Users size={17} color="var(--primary)" />
              Your Groups
            </h2>
            <span style={styles.secBadge}>{overall.groups.length} active</span>
          </div>

          {overall.groups.length === 0 ? (
            <div className="glass-card" style={styles.emptyCard}>
              <Users size={36} color="var(--text-muted)" style={{ marginBottom: "0.75rem" }} />
              <h3 style={{ fontSize: "1rem", marginBottom: "0.4rem" }}>No groups yet</h3>
              <p style={{ fontSize: "0.82rem", marginBottom: "1.25rem", maxWidth: "260px" }}>
                Create a group to start splitting bills with friends.
              </p>
              <Link href="/groups/new" className="btn btn-secondary" style={{ fontSize: "0.82rem", padding: "0.5rem 1rem" }}>
                <Plus size={14} /> Create Group
              </Link>
            </div>
          ) : (
            <div style={styles.groupList}>
              {overall.groups.map((group) => {
                const hasBal = Object.values(group.balances).some((b) => b !== 0);
                return (
                  <Link key={group.id} href={`/groups/${group.id}`} className="glass-card" style={styles.groupCard}>
                    <div style={styles.groupLeft}>
                      <div style={styles.groupAvatar}>{group.name.charAt(0).toUpperCase()}</div>
                      <div style={{ minWidth: 0 }}>
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
                              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: b > 0 ? "var(--owed)" : "var(--owes)" }}>
                                {formatCurrency(Math.abs(b), c)}
                              </div>
                            </div>
                          )
                        )
                      )}
                      <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div style={styles.col}>
          <div style={styles.secHeader}>
            <h2 style={styles.secTitle}>
              <Activity size={17} color="var(--secondary)" />
              Recent Activity
            </h2>
            <Link href="/activities" style={styles.viewAll}>View all</Link>
          </div>

          <div className="glass-card" style={{ padding: "0.75rem" }}>
            {recentActivities.length === 0 ? (
              <div style={styles.emptyAct}>
                <Activity size={28} color="var(--text-muted)" />
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>No activity yet.</p>
              </div>
            ) : (
              <div>
                {recentActivities.map((log, i) => (
                  <div key={log.id} style={{
                    display: "flex", alignItems: "flex-start", gap: "0.6rem",
                    padding: "0.6rem 0.25rem",
                    borderBottom: i < recentActivities.length - 1 ? "1px solid var(--border-light)" : "none",
                  }}>
                    <div style={styles.actAvatar}>{log.user.name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4, margin: 0 }}>
                        <strong style={{ color: "var(--text-primary)" }}>{log.user.name}</strong>{" "}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{log.description}</span>
                      </p>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        {new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "1.5rem" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" },
  title: { fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" },
  subtitle: { fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.15rem" },
  createBtn: { padding: "0.5rem 1rem", fontSize: "0.85rem", gap: "0.4rem" },

  balCard: { display: "flex", alignItems: "center", gap: "0.875rem", padding: "1rem 1.25rem" },
  balIcon: { padding: "0.5rem", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  balLabel: { fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, display: "block", marginBottom: "0.2rem" },
  balAmounts: { display: "flex", flexDirection: "column", gap: "0.1rem" },

  mainGrid: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" },
  col: { display: "flex", flexDirection: "column", gap: "0.875rem" },
  secHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  secTitle: { fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-primary)" },
  secBadge: { fontSize: "0.72rem", color: "var(--primary)", background: "rgba(16,185,129,0.1)", padding: "0.15rem 0.5rem", borderRadius: "20px", fontWeight: 600 },
  viewAll: { fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600 },

  groupList: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  groupCard: { display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", padding: "0.875rem 1rem", gap: "0.75rem" },
  groupLeft: { display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 },
  groupAvatar: {
    width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
    background: "linear-gradient(135deg,var(--primary) 0%,var(--secondary) 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: "1rem", color: "#fff",
  },
  groupName: { fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  groupDesc: { fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  groupRight: { display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 },
  settled: { fontSize: "0.72rem", color: "var(--text-muted)", background: "var(--surface-hover)", padding: "0.15rem 0.5rem", borderRadius: "20px" },

  emptyCard: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2.5rem 1.5rem", textAlign: "center" },
  emptyAct: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem", textAlign: "center" },
  actAvatar: {
    width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0,
    background: "rgba(16,185,129,0.08)", border: "1px solid var(--border-light)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.72rem", fontWeight: 700, color: "var(--primary)",
  },
};
