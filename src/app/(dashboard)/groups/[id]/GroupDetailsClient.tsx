"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { addExpense, updateExpense, deleteExpense } from "@/app/actions/expenseActions";
import { settleUp } from "@/app/actions/settleActions";
import { searchUsers, addMembersToGroup, deleteGroup, updateGroupSettings } from "@/app/actions/groupActions";
import { GroupCalculatedBalances } from "@/lib/balances";
import {
  Users,
  Plus,
  ArrowLeft,
  DollarSign,
  Trash2,
  Pencil,
  Settings,
  PieChart as ChartIcon,
  FileDown,
  Calendar,
  ArrowRight,
  X,
  PlusCircle,
  PiggyBank,
  Share2
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
  conversionRate: number;
  convertedAmount: number;
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
    defaultCurrency: string;
    members: { user: Member }[];
    expenses: Expense[];
    payments: Payment[];
  };
  balances: GroupCalculatedBalances;
}

const CATEGORIES = ["Food", "Travel", "Utilities", "Entertainment", "General"];
const CURRENCIES = [
  "EUR", "USD", "GBP", "INR", "PLN", "JPY", "CAD", "AUD", "CHF", "CNY",
  "SEK", "NOK", "DKK", "BRL", "MXN", "SGD", "HKD", "KRW", "TRY", "ZAR",
  "AED", "THB", "MYR", "IDR", "PHP", "CZK", "HUF", "RON", "BGN", "HRK",
  "NZD", "PKR", "BDT", "VND", "EGP", "UAH", "NGN", "KES", "GHS", "ILS",
];
const CATEGORY_COLORS: Record<string, string> = {
  Food: "#10b981",          // Emerald
  Travel: "#10b981",        // Indigo
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
  const [expenseCurrency, setExpenseCurrency] = useState(group.defaultCurrency);
  const [expensePayer, setExpensePayer] = useState(currentUser.userId);
  const [expenseSplitType, setExpenseSplitType] = useState<"EQUAL" | "UNEQUAL" | "PERCENTAGE" | "SHARES">("EQUAL");
  const [expenseConversionRate, setExpenseConversionRate] = useState("1.0");
  
  // Custom split values: mapped by userId -> value (can be amount, percent, or shares)
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  
  // Settle Up Form state
  const [settlePayer, setSettlePayer] = useState("");
  const [settlePayee, setSettlePayee] = useState("");
  const [settleAmt, setSettleAmt] = useState("");
  const [settleCurrency, setSettleCurrency] = useState(group.defaultCurrency);
  
  // Edit Expense state
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Delete Group state
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [deleteGroupLoading, setDeleteGroupLoading] = useState(false);

  // Group Settings state
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [settingsName, setSettingsName] = useState(group.name);
  const [settingsDesc, setSettingsDesc] = useState(group.description || "");
  const [settingsCurrency, setSettingsCurrency] = useState(group.defaultCurrency);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Overflow menu (mobile)
  const [showOverflow, setShowOverflow] = useState(false);

  // Add Member Form state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [membersToAdd, setMembersToAdd] = useState<Member[]>([]);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const memberSearchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

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
    const timer = setTimeout(() => {
      setCustomSplits(initial);
    }, 0);
    return () => clearTimeout(timer);
  }, [expenseSplitType, members]);

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

    const conversionRate = expenseCurrency === group.defaultCurrency ? 1.0 : (parseFloat(expenseConversionRate) || 1.0);

    const res = await addExpense(
      expenseDesc,
      amount,
      expenseCategory,
      expenseCurrency,
      group.id,
      expensePayer,
      expenseSplitType,
      splitsPayload,
      conversionRate
    );

    if (res.success) {
      setShowExpenseModal(false);
      setExpenseDesc("");
      setExpenseAmt("");
      setExpenseCategory("General");
      setExpenseConversionRate("1.0");
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

  // Open the expense modal pre-filled for editing
  function openEditModal(expense: Expense) {
    setEditingExpenseId(expense.id);
    setExpenseDesc(expense.description);
    setExpenseAmt(String(expense.amount));
    setExpenseCategory(expense.category);
    setExpenseCurrency(expense.currency);
    setExpensePayer(expense.payerId);
    setExpenseSplitType(expense.splitType as "EQUAL" | "UNEQUAL" | "PERCENTAGE" | "SHARES");
    setExpenseConversionRate(String(expense.conversionRate));

    // Pre-fill custom splits from stored split data
    const initial: Record<string, string> = {};
    members.forEach((m) => {
      const split = expense.splits.find((s) => s.userId === m.id);
      if (expense.splitType === "EQUAL") {
        initial[m.id] = split ? "true" : "false";
      } else if (expense.splitType === "PERCENTAGE") {
        initial[m.id] = split?.percentage != null ? String(split.percentage) : "0";
      } else if (expense.splitType === "SHARES") {
        initial[m.id] = split?.shares != null ? String(split.shares) : "0";
      } else {
        // UNEQUAL: stored in converted currency, convert back to original
        const rawAmount = split ? parseFloat((split.amount / expense.conversionRate).toFixed(2)) : 0;
        initial[m.id] = String(rawAmount);
      }
    });
    setCustomSplits(initial);
    setFormError(null);
    setShowExpenseModal(true);
  }

  // Submit handler for editing an expense
  async function handleEditExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingExpenseId) return;
    setFormError(null);
    const amount = parseFloat(expenseAmt);
    if (isNaN(amount) || amount <= 0) { setFormError("Please enter a valid amount."); return; }

    setLoading(true);

    const splitsPayload = members
      .filter((m) => expenseSplitType === "EQUAL" ? customSplits[m.id] === "true" : true)
      .map((m) => {
        const val = parseFloat(customSplits[m.id]) || 0;
        return {
          userId: m.id,
          amount: expenseSplitType === "UNEQUAL" ? val : undefined,
          percentage: expenseSplitType === "PERCENTAGE" ? val : undefined,
          shares: expenseSplitType === "SHARES" ? val : undefined,
        };
      });

    const conversionRate = expenseCurrency === group.defaultCurrency ? 1.0 : (parseFloat(expenseConversionRate) || 1.0);

    const res = await updateExpense(
      editingExpenseId,
      expenseDesc,
      amount,
      expenseCategory,
      expenseCurrency,
      expensePayer,
      expenseSplitType,
      splitsPayload,
      conversionRate
    );

    if (res.success) {
      setShowExpenseModal(false);
      setEditingExpenseId(null);
      setExpenseDesc(""); setExpenseAmt(""); setExpenseCategory("General"); setExpenseConversionRate("1.0");
      router.refresh();
    } else {
      setFormError(res.error || "Failed to update expense.");
    }
    setLoading(false);
  }

  // Save group settings
  async function handleGroupSettingsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsError(null);
    const res = await updateGroupSettings(group.id, settingsName, settingsDesc, settingsCurrency);
    if (res.success) {
      setShowGroupSettingsModal(false);
      router.refresh();
    } else {
      setSettingsError(res.error || "Failed to save settings.");
    }
    setSettingsLoading(false);
  }

  // Delete the entire group
  async function handleDeleteGroup() {
    setDeleteGroupLoading(true);
    const res = await deleteGroup(group.id);
    if (res.success) {
      router.push("/dashboard");
    } else {
      alert(res.error || "Failed to delete group.");
      setDeleteGroupLoading(false);
      setShowDeleteGroupModal(false);
    }
  }

  // Debounced member search
  React.useEffect(() => {
    if (memberSearchQuery.trim().length < 2) {
      setMemberSearchResults([]);
      setMemberSearching(false);
      return;
    }

    setMemberSearching(true);
    if (memberSearchTimeoutRef.current) clearTimeout(memberSearchTimeoutRef.current);

    memberSearchTimeoutRef.current = setTimeout(async () => {
      const results = await searchUsers(memberSearchQuery);
      const filtered = results.filter(
        (r) =>
          !members.some((m) => m.id === r.id) &&
          !membersToAdd.some((m) => m.id === r.id)
      );
      setMemberSearchResults(filtered);
      setMemberSearching(false);
    }, 400);

    return () => {
      if (memberSearchTimeoutRef.current) {
        clearTimeout(memberSearchTimeoutRef.current);
      }
    };
  }, [memberSearchQuery, members, membersToAdd]);

  // Handle addition of new members to group
  async function handleAddMembersSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddMemberError(null);

    if (membersToAdd.length === 0) {
      setAddMemberError("Please select at least one member to add.");
      return;
    }

    setAddMemberLoading(true);
    const memberIds = membersToAdd.map((m) => m.id);
    const res = await addMembersToGroup(group.id, memberIds);

    if (res.success) {
      setShowAddMemberModal(false);
      setMembersToAdd([]);
      setMemberSearchQuery("");
      router.refresh();
    } else {
      setAddMemberError(res.error || "Failed to add members.");
    }
    setAddMemberLoading(false);
  }

  // Copy Group Invite Link
  function handleCopyInviteLink() {
    const inviteUrl = `${window.location.origin}/groups/join/${group.id}`;
    navigator.clipboard.writeText(inviteUrl);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
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

  // Currency formatting helper (defensive: invalid ISO codes must not crash render)
  function formatCurrency(amount: number, currency: string = "EUR") {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "EUR",
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  // Calculate Category-wise breakdown for active currency in tabs (defaults to USD or first available)
  const activeCurrency = balances.currencies[0] || "EUR";
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
  const chartSegments: { category: string; amount: number; percentage: number; startPercent: number; color: string }[] = [];
  let cumulativePercent = 0;
  for (const cat of CATEGORIES) {
    const amount = categoryTotals[cat];
    const percentage = totalSpentInCurrency > 0 ? (amount / totalSpentInCurrency) * 100 : 0;
    if (percentage > 0) {
      chartSegments.push({
        category: cat,
        amount,
        percentage,
        startPercent: cumulativePercent,
        color: CATEGORY_COLORS[cat],
      });
      cumulativePercent += percentage;
    }
  }

  return (
    <div style={styles.container} className="animate-fade-in">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div style={styles.topBar}>
        <Link href="/dashboard" style={styles.backLink}>
          <ArrowLeft size={18} />
          <span>Dashboard</span>
        </Link>

        {/* Desktop: group name in centre */}
        <span className="desktop-only" style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", flex: 1, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 0.5rem" }}>
          {group.name}
        </span>

        {/* Desktop action buttons */}
        <div className="desktop-only" style={{ display: "flex", gap: "0.6rem" }}>
          <button onClick={handleCSVExport} className="btn btn-secondary" style={styles.smBtn}>
            <FileDown size={14} /> Export
          </button>
          <button onClick={() => { setSettingsName(group.name); setSettingsDesc(group.description || ""); setSettingsCurrency(group.defaultCurrency); setShowGroupSettingsModal(true); }} className="btn btn-secondary" style={styles.smBtn}>
            <Settings size={14} /> Settings
          </button>
          <button onClick={() => setShowDeleteGroupModal(true)} style={styles.deleteGroupBtn}>
            <Trash2 size={14} /> Delete
          </button>
        </div>

        {/* Mobile: overflow ⋮ button */}
        <div className="mobile-only" style={{ position: "relative" }}>
          <button onClick={() => setShowOverflow(!showOverflow)} style={styles.overflowBtn} aria-label="More options">
            <span style={{ fontSize: "1.3rem", lineHeight: 1, letterSpacing: "0.05em" }}>⋮</span>
          </button>
          {showOverflow && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 399 }} onClick={() => setShowOverflow(false)} />
              <div style={styles.overflowMenu}>
                <button style={styles.overflowItem} onClick={() => { setShowOverflow(false); handleCSVExport(); }}><FileDown size={15} /> Export Ledger</button>
                <button style={styles.overflowItem} onClick={() => { setShowOverflow(false); setSettingsName(group.name); setSettingsDesc(group.description || ""); setSettingsCurrency(group.defaultCurrency); setShowGroupSettingsModal(true); }}><Settings size={15} /> Group Settings</button>
                <button style={{ ...styles.overflowItem, color: "#ef4444" }} onClick={() => { setShowOverflow(false); setShowDeleteGroupModal(true); }}><Trash2 size={15} /> Delete Group</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Group Hero card ──────────────────────────────────── */}
      <div style={styles.groupHero} className="glass-card">
        <div style={styles.heroLeft}>
          <div style={styles.heroAvatar}>{group.name.charAt(0).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <h1 style={styles.groupHeroName}>{group.name}</h1>
            {group.description && <p style={styles.groupHeroDesc}>{group.description}</p>}
            <div style={styles.memberPills}>
              {members.slice(0, 4).map((m) => (
                <span key={m.id} style={styles.memberPill} title={m.name}>{m.name.charAt(0).toUpperCase()}</span>
              ))}
              {members.length > 4 && <span style={{ ...styles.memberPill, background: "var(--surface-hover)", color: "var(--text-muted)" }}>+{members.length - 4}</span>}
              <span style={styles.memberCount}>{members.length} members</span>
            </div>
          </div>
        </div>

        {/* Desktop primary actions */}
        <div className="desktop-only" style={styles.actionRow}>
          <button onClick={() => { setExpensePayer(currentUser.userId); setShowExpenseModal(true); }} className="btn btn-primary">
            <Plus size={17} /> Add Expense
          </button>
          <button onClick={() => { setSettlePayer(members[0]?.id || ""); setSettlePayee(members[1]?.id || ""); setShowSettleModal(true); }} className="btn btn-secondary">
            <PiggyBank size={17} /> Settle Up
          </button>
        </div>

        {/* Mobile: two buttons row below hero info */}
        <div className="mobile-only" style={{ width: "100%", display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
          <button onClick={() => { setExpensePayer(currentUser.userId); setShowExpenseModal(true); }} className="btn btn-primary" style={{ flex: 1, padding: "0.65rem", fontSize: "0.9rem" }}>
            <Plus size={16} /> Add Expense
          </button>
          <button onClick={() => { setSettlePayer(members[0]?.id || ""); setSettlePayee(members[1]?.id || ""); setShowSettleModal(true); }} className="btn btn-secondary" style={{ flex: 1, padding: "0.65rem", fontSize: "0.9rem" }}>
            <PiggyBank size={16} /> Settle Up
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div style={styles.tabsMenu} className="tabs-scroll">
        {([
          ["expenses", `Expenses (${group.expenses.length})`],
          ["debts", "Balances"],
          ["analytics", "Analytics"],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tabBtn,
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: activeTab === tab ? 700 : 500,
              borderBottom: activeTab === tab ? "2px solid var(--primary)" : "2px solid transparent",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        ))}
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
                  <p>Click &quot;Add Expense&quot; to register the first shared bill.</p>
                </div>
              ) : (
                <div style={styles.expenseList}>
                  {group.expenses.map((expense) => {
                    const payerName = members.find((m) => m.id === expense.payerId)?.name || "Group member";
                    const isCurrentUserPayer = expense.payerId === currentUser.userId;
                    
                    // Find current user's split share
                    const mySplit = expense.splits.find((s) => s.userId === currentUser.userId);
                    
                    return (
                      <div key={expense.id} className="glass-card expense-item" style={styles.expenseItem}>
                        <div style={styles.expenseDateBadge}>
                          <span style={styles.dateMonth}>
                            {new Date(expense.date).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
                          </span>
                          <span style={styles.dateDay}>
                            {new Date(expense.date).toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" })}
                          </span>
                        </div>

                        <div className="expense-details" style={styles.expenseDetails}>
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
                          {/* Mobile-only: show amount + share inline */}
                          <div className="expense-mobile-meta" style={{ gap: "0.75rem", marginTop: "0.15rem", alignItems: "center" }}>
                            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                              {formatCurrency(expense.amount, expense.currency)}
                            </span>
                            {mySplit && (
                              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: isCurrentUserPayer ? "var(--owed)" : "var(--owes)" }}>
                                {isCurrentUserPayer
                                  ? `you lent ${formatCurrency(expense.convertedAmount - mySplit.amount, group.defaultCurrency)}`
                                  : `you owe ${formatCurrency(mySplit.amount, group.defaultCurrency)}`}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="expense-amount-col" style={styles.expenseAmountCol}>
                          <span style={styles.expenseTotalLabel}>Amount</span>
                          <span style={styles.expenseTotalValue}>
                            {formatCurrency(expense.amount, expense.currency)}
                            {expense.conversionRate !== 1.0 && (
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                                ({formatCurrency(expense.convertedAmount, group.defaultCurrency)})
                              </div>
                            )}
                          </span>
                        </div>

                        <div className="expense-share-col" style={styles.expenseShareCol}>
                          {mySplit ? (
                            isCurrentUserPayer ? (
                              <>
                                <span style={{ ...styles.expenseTotalLabel, color: "var(--owed)" }}>you lent</span>
                                <span style={{ ...styles.expenseTotalValue, color: "var(--owed)" }}>
                                  {formatCurrency(expense.convertedAmount - mySplit.amount, group.defaultCurrency)}
                                </span>
                              </>
                            ) : (
                              <>
                                <span style={{ ...styles.expenseTotalLabel, color: "var(--owes)" }}>you owe</span>
                                <span style={{ ...styles.expenseTotalValue, color: "var(--owes)" }}>
                                  {formatCurrency(mySplit.amount, group.defaultCurrency)}
                                </span>
                              </>
                            )
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>not involved</span>
                          )}
                        </div>

                        <div className="expense-action-btns" style={{ display: "flex", gap: "0.25rem" }}>
                          <button
                            onClick={() => openEditModal(expense)}
                            style={styles.editBtn}
                            title="Edit expense"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            style={styles.deleteBtn}
                            title="Delete expense"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar with Quick balance breakdown */}
            <div style={styles.sidebarColumn}>
              <div className="glass-card" style={styles.sidebarCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ ...styles.sidebarTitle, marginBottom: 0 }}>
                    <Users size={16} color="var(--primary)" />
                    Group Members
                  </h3>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      style={{
                        background: inviteCopied ? "rgba(16, 185, 129, 0.15)" : "var(--surface-hover)",
                        border: inviteCopied ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--border-light)",
                        color: inviteCopied ? "var(--owed)" : "var(--text-muted)",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <Share2 size={12} />
                      {inviteCopied ? "Copied!" : "Invite Link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddMemberModal(true)}
                      style={{
                        background: "rgba(16, 185, 129, 0.15)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        color: "var(--primary)",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(16, 185, 129, 0.25)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)";
                      }}
                    >
                      <PlusCircle size={12} />
                      Add
                    </button>
                  </div>
                </div>
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
                          {new Date(payment.date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
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
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Group Spend Analytics</h2>
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
                      stroke="var(--border-light)"
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
                    <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
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

      {/* Add / Edit Expense Modal */}
      {showExpenseModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editingExpenseId ? "Edit Expense" : "Add an Expense"}</h2>
              <button onClick={() => { setShowExpenseModal(false); setEditingExpenseId(null); setFormError(null); }} style={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>

            {formError && <div style={styles.modalErrorBox}>{formError}</div>}

            <form onSubmit={editingExpenseId ? handleEditExpenseSubmit : handleAddExpenseSubmit} style={styles.modalForm}>
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
                    style={{ background: "#f8fafc" }}
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
                    style={{ background: "#f8fafc" }}
                  >
                    {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              {expenseCurrency !== group.defaultCurrency && (
                <div style={styles.modalFormRow}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="expConvRate" className="form-label">
                      Conversion Rate ({expenseCurrency} to {group.defaultCurrency}) *
                    </label>
                    <input
                      id="expConvRate"
                      type="number"
                      step="0.000001"
                      required
                      placeholder="e.g. 1.08"
                      value={expenseConversionRate}
                      onChange={(e) => setExpenseConversionRate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", paddingBottom: "0.5rem" }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 600 }}>
                      Converted: {expenseAmt || "0"} {expenseCurrency} = {parseFloat((parseFloat(expenseAmt || "0") * parseFloat(expenseConversionRate || "1")).toFixed(2))} {group.defaultCurrency}
                    </div>
                  </div>
                </div>
              )}

              <div style={styles.modalFormRow}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="expPayer" className="form-label">Paid By</label>
                  <select
                    id="expPayer"
                    value={expensePayer}
                    onChange={(e) => setExpensePayer(e.target.value)}
                    className="form-input"
                    style={{ background: "#f8fafc" }}
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
                    onChange={(e) => setExpenseSplitType(e.target.value as "EQUAL" | "UNEQUAL" | "PERCENTAGE" | "SHARES")}
                    className="form-input"
                    style={{ background: "#f8fafc" }}
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
                <button type="button" onClick={() => { setShowExpenseModal(false); setEditingExpenseId(null); setFormError(null); }} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? "Saving..." : editingExpenseId ? "Save Changes" : "Add Expense"}
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
                    style={{ background: "#f8fafc" }}
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
                    style={{ background: "#f8fafc" }}
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
                    style={{ background: "#f8fafc" }}
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

      {/* Group Settings Modal */}
      {showGroupSettingsModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Group Settings</h2>
              <button onClick={() => { setShowGroupSettingsModal(false); setSettingsError(null); }} style={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>

            {settingsError && <div style={styles.modalErrorBox}>{settingsError}</div>}

            <form onSubmit={handleGroupSettingsSubmit} style={styles.modalForm}>
              <div style={styles.modalFormGroup}>
                <label className="form-label">Group Name *</label>
                <input
                  type="text"
                  required
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Apartment roommates"
                  disabled={settingsLoading}
                />
              </div>

              <div style={styles.modalFormGroup}>
                <label className="form-label">Description</label>
                <textarea
                  value={settingsDesc}
                  onChange={(e) => setSettingsDesc(e.target.value)}
                  className="form-input"
                  placeholder="Optional description…"
                  style={{ minHeight: "72px", resize: "vertical" }}
                  disabled={settingsLoading}
                />
              </div>

              <div style={styles.modalFormGroup}>
                <label className="form-label">Default Currency</label>
                <select
                  value={settingsCurrency}
                  onChange={(e) => setSettingsCurrency(e.target.value)}
                  className="form-input"
                  style={{ background: "#f8fafc" }}
                  disabled={settingsLoading}
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Changing the currency only affects new expenses — existing balances keep their stored amounts.
                </span>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => { setShowGroupSettingsModal(false); setSettingsError(null); }} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={settingsLoading} className="btn btn-primary">
                  {settingsLoading ? "Saving…" : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      {showDeleteGroupModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={{ ...styles.modalCard, maxWidth: "420px" }}>
            <div style={styles.modalHeader}>
              <h2 style={{ ...styles.modalTitle, color: "#f43f5e" }}>Delete Group</h2>
              <button onClick={() => setShowDeleteGroupModal(false)} style={styles.modalCloseBtn}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Are you sure you want to delete <strong style={{ color: "var(--text-primary)" }}>{group.name}</strong>?
              This will permanently remove all expenses, splits, settlements, and member records. This action cannot be undone.
            </p>
            <div style={styles.modalActions}>
              <button onClick={() => setShowDeleteGroupModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={deleteGroupLoading}
                style={styles.deleteGroupConfirmBtn}
              >
                {deleteGroupLoading ? "Deleting..." : "Yes, Delete Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add Members to Group</h2>
              <button 
                type="button"
                onClick={() => { 
                  setShowAddMemberModal(false); 
                  setMemberSearchQuery("");
                  setMembersToAdd([]);
                  setAddMemberError(null); 
                }} 
                style={styles.modalCloseBtn}
              >
                <X size={20} />
              </button>
            </div>

            {addMemberError && <div style={styles.modalErrorBox}>{addMemberError}</div>}

            <form onSubmit={handleAddMembersSubmit} style={styles.modalForm}>
              <div style={styles.modalFormGroup}>
                <label className="form-label">Search by name or username</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Type at least 2 characters…"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="form-input"
                    style={{ paddingRight: "2.5rem" }}
                  />
                  {memberSearching && (
                    <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.75rem", color: "var(--primary)" }}>
                      searching…
                    </span>
                  )}
                  {memberSearchQuery.trim().length >= 2 && !memberSearching && memberSearchResults.length === 0 && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                      background: "#fff", border: "1px solid var(--border-light)", borderRadius: "10px",
                      padding: "0.6rem 0.875rem", fontSize: "0.82rem", color: "var(--text-muted)", zIndex: 20,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}>
                      No users found matching &quot;{memberSearchQuery}&quot; — they may already be in this group.
                    </div>
                  )}
                  {memberSearchResults.length > 0 && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                      background: "#fff", border: "1px solid var(--border-light)", borderRadius: "10px",
                      maxHeight: "180px", overflowY: "auto", zIndex: 20,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}>
                      {memberSearchResults.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setMembersToAdd((prev) => [...prev, user]);
                            setMemberSearchQuery("");
                            setMemberSearchResults([]);
                          }}
                          style={{
                            padding: "0.5rem",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            borderBottom: "1px solid var(--border-light)",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          <strong>{user.name}</strong> (@{user.username})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {membersToAdd.length > 0 && (
                <div style={styles.modalFormGroup}>
                  <label className="form-label">Members to Add:</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {membersToAdd.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          background: "rgba(16, 185, 129, 0.15)",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          color: "var(--primary)",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "9999px",
                          fontSize: "0.8rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem"
                        }}
                      >
                        {m.name}
                        <button
                          type="button"
                          onClick={() => setMembersToAdd((prev) => prev.filter((item) => item.id !== m.id))}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--primary)",
                            cursor: "pointer",
                            padding: 0,
                            display: "flex",
                            alignItems: "center"
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => { 
                    setShowAddMemberModal(false); 
                    setMemberSearchQuery("");
                    setMembersToAdd([]);
                    setAddMemberError(null); 
                  }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={addMemberLoading || membersToAdd.length === 0} 
                  className="btn btn-primary"
                >
                  {addMemberLoading ? "Adding..." : "Add Members"}
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
  /* ── Header ── */
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    flexShrink: 0,
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
    borderRadius: "10px",
    padding: "0.5rem 0.875rem",
    minHeight: "44px",
  },
  smBtn: { padding: "0.4rem 0.875rem", fontSize: "0.8rem", gap: "0.35rem" },
  overflowBtn: {
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
    borderRadius: "8px",
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "var(--text-secondary)",
  },
  overflowMenu: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    background: "#fff",
    border: "1px solid var(--border-light)",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    zIndex: 400,
    minWidth: "180px",
    overflow: "hidden",
  },
  overflowItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    width: "100%",
    padding: "0.75rem 1rem",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid var(--border-light)",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "var(--text-primary)",
    cursor: "pointer",
    textAlign: "left" as const,
  },
  /* ── Hero card ── */
  groupHero: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0",
    padding: "1.25rem",
  },
  heroLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.875rem",
    flex: 1,
    minWidth: 0,
  },
  heroAvatar: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "linear-gradient(135deg,var(--primary) 0%,var(--secondary) 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: "1.2rem",
    color: "#fff",
    flexShrink: 0,
  },
  groupHeroName: {
    fontSize: "1.1rem",
    fontWeight: 800,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
  },
  groupHeroDesc: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    marginTop: "0.15rem",
  },
  memberPills: {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
    marginTop: "0.4rem",
  },
  memberPill: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: "rgba(16,185,129,0.15)",
    color: "var(--primary)",
    fontSize: "0.65rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1.5px solid #fff",
  },
  memberCount: {
    fontSize: "0.72rem",
    color: "var(--text-muted)",
    marginLeft: "0.25rem",
  },
  actionRow: { display: "flex", gap: "0.75rem", flexShrink: 0 },
  /* ── Tabs ── */
  tabsMenu: {
    display: "flex",
    borderBottom: "1px solid var(--border-light)",
    gap: "0",
  },
  tabBtn: {
    background: "transparent",
    border: "none",
    padding: "0.65rem 1rem",
    fontSize: "0.88rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "color 0.15s",
    flexShrink: 0,
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
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
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
    color: "var(--text-primary)",
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
    color: "var(--text-primary)",
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
  editBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "0.4rem",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.2s, background-color 0.2s",
  },
  deleteBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "0.4rem",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.2s, background-color 0.2s",
  },
  deleteGroupBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.5rem 1rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    background: "rgba(244, 63, 94, 0.08)",
    border: "1px solid rgba(244, 63, 94, 0.3)",
    color: "#f43f5e",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  deleteGroupConfirmBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.6rem 1.25rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    background: "#f43f5e",
    border: "none",
    color: "#fff",
    borderRadius: "10px",
    cursor: "pointer",
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
    borderBottom: "1px solid var(--border-light)",
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
    backgroundColor: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
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
    color: "var(--text-primary)",
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
    fontSize: "1.25rem",
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
    color: "var(--text-primary)",
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
    borderBottom: "1px solid var(--border-light)",
  },
  analyticsCard: {
    padding: "2rem",
  },
  analyticsHeader: {
    borderBottom: "1px solid var(--border-light)",
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
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
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
    color: "var(--text-primary)",
  },
  legendRight: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.5rem",
  },
  legendAmount: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text-primary)",
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
    fontSize: "1.25rem",
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
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
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
    color: "var(--text-primary)",
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
  modalFormGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "1rem",
    marginTop: "0.5rem",
  },
};
