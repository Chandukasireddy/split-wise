"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getUserOverallBalances } from "@/lib/balances";

export interface CategorySpend {
  category: string;
  actualAmount: number;
  percentage: number;
  color: string;
  emoji: string;
}

export interface MonthSpend {
  key: string;            // e.g. "2026-09"
  label: string;          // e.g. "Sep 2026"
  shortLabel: string;     // e.g. "Sep"
  month: string;
  year: number;
  actualSpend: number;
  bankOutflow: number;
  paidForOthers: number;
  reimbursed: number;
}

export interface SpendingTransaction {
  id: string;
  description: string;
  category: string;
  currency: string;
  date: string;
  groupName: string | null;
  totalExpenseAmount: number;
  userShare: number;
  userPaidTotal: number;
  isPayer: boolean;
  payerName: string;
  lentAmount: number;
}

export interface PersonalSpendingSummary {
  currency: string;
  actualExpenditure: number;       // True consumption (Personal share only)
  bankOutflow: number;             // Total gross outflow from user's accounts
  paidForOthers: number;           // Money user paid on behalf of others
  reimbursementsReceived: number;  // Settled money paid back to user
  netReceivables: number;          // Outstanding money friends owe user
  netPayables: number;             // Outstanding money user owes
  categories: CategorySpend[];
  monthlyTrends: MonthSpend[];
  recentTransactions: SpendingTransaction[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#10b981",
  "Food & Dining": "#10b981",
  "Food & Drink": "#10b981",
  Travel: "#3b82f6",
  "Travel & Transport": "#3b82f6",
  Transportation: "#3b82f6",
  Utilities: "#06b6d4",
  "Utilities & Bills": "#06b6d4",
  Entertainment: "#ec4899",
  Housing: "#8b5cf6",
  General: "#f59e0b",
  Other: "#64748b",
};

const CATEGORY_EMOJIS: Record<string, string> = {
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

export async function getPersonalSpendingData(): Promise<PersonalSpendingSummary | null> {
  const session = await getCurrentUser();
  if (!session) return null;

  const userId = session.userId;

  // 1. Fetch all expense splits where this user has a share (True consumption)
  const userSplits = await db.expenseSplit.findMany({
    where: { userId },
    include: {
      expense: {
        include: {
          group: { select: { name: true, defaultCurrency: true } },
          payer: { select: { id: true, name: true, username: true } },
          splits: true,
        },
      },
    },
    orderBy: { expense: { date: "desc" } },
  });

  // 2. Fetch all expenses where user was the payer (To calculate gross money outflow and lent amounts)
  const expensesUserPaid = await db.expense.findMany({
    where: { payerId: userId },
    include: {
      splits: true,
      group: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  // 3. Fetch payments sent (settlements user paid out) and received (reimbursements from others)
  const [paymentsSent, paymentsReceived, balances] = await Promise.all([
    db.payment.findMany({ where: { payerId: userId } }),
    db.payment.findMany({ where: { payeeId: userId } }),
    getUserOverallBalances(userId),
  ]);

  // Primary display currency: default to EUR or user's top group currency
  const primaryCurrency = "EUR";

  // Calculate True Actual Expenditure (sum of user's personal shares)
  let actualExpenditure = 0;
  const categoryMap: Record<string, number> = {};

  userSplits.forEach((split) => {
    const shareAmount = split.amount || 0;
    actualExpenditure += shareAmount;

    const cat = split.expense.category || "General";
    categoryMap[cat] = (categoryMap[cat] || 0) + shareAmount;
  });

  // Calculate Total Gross Outflow (Money that actually left user's bank/pocket)
  let bankOutflow = 0;
  let paidForOthers = 0;

  expensesUserPaid.forEach((exp) => {
    bankOutflow += exp.amount;
    const mySplit = exp.splits.find((s) => s.userId === userId);
    const myShare = mySplit ? mySplit.amount : 0;
    const othersShare = Math.max(0, exp.amount - myShare);
    paidForOthers += othersShare;
  });

  // Add payments sent to other people (debt settlements) to gross outflow
  paymentsSent.forEach((p) => {
    bankOutflow += p.amount;
  });

  // Calculate Reimbursements Received (Money people paid back to user)
  let reimbursementsReceived = 0;
  paymentsReceived.forEach((p) => {
    reimbursementsReceived += p.amount;
  });

  // Net receivables (what friends owe user)
  const totalOwed = Object.values(balances.totalOwed).reduce((acc, val) => acc + val, 0);
  const totalOwes = Object.values(balances.totalOwes).reduce((acc, val) => acc + val, 0);

  // Build Category Breakdown
  const categories: CategorySpend[] = Object.entries(categoryMap).map(([category, actualAmount]) => {
    const percentage = actualExpenditure > 0 ? Math.round((actualAmount / actualExpenditure) * 100) : 0;
    return {
      category,
      actualAmount: parseFloat(actualAmount.toFixed(2)),
      percentage,
      color: CATEGORY_COLORS[category] || "#64748b",
      emoji: CATEGORY_EMOJIS[category] || "🏷️",
    };
  }).sort((a, b) => b.actualAmount - a.actualAmount);

  // Build Monthly Trends (chronologically descending)
  const monthMap: Record<string, MonthSpend> = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  userSplits.forEach((split) => {
    const d = new Date(split.expense.date);
    const mIndex = d.getUTCMonth();
    const year = d.getUTCFullYear();
    const key = `${year}-${String(mIndex + 1).padStart(2, "0")}`;
    const label = `${monthNames[mIndex]} ${year}`;
    const shortLabel = monthNames[mIndex];

    if (!monthMap[key]) {
      monthMap[key] = {
        key,
        label,
        shortLabel,
        month: monthNames[mIndex],
        year,
        actualSpend: 0,
        bankOutflow: 0,
        paidForOthers: 0,
        reimbursed: 0,
      };
    }
    monthMap[key].actualSpend += split.amount;
  });

  expensesUserPaid.forEach((exp) => {
    const d = new Date(exp.date);
    const mIndex = d.getUTCMonth();
    const year = d.getUTCFullYear();
    const key = `${year}-${String(mIndex + 1).padStart(2, "0")}`;
    const label = `${monthNames[mIndex]} ${year}`;
    const shortLabel = monthNames[mIndex];

    if (!monthMap[key]) {
      monthMap[key] = {
        key,
        label,
        shortLabel,
        month: monthNames[mIndex],
        year,
        actualSpend: 0,
        bankOutflow: 0,
        paidForOthers: 0,
        reimbursed: 0,
      };
    }
    monthMap[key].bankOutflow += exp.amount;
    const mySplit = exp.splits.find((s) => s.userId === userId);
    const myShare = mySplit ? mySplit.amount : 0;
    monthMap[key].paidForOthers += Math.max(0, exp.amount - myShare);
  });

  paymentsReceived.forEach((p) => {
    const d = new Date(p.date);
    const mIndex = d.getUTCMonth();
    const year = d.getUTCFullYear();
    const key = `${year}-${String(mIndex + 1).padStart(2, "0")}`;
    if (monthMap[key]) {
      monthMap[key].reimbursed += p.amount;
    }
  });

  const monthlyTrends = Object.values(monthMap)
    .sort((a, b) => b.key.localeCompare(a.key))
    .slice(0, 12);

  // Build Recent Transactions with True Consumption breakdown
  const recentTransactions: SpendingTransaction[] = userSplits.map((split) => {
    const exp = split.expense;
    const isPayer = exp.payerId === userId;
    const userPaidTotal = isPayer ? exp.amount : 0;
    const lentAmount = isPayer ? Math.max(0, exp.amount - split.amount) : 0;
    const payerName = isPayer
      ? "You"
      : (exp.payer?.name || exp.payer?.username || "Someone");

    return {
      id: `${exp.id}-${split.id}`,
      description: exp.description,
      category: exp.category,
      currency: exp.currency,
      date: exp.date.toISOString(),
      groupName: exp.group ? exp.group.name : null,
      totalExpenseAmount: exp.amount,
      userShare: split.amount,
      userPaidTotal,
      isPayer,
      payerName,
      lentAmount,
    };
  });

  return {
    currency: primaryCurrency,
    actualExpenditure: parseFloat(actualExpenditure.toFixed(2)),
    bankOutflow: parseFloat(bankOutflow.toFixed(2)),
    paidForOthers: parseFloat(paidForOthers.toFixed(2)),
    reimbursementsReceived: parseFloat(reimbursementsReceived.toFixed(2)),
    netReceivables: parseFloat(totalOwed.toFixed(2)),
    netPayables: parseFloat(totalOwes.toFixed(2)),
    categories,
    monthlyTrends,
    recentTransactions,
  };
}
