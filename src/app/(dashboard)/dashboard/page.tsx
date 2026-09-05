import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUserOverallBalances } from "@/lib/balances";
import {
  Users,
  Plus,
  ArrowUp,
  ArrowDown,
  ChevronRight,
} from "lucide-react";

export const revalidate = 30;

export default async function DashboardPage() {
  const session = await getCurrentUser();
  if (!session) return null;

  const overall = await getUserOverallBalances(session.userId);

  function formatCurrency(amount: number, currency: string = "EUR") {
    return new Intl.NumberFormat("en-EU", { style: "currency", currency }).format(amount);
  }

  const hasOwed = Object.keys(overall.totalOwed).length > 0;
  const hasOwes = Object.keys(overall.totalOwes).length > 0;

  return (
    <div style={styles.page} className="animate-fade-in">
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Groups</h1>
      </div>

      {/* Balance Summary — Single Compact Line with Up & Down Arrows */}
      <div className="glass-card" style={styles.balanceStrip}>
        <div style={styles.stripItem}>
          <div style={styles.stripIconOwed}>
            <ArrowUp size={16} strokeWidth={2.5} />
          </div>
          <div style={styles.stripInfo}>
            <span style={styles.stripLabel}>Owed to you</span>
            <div style={styles.stripAmounts}>
              {hasOwed
                ? Object.entries(overall.totalOwed).map(([c, a]) => (
                    <span key={c} style={styles.owedValue}>
                      {formatCurrency(a, c)}
                    </span>
                  ))
                : <span style={styles.zeroValue}>{formatCurrency(0, "EUR")}</span>}
            </div>
          </div>
        </div>

        <div style={styles.stripDivider} />

        <div style={styles.stripItem}>
          <div style={styles.stripIconOwes}>
            <ArrowDown size={16} strokeWidth={2.5} />
          </div>
          <div style={styles.stripInfo}>
            <span style={styles.stripLabel}>You owe</span>
            <div style={styles.stripAmounts}>
              {hasOwes
                ? Object.entries(overall.totalOwes).map(([c, a]) => (
                    <span key={c} style={styles.owesValue}>
                      {formatCurrency(a, c)}
                    </span>
                  ))
                : <span style={styles.zeroValue}>{formatCurrency(0, "EUR")}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Your Groups */}
      <div style={styles.groupsSection}>
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
            <div style={styles.addGroupContainer}>
              <Link href="/groups/new" className="group-add-pill" title="Add group">
                <Plus size={15} strokeWidth={2.2} />
                <span>Add group</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "800px", margin: "0 auto", width: "100%" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" },
  title: { fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" },
  subtitle: { fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.15rem" },
  createBtn: { padding: "0.6rem 1.15rem", fontSize: "0.875rem", gap: "0.45rem", minHeight: "42px" },

  /* Single-line balance bar */
  balanceStrip: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.85rem 1.15rem",
    gap: "0.75rem",
    width: "100%",
  },
  stripItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.65rem",
    flex: 1,
    minWidth: 0,
  },
  stripIconOwed: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    border: "1px solid rgba(16, 185, 129, 0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: "var(--owed)",
  },
  stripIconOwes: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: "var(--owes)",
  },
  stripInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "0.1rem",
    minWidth: 0,
  },
  stripLabel: {
    fontSize: "0.7rem",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  stripAmounts: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.35rem",
    flexWrap: "wrap",
  },
  owedValue: {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "var(--owed)",
  },
  owesValue: {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "var(--owes)",
  },
  zeroValue: {
    fontSize: "1.05rem",
    fontWeight: 600,
    color: "var(--text-muted)",
  },
  stripDivider: {
    width: "1px",
    height: "34px",
    backgroundColor: "var(--border-light)",
    flexShrink: 0,
  },

  /* Groups */
  groupsSection: { display: "flex", flexDirection: "column", gap: "0.875rem" },
  secHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  secTitle: { fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-primary)" },
  secBadge: { fontSize: "0.72rem", color: "var(--primary)", background: "rgba(16,185,129,0.1)", padding: "0.15rem 0.5rem", borderRadius: "20px", fontWeight: 600 },

  groupList: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  groupCard: { display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", padding: "0.875rem 1rem", gap: "0.75rem", minHeight: "56px" },
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
  addGroupContainer: { display: "flex", justifyContent: "center", marginTop: "0.5rem", marginBottom: "0.25rem" },
};
