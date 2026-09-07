import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { getUserOverallBalances } from "@/lib/balances";
import { ArrowUp, ArrowDown } from "lucide-react";
import DashboardGroupsList from "@/components/DashboardGroupsList";

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

      {/* Your Groups with Draggable Reordering & Recent Activity Sorting */}
      <DashboardGroupsList groups={overall.groups} userId={session.userId} />
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
};
