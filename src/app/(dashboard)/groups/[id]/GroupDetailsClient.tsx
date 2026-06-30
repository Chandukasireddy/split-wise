"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { addExpense, deleteExpense } from "@/app/actions/expenseActions";
import { settleUp } from "@/app/actions/settleActions";
import { GroupCalculatedBalances } from "@/lib/balances";
import { 
  Users, 
  Plus, 
  ArrowLeft, 
  DollarSign, 
  Trash2, 
  PieChart as ChartIcon, 
  FileDown, 
  Calendar,
  Layers,
  ArrowRight,
  X,
  PlusCircle,
  HelpCircle,
  PiggyBank
} from "lucide-react";
import Link from "next/link";

interface Member {
  id: string;
  name: string;
  username: string;
}

interface Split {
  id: string;
  userId: string;
  amount: number;
  percentage: number | null;
  shares: number | null;
  user: { name: string };
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  currency: string;
  date: Date;
  payerId: string;
  splitType: string;
  splits: Split[];
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  date: Date;
  payer: { id: string; name: string };
  payee: { id: string; name: string };
}

interface GroupDetailsClientProps {
  currentUser: { userId: string; username: string };
  group: {
    id: string;
    name: string;
    description: string | null;
    members: { user: Member }[];
    expenses: Expense[];
    payments: Payment[];
  };
  balances: GroupCalculatedBalances;
}

const CATEGORIES = ["Food", "Travel", "Utilities", "Entertainment", "General"];
const CURRENCIES = ["USD", "EUR", "GBP", "INR"];
const CATEGORY_COLORS: Record<string, string> = {
  Food: "#10b981",          // Emerald
  Travel: "#6366f1",        // Indigo
  Utilities: "#06b6d4",     // Cyan
  Entertainment: "#f43f5e",  // Rose
  General: "#f59e0b",       // Amber
};

