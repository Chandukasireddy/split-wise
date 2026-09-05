"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  Layers,
  ArrowUpRight,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { PersonalSpendingSummary, MonthSpend } from "@/app/actions/spendingActions";

interface Props {
  summary: PersonalSpendingSummary;
}

export default function SpendingClient({ summary }: Props) {
  const {
    currency,
    actualExpenditure: totalActual,
    bankOutflow: totalOutflow,
    paidForOthers: totalPaidOthers,
    netReceivables,
    monthlyTrends,
    recentTransactions,
  } = summary;

  // Selected month filter: "all" or specific month key like "2026-09"
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("all");

  // Helper currency formatter
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-EU", {
      style: "currency",
      currency: currency || "EUR",
    }).format(amount);
  }

  // Filter transactions based on selected month
  const filteredTransactions = useMemo(() => {
    if (selectedMonthKey === "all") return recentTransactions;
    return recentTransactions.filter((tx) => {
      const d = new Date(tx.date);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      return key === selectedMonthKey;
    });
  }, [recentTransactions, selectedMonthKey]);

  // Compute month-specific metrics dynamically
  const activeMetrics = useMemo(() => {
    if (selectedMonthKey === "all") {
      return {
        actualSpend: totalActual,
        bankOutflow: totalOutflow,
        paidForOthers: totalPaidOthers,
        label: "All Time",
      };
    }

    const monthData = monthlyTrends.find((m) => m.key === selectedMonthKey);
    if (monthData) {
      return {
        actualSpend: monthData.actualSpend,
        bankOutflow: monthData.bankOutflow,
        paidForOthers: monthData.paidForOthers,
        label: monthData.label,
      };
    }

    // Fallback computed from filtered transactions
    let actual = 0;
    let outflow = 0;
    let paidOthers = 0;
    filteredTransactions.forEach((tx) => {
      actual += tx.userShare;
      if (tx.isPayer) {
        outflow += tx.totalExpenseAmount;
        paidOthers += tx.lentAmount;
      }
    });

    return {
      actualSpend: actual,
      bankOutflow: outflow,
      paidForOthers: paidOthers,
      label: selectedMonthKey,
    };
  }, [selectedMonthKey, totalActual, totalOutflow, totalPaidOthers, monthlyTrends, filteredTransactions]);

  // Compute category breakdown for the selected period
  const activeCategories = useMemo(() => {
    const map: Record<string, number> = {};
    let total = 0;

    filteredTransactions.forEach((tx) => {
      const cat = tx.category || "General";
      map[cat] = (map[cat] || 0) + tx.userShare;
      total += tx.userShare;
    });

    const categoryEmojis: Record<string, string> = {
      Food: "🍔",
      "Food & Dining": "🍔",
      "Food & Drink": "🍔",
      Travel: "✈️",
      "Travel & Transport": "✈️",
      Transportation: "🚗",
      Utilities: "💡",
      "Utilities & Bills": "💡",
      Entertainment: "🎬",
      Housing: "🏠",
      General: "📦",
      Other: "🏷️",
    };

    const categoryColors: Record<string, string> = {
      Food: "#00d09c",
      "Food & Dining": "#00d09c",
      "Food & Drink": "#00d09c",
      Travel: "#387ed1",
      "Travel & Transport": "#387ed1",
      Transportation: "#387ed1",
      Utilities: "#06b6d4",
      "Utilities & Bills": "#06b6d4",
      Entertainment: "#ec4899",
      Housing: "#8b5cf6",
      General: "#f59e0b",
      Other: "#64748b",
    };

    return Object.entries(map)
      .map(([name, amount]) => ({
        name,
        amount: parseFloat(amount.toFixed(2)),
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
        emoji: categoryEmojis[name] || "🏷️",
        color: categoryColors[name] || "#00d09c",
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  const spendRatio = activeMetrics.bankOutflow > 0
    ? Math.min(100, Math.round((activeMetrics.actualSpend / activeMetrics.bankOutflow) * 100))
    : 100;

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Compact Top Header */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Spending & Outflow</h1>
          <p style={styles.subtitle}>True consumption vs gross bank outflow</p>
        </div>

        {netReceivables > 0 && (
          <div style={styles.receivableBadge} title="Total money currently owed to you across groups">
            <span style={styles.receivableDot} />
            <span>+{formatCurrency(netReceivables)} owed to you</span>
          </div>
        )}
      </div>

      {/* Month-wise Filter Bar (Groww / Broker style horizontal pills) */}
      <div style={styles.monthScrollWrap} className="tabs-scroll">
        <button
          type="button"
          onClick={() => setSelectedMonthKey("all")}
          style={{
            ...styles.monthPill,
            ...(selectedMonthKey === "all" ? styles.monthPillActive : {}),
          }}
        >
          All Time
        </button>

        {monthlyTrends.map((m: MonthSpend) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setSelectedMonthKey(m.key)}
            style={{
              ...styles.monthPill,
              ...(selectedMonthKey === m.key ? styles.monthPillActive : {}),
            }}
          >
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Unified Portfolio Summary Card (Single Source of Truth, No Repetition) */}
      <div className="glass-card" style={styles.heroCard}>
        <div style={styles.heroTopRow}>
          <div>
            <div style={styles.heroLabel}>
              {activeMetrics.label} Actual Spend
            </div>
            <div style={styles.heroAmount}>
              {formatCurrency(activeMetrics.actualSpend)}
            </div>
          </div>

          <div style={styles.ratioPill}>
            <span>{spendRatio}% of outflow</span>
          </div>
        </div>

        <div style={styles.heroDivider} />

        {/* 3-Column Reconciliation Metrics Strip */}
        <div style={styles.stripGrid}>
          <div style={styles.stripCol}>
            <span style={styles.stripLabel}>Gross Outflow</span>
            <span style={styles.stripValue}>
              {formatCurrency(activeMetrics.bankOutflow)}
            </span>
            <span style={styles.stripHint}>Left your accounts</span>
          </div>

          <div style={styles.stripDivider} />

          <div style={styles.stripCol}>
            <span style={styles.stripLabel}>Paid for Others</span>
            <span style={{ ...styles.stripValue, color: "#f59e0b" }}>
              {formatCurrency(activeMetrics.paidForOthers)}
            </span>
            <span style={styles.stripHint}>Fronted on bills</span>
          </div>

          <div style={styles.stripDivider} />

          <div style={styles.stripCol}>
            <span style={styles.stripLabel}>Lent Recovered</span>
            <span style={{ ...styles.stripValue, color: "var(--primary)" }}>
              {formatCurrency(Math.max(0, activeMetrics.bankOutflow - activeMetrics.actualSpend))}
            </span>
            <span style={styles.stripHint}>Shared portions</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown (Month-Specific) */}
      <div className="glass-card" style={styles.cardSection}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitle}>
            <Layers size={15} color="var(--primary)" />
            <span>Category Spending</span>
          </div>
          <span style={styles.countBadge}>
            {activeCategories.length} {activeCategories.length === 1 ? "category" : "categories"}
          </span>
        </div>

        {activeCategories.length === 0 ? (
          <div style={styles.emptyState}>No spending recorded for this period</div>
        ) : (
          <div style={styles.catList}>
            {activeCategories.map((cat) => (
              <div key={cat.name} style={styles.catItem}>
                <div style={styles.catRow}>
                  <div style={styles.catLeft}>
                    <span style={styles.catEmoji}>{cat.emoji}</span>
                    <span style={styles.catName}>{cat.name}</span>
                    <span style={styles.catPercentBadge}>{cat.percentage}%</span>
                  </div>
                  <span style={styles.catAmount}>{formatCurrency(cat.amount)}</span>
                </div>

                {/* Slim 4px progress bar */}
                <div style={styles.barBg}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reconciled Transaction Ledger (Month-Specific) */}
      <div className="glass-card" style={styles.cardSection}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitle}>
            <Calendar size={15} color="var(--primary)" />
            <span>Transactions ({filteredTransactions.length})</span>
          </div>
          <span style={styles.periodBadge}>{activeMetrics.label}</span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div style={styles.emptyState}>No transactions recorded for this period</div>
        ) : (
          <div style={styles.txList}>
            {filteredTransactions.map((tx) => {
              const d = new Date(tx.date);
              const dateStr = d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              });

              return (
                <div key={tx.id} style={styles.txItem}>
                  <div style={styles.txLeft}>
                    <div style={styles.txDate}>{dateStr}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={styles.txDesc}>{tx.description}</div>
                      <div style={styles.txMeta}>
                        {tx.groupName ? (
                          <span style={styles.groupBadge}>{tx.groupName}</span>
                        ) : (
                          <span style={styles.directBadge}>Direct</span>
                        )}
                        <span style={styles.payerHint}>
                          {tx.isPayer ? (
                            <span style={{ color: "var(--primary)" }}>
                              <CheckCircle2 size={11} style={{ display: "inline", marginRight: "3px" }} />
                              You paid {formatCurrency(tx.totalExpenseAmount)}
                            </span>
                          ) : (
                            <span>Paid by {tx.payerName}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Your True Share vs Gross */}
                  <div style={styles.txRight}>
                    <div style={styles.txShare}>
                      {formatCurrency(tx.userShare)}
                    </div>
                    {tx.isPayer && tx.lentAmount > 0 && (
                      <div style={styles.txLentHint}>
                        <ArrowUpRight size={11} />
                        <span>lent {formatCurrency(tx.lentAmount)}</span>
                      </div>
                    )}
                    {!tx.isPayer && (
                      <div style={styles.txShareLabel}>
                        <UserCheck size={11} />
                        <span>your share</span>
                      </div>
                    )}
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
    maxWidth: "680px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
    width: "100%",
  },
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  title: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginTop: "0.1rem",
  },
  receivableBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.3rem 0.65rem",
    borderRadius: "20px",
    background: "rgba(0, 208, 156, 0.12)",
    border: "1px solid rgba(0, 208, 156, 0.25)",
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "var(--primary)",
  },
  receivableDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "var(--primary)",
  },

  /* Month Pills (Broker App Style) */
  monthScrollWrap: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    paddingBottom: "0.2rem",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
  },
  monthPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.35rem 0.8rem",
    borderRadius: "20px",
    background: "var(--surface)",
    border: "1px solid var(--border-light)",
    color: "var(--text-secondary)",
    fontSize: "0.76rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.15s ease",
    flexShrink: 0,
  },
  monthPillActive: {
    background: "var(--primary)",
    borderColor: "var(--primary)",
    color: "#000000",
    fontWeight: 700,
  },

  /* Portfolio Hero Card */
  heroCard: {
    padding: "1.1rem 1.25rem",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  },
  heroTopRow: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  heroLabel: {
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  heroAmount: {
    fontSize: "1.65rem",
    fontWeight: 800,
    color: "var(--text-primary)",
    letterSpacing: "-0.03em",
    marginTop: "0.15rem",
    lineHeight: 1.1,
  },
  ratioPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.25rem 0.55rem",
    borderRadius: "12px",
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
    fontSize: "0.7rem",
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
  heroDivider: {
    height: "1px",
    background: "var(--border-light)",
    width: "100%",
  },
  stripGrid: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr auto 1fr",
    alignItems: "center",
    gap: "0.4rem",
  },
  stripCol: {
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
  },
  stripDivider: {
    width: "1px",
    height: "28px",
    background: "var(--border-light)",
  },
  stripLabel: {
    fontSize: "0.65rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  stripValue: {
    fontSize: "0.92rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.01em",
  },
  stripHint: {
    fontSize: "0.65rem",
    color: "var(--text-muted)",
  },

  /* Common Card Section */
  cardSection: {
    padding: "1rem 1.15rem",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.01em",
  },
  countBadge: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    fontWeight: 500,
  },
  periodBadge: {
    fontSize: "0.7rem",
    color: "var(--primary)",
    fontWeight: 600,
  },

  /* Categories */
  catList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.65rem",
  },
  catItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
  },
  catRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  catLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
  },
  catEmoji: {
    fontSize: "0.95rem",
    lineHeight: 1,
  },
  catName: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  catPercentBadge: {
    fontSize: "0.68rem",
    color: "var(--text-muted)",
    fontWeight: 500,
    padding: "0.1rem 0.35rem",
    background: "var(--surface-hover)",
    borderRadius: "6px",
  },
  catAmount: {
    fontSize: "0.84rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  barBg: {
    height: "4px",
    background: "var(--surface-hover)",
    borderRadius: "2px",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: "2px",
    transition: "width 0.3s ease",
  },

  /* Transactions */
  txList: {
    display: "flex",
    flexDirection: "column",
  },
  txItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.6rem 0",
    borderBottom: "1px solid var(--border-light)",
    gap: "0.75rem",
  },
  txLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    minWidth: 0,
    flex: 1,
  },
  txDate: {
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    width: "44px",
    flexShrink: 0,
  },
  txDesc: {
    fontSize: "0.84rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  txMeta: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    marginTop: "0.15rem",
    fontSize: "0.68rem",
  },
  groupBadge: {
    padding: "0.1rem 0.35rem",
    borderRadius: "4px",
    background: "var(--surface-hover)",
    color: "var(--text-secondary)",
    fontWeight: 600,
    fontSize: "0.65rem",
  },
  directBadge: {
    padding: "0.1rem 0.35rem",
    borderRadius: "4px",
    background: "var(--surface-hover)",
    color: "var(--text-muted)",
    fontSize: "0.65rem",
  },
  payerHint: {
    fontSize: "0.68rem",
    color: "var(--text-muted)",
  },
  txRight: {
    textAlign: "right",
    flexShrink: 0,
  },
  txShare: {
    fontSize: "0.88rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.01em",
  },
  txLentHint: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.15rem",
    fontSize: "0.66rem",
    color: "#f59e0b",
    fontWeight: 500,
    marginTop: "0.1rem",
  },
  txShareLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.15rem",
    fontSize: "0.66rem",
    color: "var(--text-muted)",
    marginTop: "0.1rem",
  },
  emptyState: {
    padding: "1.5rem",
    textAlign: "center",
    fontSize: "0.78rem",
    color: "var(--text-muted)",
  },
};
