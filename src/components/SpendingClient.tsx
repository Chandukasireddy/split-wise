"use client";

import React, { useState } from "react";
import {
  PieChart,
  ArrowUpRight,
  TrendingDown,
  Users,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";
import { PersonalSpendingSummary } from "@/app/actions/spendingActions";

interface Props {
  summary: PersonalSpendingSummary;
}

export default function SpendingClient({ summary }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "categories" | "transactions">("overview");

  function formatCurrency(amount: number, currency = summary.currency) {
    return new Intl.NumberFormat("en-EU", {
      style: "currency",
      currency,
    }).format(amount);
  }

  const {
    actualExpenditure,
    bankOutflow,
    paidForOthers,
    reimbursementsReceived,
    netReceivables,
    categories,
    recentTransactions,
  } = summary;

  return (
    <div style={styles.page} className="animate-fade-in">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Personal Spending</h1>
          <p style={styles.subtitle}>
            True consumption reconciled with shared bills & cash flow
          </p>
        </div>
      </div>

      {/* The Core Reconciliation Equation Card */}
      <div className="glass-card" style={styles.equationCard}>
        <div style={styles.equationHeader}>
          <div style={styles.badgeEquation}>
            <Sparkles size={14} />
            <span>Dual-Ledger Reconciliation</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Money Flow ≠ Actual Expenditure
          </div>
        </div>

        <div style={styles.equationVisual}>
          <div style={styles.equationItem}>
            <span style={styles.equationLabel}>Actual Expenditure</span>
            <span style={styles.equationValPrimary}>
              {formatCurrency(actualExpenditure)}
            </span>
            <span style={styles.equationSub}>Your true consumption</span>
          </div>

          <div style={styles.equationOperator}>+</div>

          <div style={styles.equationItem}>
            <span style={styles.equationLabel}>Lent to Others</span>
            <span style={styles.equationValLent}>
              {formatCurrency(paidForOthers)}
            </span>
            <span style={styles.equationSub}>Temporarily fronted</span>
          </div>

          <div style={styles.equationOperator}>=</div>

          <div style={styles.equationItem}>
            <span style={styles.equationLabel}>Total Outflow</span>
            <span style={styles.equationValTotal}>
              {formatCurrency(bankOutflow)}
            </span>
            <span style={styles.equationSub}>Money left your pocket</span>
          </div>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div style={styles.metricsGrid}>
        {/* Card 1: Actual Spend */}
        <div className="glass-card" style={styles.metricCard}>
          <div style={styles.metricTop}>
            <span style={styles.metricLabel}>Actual Consumption</span>
            <div style={{ ...styles.metricIconWrap, background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
              <TrendingDown size={17} />
            </div>
          </div>
          <div style={styles.metricAmount}>
            {formatCurrency(actualExpenditure)}
          </div>
          <div style={styles.metricFooter}>
            Only what was consumed by you
          </div>
        </div>

        {/* Card 2: Bank Outflow */}
        <div className="glass-card" style={styles.metricCard}>
          <div style={styles.metricTop}>
            <span style={styles.metricLabel}>Total Outflow</span>
            <div style={{ ...styles.metricIconWrap, background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6" }}>
              <ArrowUpRight size={17} />
            </div>
          </div>
          <div style={styles.metricAmount}>
            {formatCurrency(bankOutflow)}
          </div>
          <div style={styles.metricFooter}>
            Includes full bills paid for groups
          </div>
        </div>

        {/* Card 3: Paid for Others */}
        <div className="glass-card" style={styles.metricCard}>
          <div style={styles.metricTop}>
            <span style={styles.metricLabel}>Paid for Others</span>
            <div style={{ ...styles.metricIconWrap, background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b" }}>
              <Users size={17} />
            </div>
          </div>
          <div style={styles.metricAmount}>
            {formatCurrency(paidForOthers)}
          </div>
          <div style={styles.metricFooter}>
            Money you are to be reimbursed
          </div>
        </div>

        {/* Card 4: Net Receivables */}
        <div className="glass-card" style={styles.metricCard}>
          <div style={styles.metricTop}>
            <span style={styles.metricLabel}>Currently Owed to You</span>
            <div style={{ ...styles.metricIconWrap, background: "rgba(139, 92, 246, 0.12)", color: "#8b5cf6" }}>
              <Layers size={17} />
            </div>
          </div>
          <div style={styles.metricAmount}>
            {formatCurrency(netReceivables)}
          </div>
          <div style={styles.metricFooter}>
            {reimbursementsReceived > 0
              ? `${formatCurrency(reimbursementsReceived)} reimbursed so far`
              : "Outstanding from friends"}
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={styles.tabsRow}>
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`action-pill-btn ${activeTab === "overview" ? "active" : ""}`}
        >
          <span>Overview</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={`action-pill-btn ${activeTab === "categories" ? "active" : ""}`}
        >
          <span>Categories ({categories.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={`action-pill-btn ${activeTab === "transactions" ? "active" : ""}`}
        >
          <span>Recent ({recentTransactions.length})</span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Explanation Banner */}
          <div className="glass-card" style={styles.explainerCard}>
            <Info size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: "0.1rem" }} />
            <div style={{ fontSize: "0.82rem", lineHeight: 1.45, color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--text-primary)" }}>Why bank statements lie:</strong> When you pay €100 for a shared group meal with 4 roommates, banking apps mark €100 as your spending. Here, your actual spending is recorded as exactly <strong>€25</strong>, while the remaining <strong>€75</strong> is tracked as money lent.
            </div>
          </div>

          {/* Top Category Spending Bars */}
          <div className="glass-card" style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>
                <PieChart size={16} color="var(--primary)" />
                Actual Consumption by Category
              </h2>
            </div>

            {categories.length === 0 ? (
              <div style={styles.emptyState}>No spending recorded yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {categories.slice(0, 5).map((cat) => (
                  <div key={cat.category} style={styles.catItem}>
                    <div style={styles.catTopRow}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                        <span>{cat.emoji}</span>
                        <span style={styles.catName}>{cat.category}</span>
                      </div>
                      <div style={styles.catAmountWrap}>
                        <span style={styles.catAmount}>{formatCurrency(cat.actualAmount)}</span>
                        <span style={styles.catPercent}>{cat.percentage}%</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={styles.progressBarBg}>
                      <div
                        style={{
                          ...styles.progressBarFill,
                          width: `${Math.max(4, cat.percentage)}%`,
                          background: cat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Categories Detailed */}
      {activeTab === "categories" && (
        <div className="glass-card" style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>All Spending Categories</h2>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Total: {formatCurrency(actualExpenditure)}
            </span>
          </div>

          {categories.length === 0 ? (
            <div style={styles.emptyState}>No expenses recorded yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {categories.map((cat) => (
                <div key={cat.category} style={styles.catItem}>
                  <div style={styles.catTopRow}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>{cat.emoji}</span>
                      <span style={styles.catName}>{cat.category}</span>
                    </div>
                    <div style={styles.catAmountWrap}>
                      <span style={styles.catAmount}>{formatCurrency(cat.actualAmount)}</span>
                      <span style={styles.catPercent}>{cat.percentage}% of total</span>
                    </div>
                  </div>
                  <div style={styles.progressBarBg}>
                    <div
                      style={{
                        ...styles.progressBarFill,
                        width: `${Math.max(4, cat.percentage)}%`,
                        background: cat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Transactions */}
      {activeTab === "transactions" && (
        <div className="glass-card" style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Recent True Consumption Log</h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Sorted by latest
            </span>
          </div>

          {recentTransactions.length === 0 ? (
            <div style={styles.emptyState}>No transactions recorded.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {recentTransactions.map((tx) => (
                <div key={tx.id} style={styles.txRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.txDesc}>{tx.description}</div>
                    <div style={styles.txMeta}>
                      <span>{new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      {tx.groupName && <span>• {tx.groupName}</span>}
                      <span>• {tx.category}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={styles.txShareAmount}>
                      {formatCurrency(tx.userShare, tx.currency)}
                    </div>
                    <div style={styles.txSubtitle}>
                      {tx.isPayer ? (
                        <span style={{ color: "var(--owed)" }}>
                          You paid {formatCurrency(tx.totalExpenseAmount, tx.currency)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>
                          Your split share
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxWidth: "800px",
    margin: "0 auto",
    width: "100%",
    paddingBottom: "2rem",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  title: {
    fontSize: "1.45rem",
    fontWeight: 800,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    marginTop: "0.15rem",
  },

  /* Equation Card */
  equationCard: {
    padding: "1rem 1.25rem",
    borderRadius: "16px",
    background: "var(--surface)",
    border: "1px solid var(--border-light)",
  },
  equationHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.85rem",
    flexWrap: "wrap",
    gap: "0.4rem",
  },
  badgeEquation: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.25rem 0.65rem",
    borderRadius: "9999px",
    fontSize: "0.72rem",
    fontWeight: 700,
    background: "rgba(16, 185, 129, 0.12)",
    color: "var(--primary)",
  },
  equationVisual: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  equationItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
    flex: 1,
    minWidth: "120px",
  },
  equationLabel: {
    fontSize: "0.68rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--text-muted)",
  },
  equationValPrimary: {
    fontSize: "1.25rem",
    fontWeight: 800,
    color: "var(--primary)",
  },
  equationValLent: {
    fontSize: "1.25rem",
    fontWeight: 800,
    color: "#f59e0b",
  },
  equationValTotal: {
    fontSize: "1.25rem",
    fontWeight: 800,
    color: "var(--text-primary)",
  },
  equationSub: {
    fontSize: "0.68rem",
    color: "var(--text-muted)",
  },
  equationOperator: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    padding: "0 0.25rem",
  },

  /* Metrics Grid */
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "0.75rem",
  },
  metricCard: {
    padding: "0.85rem 1rem",
    borderRadius: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  metricTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricLabel: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  metricIconWrap: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  metricAmount: {
    fontSize: "1.2rem",
    fontWeight: 800,
    color: "var(--text-primary)",
    letterSpacing: "-0.01em",
  },
  metricFooter: {
    fontSize: "0.68rem",
    color: "var(--text-muted)",
    lineHeight: 1.25,
  },

  /* Tabs */
  tabsRow: {
    display: "flex",
    gap: "0.45rem",
    flexWrap: "wrap",
  },

  /* Section Card */
  sectionCard: {
    padding: "1rem 1.15rem",
    borderRadius: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
  },
  explainerCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.65rem",
    padding: "0.75rem 1rem",
    borderRadius: "12px",
    background: "rgba(16, 185, 129, 0.05)",
    border: "1px solid rgba(16, 185, 129, 0.18)",
  },

  /* Category Item */
  catItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  catTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  catName: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  catAmountWrap: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  catAmount: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  catPercent: {
    fontSize: "0.72rem",
    color: "var(--text-muted)",
  },
  progressBarBg: {
    height: "6px",
    borderRadius: "3px",
    background: "var(--surface-hover)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: "3px",
    transition: "width 0.3s ease",
  },

  /* Transactions */
  txRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.65rem 0",
    borderBottom: "1px solid var(--border-light)",
    gap: "0.75rem",
  },
  txDesc: {
    fontSize: "0.88rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    wordBreak: "break-word",
  },
  txMeta: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    display: "flex",
    gap: "0.35rem",
    marginTop: "0.1rem",
  },
  txShareAmount: {
    fontSize: "0.92rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  txSubtitle: {
    fontSize: "0.7rem",
    marginTop: "0.1rem",
  },
  emptyState: {
    padding: "1.5rem",
    textAlign: "center",
    color: "var(--text-muted)",
    fontSize: "0.82rem",
  },
};