export default function GroupDetailsClient({
  currentUser,
  group,
  balances,
}: GroupDetailsClientProps) {
  const router = useRouter();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"expenses" | "debts" | "analytics">("expenses");
  
  // Modals state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add Expense Form state
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmt, setExpenseAmt] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("General");
  const [expenseCurrency, setExpenseCurrency] = useState("USD");
  const [expensePayer, setExpensePayer] = useState(currentUser.userId);
  const [expenseSplitType, setExpenseSplitType] = useState<"EQUAL" | "UNEQUAL" | "PERCENTAGE" | "SHARES">("EQUAL");
  
  // Custom split values: mapped by userId -> value (can be amount, percent, or shares)
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  
  // Settle Up Form state
  const [settlePayer, setSettlePayer] = useState("");
  const [settlePayee, setSettlePayee] = useState("");
  const [settleAmt, setSettleAmt] = useState("");
  const [settleCurrency, setSettleCurrency] = useState("USD");

  const members = group.members.map((m) => m.user);

  // Pre-fill helper when split type changes
  React.useEffect(() => {
    const initial: Record<string, string> = {};
    members.forEach((m) => {
      if (expenseSplitType === "PERCENTAGE") {
        initial[m.id] = (100 / members.length).toFixed(1);
      } else if (expenseSplitType === "SHARES") {
        initial[m.id] = "1";
      } else if (expenseSplitType === "UNEQUAL") {
        initial[m.id] = "";
      } else {
        initial[m.id] = "true"; // checklist representation
      }
    });
    setCustomSplits(initial);
  }, [expenseSplitType]);

  // Handle opening settle up modal from simplified debts list
  const handleSettleUpDirect = (fromId: string, toId: string, amt: number, curr: string) => {
    setSettlePayer(fromId);
    setSettlePayee(toId);
    setSettleAmt(amt.toString());
    setSettleCurrency(curr);
    setShowSettleModal(true);
  };

  // Form submission for adding expense
  async function handleAddExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const amount = parseFloat(expenseAmt);

    if (isNaN(amount) || amount <= 0) {
      setFormError("Please enter a valid amount.");
      return;
    }

    setLoading(true);

    // Prepare splits inputs
    const splitsPayload = members
      .filter((m) => {
        if (expenseSplitType === "EQUAL") {
          return customSplits[m.id] === "true";
        }
        return true; // Send all for other split types
      })
      .map((m) => {
        const val = parseFloat(customSplits[m.id]) || 0;
        return {
          userId: m.id,
          amount: expenseSplitType === "UNEQUAL" ? val : undefined,
          percentage: expenseSplitType === "PERCENTAGE" ? val : undefined,
          shares: expenseSplitType === "SHARES" ? val : undefined,
        };
      });

    const res = await addExpense(
      expenseDesc,
      amount,
      expenseCategory,
      expenseCurrency,
      group.id,
      expensePayer,
      expenseSplitType,
      splitsPayload
    );

    if (res.success) {
      setShowExpenseModal(false);
      setExpenseDesc("");
      setExpenseAmt("");
      setExpenseCategory("General");
      router.refresh();
    } else {
      setFormError(res.error || "Failed to add expense.");
    }
    setLoading(false);
  }

  // Form submission for Settle Up
  async function handleSettleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const amount = parseFloat(settleAmt);

    if (isNaN(amount) || amount <= 0) {
      setFormError("Please enter a valid amount.");
      return;
    }

    if (settlePayer === settlePayee) {
      setFormError("A member cannot settle with themselves.");
      return;
    }

    setLoading(true);

    const res = await settleUp(amount, settleCurrency, group.id, settlePayer, settlePayee);

    if (res.success) {
      setShowSettleModal(false);
      setSettleAmt("");
      router.refresh();
    } else {
      setFormError(res.error || "Failed to record settlement.");
    }
    setLoading(false);
  }

  // Handle deletion of an expense
  async function handleDeleteExpense(id: string) {
    if (confirm("Are you sure you want to delete this expense?")) {
      const res = await deleteExpense(id);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Failed to delete expense");
      }
    }
  }

  // CSV Export utility
  function handleCSVExport() {
    const headers = ["Date", "Description", "Category", "Paid By", "Total Amount", "Currency"];
    const rows = group.expenses.map((e) => {
      const payerName = members.find((m) => m.id === e.payerId)?.name || "Unknown";
      return [
        `"${new Date(e.date).toLocaleDateString()}"`,
        `"${e.description.replace(/"/g, '""')}"`,
        `"${e.category}"`,
        `"${payerName}"`,
        e.amount,
        `"${e.currency}"`,
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${group.name.toLowerCase().replace(/\s+/g, "_")}_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Currency formatting helper
  function formatCurrency(amount: number, currency: string = "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  // Calculate Category-wise breakdown for active currency in tabs (defaults to USD or first available)
  const activeCurrency = balances.currencies[0] || "USD";
  const categoryTotals: Record<string, number> = {};
  CATEGORIES.forEach((cat) => { categoryTotals[cat] = 0; });
  let totalSpentInCurrency = 0;

  group.expenses
    .filter((e) => e.currency === activeCurrency)
    .forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
      totalSpentInCurrency += e.amount;
    });

  // SVG Donut Chart sectors calculation
  let cumulativePercent = 0;
  const chartSegments = CATEGORIES.map((cat) => {
    const amount = categoryTotals[cat];
    const percentage = totalSpentInCurrency > 0 ? (amount / totalSpentInCurrency) * 100 : 0;
    const startPercent = cumulativePercent;
    cumulativePercent += percentage;
    return {
      category: cat,
      amount,
      percentage,
      startPercent,
      color: CATEGORY_COLORS[cat],
    };
  }).filter((seg) => seg.percentage > 0);

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header Back & Info */}
      <div style={styles.navHeader}>
        <Link href="/dashboard" style={styles.backLink}>
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        <button onClick={handleCSVExport} className="btn btn-secondary" style={styles.exportBtn}>
          <FileDown size={16} />
          Export Ledger
        </button>
      </div>

      <div style={styles.groupHero} className="glass-card">
        <div>
          <h1 style={styles.groupHeroName}>{group.name}</h1>
          <p style={styles.groupHeroDesc}>{group.description || "No description provided."}</p>
        </div>

        <div style={styles.actionRow}>
          <button 
            onClick={() => {
              setExpensePayer(currentUser.userId);
              setShowExpenseModal(true);
            }} 
            className="btn btn-primary"
          >
            <Plus size={18} />
            Add Expense
          </button>
          <button 
            onClick={() => {
              setSettlePayer(members[0]?.id || "");
              setSettlePayee(members[1]?.id || "");
              setShowSettleModal(true);
            }} 
            className="btn btn-secondary"
          >
            <PiggyBank size={18} />
            Settle Up
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={styles.tabsMenu}>
        <button
          onClick={() => setActiveTab("expenses")}
          style={{
            ...styles.tabBtn,
            color: activeTab === "expenses" ? "#fff" : "var(--text-secondary)",
            borderBottom: activeTab === "expenses" ? "2px solid var(--primary)" : "2px solid transparent",
          }}
        >
          Expenses Ledger ({group.expenses.length})
        </button>
        <button
          onClick={() => setActiveTab("debts")}
          style={{
            ...styles.tabBtn,
            color: activeTab === "debts" ? "#fff" : "var(--text-secondary)",
            borderBottom: activeTab === "debts" ? "2px solid var(--primary)" : "2px solid transparent",
          }}
        >
          Balances & Settlements
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          style={{
            ...styles.tabBtn,
            color: activeTab === "analytics" ? "#fff" : "var(--text-secondary)",
            borderBottom: activeTab === "analytics" ? "2px solid var(--primary)" : "2px solid transparent",
          }}
        >
          Spending Analytics
        </button>
      </div>

      {/* Dynamic Tab Contents */}
      <div style={{ minHeight: "400px" }}>
        {/* Expenses Tab */}
        {activeTab === "expenses" && (
          <div style={styles.tabContentGrid} className="responsive-grid-2-1">
            <div style={styles.ledgerColumn}>
              {group.expenses.length === 0 ? (
                <div className="glass-card" style={styles.emptyStateCard}>
                  <DollarSign size={40} color="var(--text-muted)" style={{ marginBottom: "1rem" }} />
                  <h3>No expenses yet</h3>
                  <p>Click "Add Expense" to register the first shared bill.</p>
                </div>
              ) : (
                <div style={styles.expenseList}>
                  {group.expenses.map((expense) => {
                    const payerName = members.find((m) => m.id === expense.payerId)?.name || "Group member";
                    const isCurrentUserPayer = expense.payerId === currentUser.userId;
                    
                    // Find current user's split share
                    const mySplit = expense.splits.find((s) => s.userId === currentUser.userId);
                    
                    return (
                      <div key={expense.id} className="glass-card" style={styles.expenseItem}>
                        <div style={styles.expenseDateBadge}>
                          <span style={styles.dateMonth}>
                            {new Date(expense.date).toLocaleDateString(undefined, { month: "short" })}
                          </span>
                          <span style={styles.dateDay}>
                            {new Date(expense.date).toLocaleDateString(undefined, { day: "numeric" })}
                          </span>
                        </div>

                        <div style={styles.expenseDetails}>
                          <h3 style={styles.expenseDesc}>{expense.description}</h3>
                          <div style={styles.expenseMeta}>
                            <span className="badge" style={{ 
                              backgroundColor: `${CATEGORY_COLORS[expense.category]}15`, 
                              color: CATEGORY_COLORS[expense.category], 
                              borderColor: `${CATEGORY_COLORS[expense.category]}40`,
                              borderWidth: "1px",
                              borderStyle: "solid",
                              padding: "0.1rem 0.5rem"
                            }}>
                              {expense.category}
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                              paid by <strong>{payerName}</strong>
                            </span>
                          </div>
                        </div>

                        <div style={styles.expenseAmountCol}>
                          <span style={styles.expenseTotalLabel}>Amount</span>
                          <span style={styles.expenseTotalValue}>
                            {formatCurrency(expense.amount, expense.currency)}
                          </span>
                        </div>

                        <div style={styles.expenseShareCol}>
                          {mySplit ? (
                            isCurrentUserPayer ? (
                              <>
                                <span style={{ ...styles.expenseTotalLabel, color: "var(--owed)" }}>you lent</span>
                                <span style={{ ...styles.expenseTotalValue, color: "var(--owed)" }}>
                                  {formatCurrency(expense.amount - mySplit.amount, expense.currency)}
                                </span>
                              </>
                            ) : (
                              <>
                                <span style={{ ...styles.expenseTotalLabel, color: "var(--owes)" }}>you owe</span>
                                <span style={{ ...styles.expenseTotalValue, color: "var(--owes)" }}>
                                  {formatCurrency(mySplit.amount, expense.currency)}
                                </span>
                              </>
                            )
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>not involved</span>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          style={styles.deleteBtn}
                          title="Delete expense"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar with Quick balance breakdown */}
            <div style={styles.sidebarColumn}>
              <div className="glass-card" style={styles.sidebarCard}>
                <h3 style={styles.sidebarTitle}>
                  <Users size={16} color="var(--primary)" />
                  Group Members
                </h3>
                <div style={styles.memberBalancesList}>
                  {members.map((member) => {
                    return (
                      <div key={member.id} style={styles.sidebarMemberItem}>
                        <div style={styles.sidebarMemberLeft}>
                          <div style={styles.sidebarAvatar}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={styles.sidebarMemberName}>{member.name}</div>
                            <div style={styles.sidebarMemberUsername}>@{member.username}</div>
                          </div>
                        </div>
                        
                        <div style={styles.sidebarMemberRight}>
                          {balances.currencies.map((curr) => {
                            const bal = balances.balancesByCurrency[curr]?.[member.id]?.netBalance || 0;
                            if (bal === 0) return null;
                            const isOwed = bal > 0;
                            return (
                              <div key={curr} style={{ 
                                color: isOwed ? "var(--owed)" : "var(--owes)", 
                                fontWeight: 600, 
                                fontSize: "0.85rem",
                                textAlign: "right"
                              }}>
                                {isOwed ? "+" : ""}{formatCurrency(bal, curr)}
                              </div>
                            );
                          })}
                          {balances.currencies.every((curr) => (balances.balancesByCurrency[curr]?.[member.id]?.netBalance || 0) === 0) && (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>settled up</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debts Tab */}
        {activeTab === "debts" && (
          <div style={styles.tabContentGrid} className="responsive-grid-2-1">
            {/* Simplified Debts ledger */}
            <div style={styles.ledgerColumn}>
              <h2 style={styles.sectionHeaderTitle}>Simplified Debts</h2>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                These are the minimized transactions computed to balance all logs.
              </p>

              <div style={styles.debtList}>
                {balances.currencies.map((curr) => {
                  const debts = balances.debtsByCurrency[curr] || [];
                  if (debts.length === 0) {
                    return (
                      <div key={curr} className="glass-card" style={{ padding: "1.5rem", marginBottom: "1rem", textAlign: "center" }}>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                          Everyone is completely settled in {curr}!
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={curr} style={{ marginBottom: "1.5rem" }}>
                      <h3 style={styles.currencyHeader}>{curr} Balances</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {debts.map((debt, idx) => {
                          const involvesUser = debt.fromUserId === currentUser.userId || debt.toUserId === currentUser.userId;
                          
                          return (
                            <div 
                              key={idx} 
                              className="glass-card" 
                              style={{ 
                                ...styles.debtItem, 
                                borderLeft: involvesUser ? "3px solid var(--primary)" : "1px solid var(--glass-border)"
                              }}
                            >
                              <div style={styles.debtMain}>
                                <span style={styles.debtUser}>{debt.fromName}</span>
                                <span style={styles.debtArrow}>
                                  owes <ArrowRight size={14} style={{ margin: "0 0.25rem" }} />
                                </span>
                                <span style={styles.debtUser}>{debt.toName}</span>
                                <span style={styles.debtValue}>
                                  {formatCurrency(debt.amount, debt.currency)}
                                </span>
                              </div>

                              <button
                                onClick={() => handleSettleUpDirect(debt.fromUserId, debt.toUserId, debt.amount, debt.currency)}
                                className="btn btn-secondary"
                                style={styles.debtSettleBtn}
                              >
                                Settle Up
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Settlements Log */}
            <div style={styles.sidebarColumn}>
              <div className="glass-card" style={styles.sidebarCard}>
                <h3 style={styles.sidebarTitle}>
                  <Calendar size={16} color="var(--secondary)" />
                  Past Settlements
                </h3>

                {group.payments.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1rem 0", textAlign: "center" }}>
                    No payments recorded yet.
                  </p>
                ) : (
                  <div style={styles.paymentsHistoryList}>
                    {group.payments.map((payment) => (
                      <div key={payment.id} style={styles.paymentLogItem}>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          <strong>{payment.payer.name}</strong> paid <strong>{payment.payee.name}</strong>
                          <div style={{ color: "var(--owed)", fontWeight: 600, fontSize: "0.9rem", marginTop: "0.1rem" }}>
                            {formatCurrency(payment.amount, payment.currency)}
                          </div>
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {new Date(payment.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="glass-card animate-fade-in" style={styles.analyticsCard}>
            <div style={styles.analyticsHeader}>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Group Spend Analytics</h2>
                <p style={{ fontSize: "0.9rem" }}>Breakdown of expenses by categories in {activeCurrency}.</p>
              </div>
            </div>

            {totalSpentInCurrency === 0 ? (
              <div style={styles.emptyAnalytics}>
                <ChartIcon size={48} color="var(--text-muted)" style={{ marginBottom: "1rem" }} />
                <h3>No transaction history</h3>
                <p>Register expenses in {activeCurrency} to see spend diagrams.</p>
              </div>
            ) : (
              <div style={styles.analyticsLayout}>
                {/* SVG Donut Chart */}
                <div style={styles.chartContainer}>
                  <svg width="220" height="220" viewBox="0 0 220 220" style={styles.donutSvg}>
                    {/* Background Circle */}
                    <circle
                      cx="110"
                      cy="110"
                      r="70"
                      fill="transparent"
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeWidth="24"
                    />
                    
                    {/* Render slices */}
                    {chartSegments.map((seg, i) => {
                      const radius = 70;
                      const circumference = 2 * Math.PI * radius; // 439.82
                      const strokeDash = (seg.percentage / 100) * circumference;
                      const strokeOffset = circumference - (seg.startPercent / 100) * circumference;
                      
                      return (
                        <circle
                          key={i}
                          cx="110"
                          cy="110"
                          r={radius}
                          fill="transparent"
                          stroke={seg.color}
                          strokeWidth="24"
                          strokeDasharray={`${strokeDash} ${circumference}`}
                          strokeDashoffset={strokeOffset}
                          transform="rotate(-90 110 110)"
                          style={{
                            transition: "stroke-width 0.2s",
                            cursor: "pointer"
                          }}
                        />
                      );
                    })}
                  </svg>
                  
                  <div style={styles.chartInnerLabel}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Total spent</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>
                      {formatCurrency(totalSpentInCurrency, activeCurrency)}
                    </span>
                  </div>
                </div>

                {/* Legends and Category Details */}
                <div style={styles.legendsList}>
                  {CATEGORIES.map((cat) => {
                    const amount = categoryTotals[cat] || 0;
                    const percent = totalSpentInCurrency > 0 ? (amount / totalSpentInCurrency) * 100 : 0;
                    const color = CATEGORY_COLORS[cat];
                    
                    return (
                      <div key={cat} style={styles.legendItem}>
                        <div style={styles.legendLeft}>
                          <div style={{ ...styles.legendColor, backgroundColor: color }} />
                          <span style={styles.legendCategoryName}>{cat}</span>
                        </div>
                        <div style={styles.legendRight}>
                          <span style={styles.legendAmount}>{formatCurrency(amount, activeCurrency)}</span>
                          <span style={styles.legendPercent}>{percent.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ----------------- MODALS ----------------- */}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add an Expense</h2>
              <button onClick={() => { setShowExpenseModal(false); setFormError(null); }} style={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>

            {formError && <div style={styles.modalErrorBox}>{formError}</div>}

            <form onSubmit={handleAddExpenseSubmit} style={styles.modalForm}>
              <div style={styles.modalFormRow}>
                <div style={{ flex: 2 }}>
                  <label htmlFor="expDesc" className="form-label">Description *</label>
                  <input
                    id="expDesc"
                    type="text"
                    required
                    placeholder="e.g. Dinner buffet"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="expAmt" className="form-label">Amount *</label>
                  <input
                    id="expAmt"
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={expenseAmt}
                    onChange={(e) => setExpenseAmt(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={styles.modalFormRow}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="expCurr" className="form-label">Currency</label>
                  <select
                    id="expCurr"
                    value={expenseCurrency}
                    onChange={(e) => setExpenseCurrency(e.target.value)}
                    className="form-input"
                    style={{ background: "#0f172a" }}
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="expCat" className="form-label">Category</label>
                  <select
                    id="expCat"
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="form-input"
                    style={{ background: "#0f172a" }}
                  >
                    {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.modalFormRow}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="expPayer" className="form-label">Paid By</label>
                  <select
                    id="expPayer"
                    value={expensePayer}
                    onChange={(e) => setExpensePayer(e.target.value)}
                    className="form-input"
                    style={{ background: "#0f172a" }}
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name === currentUser.username ? "You" : m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="expSplit" className="form-label">Split Type</label>
                  <select
                    id="expSplit"
                    value={expenseSplitType}
                    onChange={(e) => setExpenseSplitType(e.target.value as any)}
                    className="form-input"
                    style={{ background: "#0f172a" }}
                  >
                    <option value="EQUAL">Equally</option>
                    <option value="UNEQUAL">Unequally (Exact amounts)</option>
                    <option value="PERCENTAGE">Percentages (%)</option>
                    <option value="SHARES">Shares</option>
                  </select>
                </div>
              </div>

              {/* Dynamic split input fields */}
              <div style={styles.splitBox}>
                <span style={styles.splitBoxTitle}>Split details</span>
                
                <div style={styles.splitGrid}>
                  {members.map((m) => {
                    const value = customSplits[m.id] || "";
                    
                    return (
                      <div key={m.id} style={styles.splitInputRow}>
                        <span style={styles.splitMemberName}>{m.name}</span>
                        
                        {expenseSplitType === "EQUAL" && (
                          <input
                            type="checkbox"
                            checked={value === "true"}
                            onChange={(e) => setCustomSplits({
                              ...customSplits,
                              [m.id]: e.target.checked ? "true" : "false"
                            })}
                            style={styles.splitCheckbox}
                          />
                        )}

                        {expenseSplitType === "UNEQUAL" && (
                          <div style={styles.inputPrefixWrapper}>
                            <span style={styles.inputPrefix}>{expenseCurrency}</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={value}
                              onChange={(e) => setCustomSplits({
                                ...customSplits,
                                [m.id]: e.target.value
                              })}
                              className="form-input"
                              style={{ paddingLeft: "1.75rem", fontSize: "0.85rem" }}
                            />
                          </div>
                        )}

                        {expenseSplitType === "PERCENTAGE" && (
                          <div style={styles.inputPrefixWrapper}>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0"
                              value={value}
                              onChange={(e) => setCustomSplits({
                                ...customSplits,
                                [m.id]: e.target.value
                              })}
                              className="form-input"
                              style={{ paddingRight: "1.75rem", fontSize: "0.85rem", textAlign: "right" }}
                            />
                            <span style={styles.inputSuffix}>%</span>
                          </div>
                        )}

                        {expenseSplitType === "SHARES" && (
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={value}
                            onChange={(e) => setCustomSplits({
                              ...customSplits,
                              [m.id]: e.target.value
                            })}
                            className="form-input"
                            style={{ width: "80px", fontSize: "0.85rem", textAlign: "center" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => { setShowExpenseModal(false); setFormError(null); }} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? "Saving..." : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Up Modal */}
      {showSettleModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Record a Settlement</h2>
              <button onClick={() => { setShowSettleModal(false); setFormError(null); }} style={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>

            {formError && <div style={styles.modalErrorBox}>{formError}</div>}

            <form onSubmit={handleSettleSubmit} style={styles.modalForm}>
              <div style={styles.modalFormRow}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="settlePayer" className="form-label">Who Paid</label>
                  <select
                    id="settlePayer"
                    value={settlePayer}
                    onChange={(e) => setSettlePayer(e.target.value)}
                    className="form-input"
                    style={{ background: "#0f172a" }}
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id === currentUser.userId ? "You" : m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="settlePayee" className="form-label">Who Received</label>
                  <select
                    id="settlePayee"
                    value={settlePayee}
                    onChange={(e) => setSettlePayee(e.target.value)}
                    className="form-input"
                    style={{ background: "#0f172a" }}
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id === currentUser.userId ? "You" : m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.modalFormRow}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="settleAmt" className="form-label">Amount Paid</label>
                  <input
                    id="settleAmt"
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={settleAmt}
                    onChange={(e) => setSettleAmt(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="settleCurr" className="form-label">Currency</label>
                  <select
                    id="settleCurr"
                    value={settleCurrency}
                    onChange={(e) => setSettleCurrency(e.target.value)}
                    className="form-input"
                    style={{ background: "#0f172a" }}
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => { setShowSettleModal(false); setFormError(null); }} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? "Recording..." : "Record Settlement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    width: "100%",
  },
  navHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
  },
  exportBtn: {
    padding: "0.5rem 1rem",
    fontSize: "0.85rem",
  },
  groupHero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1.5rem",
    padding: "2rem",
  },
  groupHeroName: {
    fontSize: "2.25rem",
    fontWeight: 800,
    background: "linear-gradient(to right, #ffffff, #cbd5e1)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  groupHeroDesc: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    marginTop: "0.25rem",
  },
  actionRow: {
    display: "flex",
    gap: "1rem",
  },
  tabsMenu: {
    display: "flex",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    gap: "2rem",
  },
  tabBtn: {
    background: "transparent",
    border: "none",
    padding: "0.75rem 0.5rem",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  tabContentGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "2rem",
  },
  ledgerColumn: {
    display: "flex",
    flexDirection: "column",
  },
  sidebarColumn: {
    display: "flex",
    flexDirection: "column",
  },
  emptyStateCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem 2rem",
    textAlign: "center",
    color: "var(--text-secondary)",
  },
  expenseList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  },
  expenseItem: {
    display: "flex",
    alignItems: "center",
    padding: "1rem",
    gap: "1rem",
    transition: "transform 0.2s, border-color 0.2s",
  },
  expenseDateBadge: {
    width: "48px",
    height: "48px",
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dateMonth: {
    fontSize: "0.65rem",
    textTransform: "uppercase",
    fontWeight: 700,
    color: "var(--text-muted)",
  },
  dateDay: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#fff",
    lineHeight: 1,
  },
  expenseDetails: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  expenseDesc: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#fff",
  },
  expenseMeta: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  expenseAmountCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    width: "100px",
  },
  expenseShareCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    width: "120px",
    paddingRight: "0.5rem",
  },
  expenseTotalLabel: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
  },
  expenseTotalValue: {
    fontSize: "0.95rem",
    fontWeight: 600,
  },
  deleteBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "0.5rem",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.2s, background-color 0.2s",
  },
  sidebarCard: {
    padding: "1.5rem",
  },
  sidebarTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "0.75rem",
    marginBottom: "1rem",
  },
  memberBalancesList: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  sidebarMemberItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sidebarMemberLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  sidebarAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
  },
  sidebarMemberName: {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#fff",
  },
  sidebarMemberUsername: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
  },
  sidebarMemberRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  sectionHeaderTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    marginBottom: "0.25rem",
  },
  debtList: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  currencyHeader: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: "0.5rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  debtItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.25rem",
  },
  debtMain: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.35rem",
    fontSize: "0.95rem",
  },
  debtUser: {
    fontWeight: 600,
    color: "#fff",
  },
  debtArrow: {
    color: "var(--text-muted)",
    display: "inline-flex",
    alignItems: "center",
  },
  debtValue: {
    color: "var(--owed)",
    fontWeight: 700,
    marginLeft: "0.5rem",
  },
  debtSettleBtn: {
    padding: "0.35rem 0.75rem",
    fontSize: "0.8rem",
  },
  paymentsHistoryList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  paymentLogItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.6rem 0",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  },
  analyticsCard: {
    padding: "2rem",
  },
  analyticsHeader: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "1rem",
    marginBottom: "2rem",
  },
  emptyAnalytics: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem 2rem",
    textAlign: "center",
  },
  analyticsLayout: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    flexWrap: "wrap",
    gap: "3rem",
  },
  chartContainer: {
    position: "relative",
    width: "220px",
    height: "220px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  donutSvg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  chartInnerLabel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  legendsList: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: "260px",
  },
  legendItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem 0.75rem",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.03)",
  },
  legendLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  legendColor: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
  },
  legendCategoryName: {
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "#fff",
  },
  legendRight: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.5rem",
  },
  legendAmount: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#fff",
  },
  legendPercent: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },

  /* Modals Styles */
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(3, 7, 18, 0.8)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modalCard: {
    width: "100%",
    maxWidth: "520px",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
  },
  modalCloseBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
  },
  modalErrorBox: {
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    border: "1px solid rgba(244, 63, 94, 0.2)",
    color: "#f43f5e",
    padding: "0.75rem 1rem",
    borderRadius: "10px",
    fontSize: "0.875rem",
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  modalFormRow: {
    display: "flex",
    gap: "1rem",
  },
  splitBox: {
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "12px",
    padding: "1rem",
  },
  splitBoxTitle: {
    fontSize: "0.8rem",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    fontWeight: 600,
    display: "block",
    marginBottom: "0.75rem",
    letterSpacing: "0.05em",
  },
  splitGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    maxHeight: "180px",
    overflowY: "auto",
  },
  splitInputRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
  },
  splitMemberName: {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#fff",
  },
  splitCheckbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    accentColor: "var(--primary)",
  },
  inputPrefixWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "120px",
  },
  inputPrefix: {
    position: "absolute",
    left: "0.75rem",
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  inputSuffix: {
    position: "absolute",
    right: "0.75rem",
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "1rem",
    marginTop: "0.5rem",
  },
};
