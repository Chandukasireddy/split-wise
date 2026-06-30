"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export interface ExpenseActionResult {
  success: boolean;
  error?: string;
}

export interface SplitInput {
  userId: string;
  amount?: number;     // Used for UNEQUAL
  percentage?: number; // Used for PERCENTAGE
  shares?: number;     // Used for SHARES
}

/**
 * Server action to create a new expense and distribute the splits.
 */
export async function addExpense(
  description: string,
  amount: number,
  category: string,
  currency: string,
  groupId: string,
  payerId: string,
  splitType: "EQUAL" | "UNEQUAL" | "PERCENTAGE" | "SHARES",
  splits: SplitInput[]
): Promise<ExpenseActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  // Basic validations
  const trimmedDesc = description.trim();
  if (!trimmedDesc) {
    return { success: false, error: "Description is required." };
  }

  if (amount <= 0) {
    return { success: false, error: "Amount must be greater than 0." };
  }

  if (splits.length === 0) {
    return { success: false, error: "At least one person must split the expense." };
  }

  try {
    // Check if group exists and if payer/user is part of it
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      return { success: false, error: "Group not found." };
    }

    const isMember = group.members.some((m) => m.userId === session.userId);
    if (!isMember) {
      return { success: false, error: "You are not a member of this group." };
    }

    const payer = group.members.find((m) => m.userId === payerId);
    if (!payer) {
      return { success: false, error: "Selected payer is not in the group." };
    }

    // Process splits based on type and calculate exact amounts
    let calculatedSplits: { userId: string; amount: number; percentage?: number; shares?: number }[] = [];
    let sumCalculated = 0;

    if (splitType === "EQUAL") {
      // Split amount equally
      const shareCount = splits.length;
      const baseShare = Math.floor((amount / shareCount) * 100) / 100;
      let remainder = parseFloat((amount - baseShare * shareCount).toFixed(2));

      calculatedSplits = splits.map((s, idx) => {
        // Distribute remainder (cents) to the first few users to avoid rounding errors
        let userAmount = baseShare;
        if (remainder > 0) {
          userAmount += 0.01;
          remainder = parseFloat((remainder - 0.01).toFixed(2));
        }
        
        userAmount = parseFloat(userAmount.toFixed(2));
        sumCalculated += userAmount;

        return {
          userId: s.userId,
          amount: userAmount,
        };
      });
    } 
    else if (splitType === "UNEQUAL") {
      // Verifying sum of unequal splits
      let totalProvided = 0;
      calculatedSplits = splits.map((s) => {
        const val = s.amount || 0;
        totalProvided += val;
        
        const roundedVal = parseFloat(val.toFixed(2));
        sumCalculated += roundedVal;
        
        return {
          userId: s.userId,
          amount: roundedVal,
        };
      });

      if (Math.abs(totalProvided - amount) > 0.01) {
        return { 
          success: false, 
          error: `Sum of splits (${totalProvided.toFixed(2)}) must equal total amount (${amount.toFixed(2)}).` 
        };
      }
    } 
    else if (splitType === "PERCENTAGE") {
      // Splits by percentage
      let totalPercent = 0;
      splits.forEach((s) => { totalPercent += s.percentage || 0; });

      if (Math.abs(totalPercent - 100) > 0.01) {
        return { success: false, error: `Sum of percentages must equal 100% (currently ${totalPercent}%).` };
      }

      let remainder = amount;
      
      calculatedSplits = splits.map((s, idx) => {
        const percent = s.percentage || 0;
        let userAmount = Math.floor((amount * (percent / 100)) * 100) / 100;
        
        remainder = parseFloat((remainder - userAmount).toFixed(2));

        // Assign remainder to the last item
        if (idx === splits.length - 1) {
          userAmount = parseFloat((userAmount + remainder).toFixed(2));
        }

        sumCalculated += userAmount;

        return {
          userId: s.userId,
          amount: userAmount,
          percentage: percent,
        };
      });
    } 
    else if (splitType === "SHARES") {
      // Splits by shares
      let totalShares = 0;
      splits.forEach((s) => { totalShares += s.shares || 0; });

      if (totalShares <= 0) {
        return { success: false, error: "Total shares must be greater than 0." };
      }

      let remainder = amount;
      
      calculatedSplits = splits.map((s, idx) => {
        const userShares = s.shares || 0;
        let userAmount = Math.floor((amount * (userShares / totalShares)) * 100) / 100;
        
        remainder = parseFloat((remainder - userAmount).toFixed(2));

        if (idx === splits.length - 1) {
          userAmount = parseFloat((userAmount + remainder).toFixed(2));
        }

        sumCalculated += userAmount;

        return {
          userId: s.userId,
          amount: userAmount,
          shares: userShares,
        };
      });
    }

    // Double check sum calculated matches original amount
    if (Math.abs(sumCalculated - amount) > 0.02) {
      return { success: false, error: "Calculation mismatch: split sums do not equal total amount." };
    }

    // Perform database writes in a transaction
    await db.$transaction(async (tx) => {
      // 1. Create Expense
      const expense = await tx.expense.create({
        data: {
          description: trimmedDesc,
          amount,
          category,
          currency,
          groupId,
          payerId,
          splitType,
          createdById: session.userId,
        },
      });

      // 2. Create ExpenseSplits
      await tx.expenseSplit.createMany({
        data: calculatedSplits.map((cs) => ({
          expenseId: expense.id,
          userId: cs.userId,
          amount: cs.amount,
          percentage: cs.percentage || null,
          shares: cs.shares || null,
        })),
      });

      // Fetch payer details for logging
      const payerUser = await tx.user.findUnique({
        where: { id: payerId },
        select: { name: true },
      });

      // 3. Log Activity
      await tx.activityLog.create({
        data: {
          userId: session.userId,
          groupId,
          description: `added "${trimmedDesc}" for ${currency} ${amount.toFixed(2)} (paid by ${payerUser?.name || "Member"})`,
        },
      });
    });

    return { success: true };
  } catch (err) {
    console.error("Add expense error:", err);
    return { success: false, error: "Failed to add expense." };
  }
}

/**
 * Server action to delete an expense.
 */
export async function deleteExpense(
  expenseId: string
): Promise<ExpenseActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  try {
    const expense = await db.expense.findUnique({
      where: { id: expenseId },
      include: { group: true },
    });

    if (!expense) {
      return { success: false, error: "Expense not found." };
    }

    // Delete and log in transaction
    await db.$transaction(async (tx) => {
      // 1. Delete
      await tx.expense.delete({
        where: { id: expenseId },
      });

      // 2. Log Activity
      await tx.activityLog.create({
        data: {
          userId: session.userId,
          groupId: expense.groupId,
          description: `deleted the expense "${expense.description}" of ${expense.currency} ${expense.amount.toFixed(2)}`,
        },
      });
    });

    return { success: true };
  } catch (err) {
    console.error("Delete expense error:", err);
    return { success: false, error: "Failed to delete expense." };
  }
}
