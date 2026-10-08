"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export interface SettleActionResult {
  success: boolean;
  error?: string;
}

/**
 * Record a settle-up payment between group members.
 */
export async function settleUp(
  amount: number,
  currency: string,
  groupId: string | null | undefined,
  payerId: string, // the debtor paying
  payeeId: string, // the creditor receiving
  date?: string | Date
): Promise<SettleActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  if (amount <= 0) {
    return { success: false, error: "Payment amount must be greater than 0." };
  }

  if (payerId === payeeId) {
    return { success: false, error: "You cannot settle up with yourself." };
  }

  const effectiveGroupId = groupId && groupId !== "direct" ? groupId : null;

  try {
    if (effectiveGroupId) {
      // Verify group memberships
      const group = await db.group.findUnique({
        where: { id: effectiveGroupId },
        include: { members: true },
      });

      if (!group) {
        return { success: false, error: "Group not found." };
      }

      const isMember = group.members.some((m) => m.userId === session.userId);
      if (!isMember) {
        return { success: false, error: "You are not a member of this group." };
      }

      const payerExists = group.members.some((m) => m.userId === payerId);
      const payeeExists = group.members.some((m) => m.userId === payeeId);

      if (!payerExists || !payeeExists) {
        return { success: false, error: "Payer or Payee is no longer in this group." };
      }
    } else {
      // 1-on-1 settlement
      if (session.userId !== payerId && session.userId !== payeeId) {
        return { success: false, error: "You must be either the payer or payee to record this settlement." };
      }
    }

    // Perform database writes
    await db.$transaction(async (tx) => {
      let paymentDate: Date | undefined = undefined;
      if (date) {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
          paymentDate = d;
        }
      }

      // 1. Create Payment
      await tx.payment.create({
        data: {
          amount,
          currency,
          groupId: effectiveGroupId,
          payerId,
          payeeId,
          ...(paymentDate ? { date: paymentDate } : {}),
        },
      });

      // Fetch names for logging
      const payerUser = await tx.user.findUnique({
        where: { id: payerId },
        select: { name: true },
      });
      const payeeUser = await tx.user.findUnique({
        where: { id: payeeId },
        select: { name: true },
      });

      // 2. Log Activity
      await tx.activityLog.create({
        data: {
          userId: session.userId,
          groupId: effectiveGroupId,
          description: `recorded a settlement: ${payerUser?.name} paid ${payeeUser?.name} ${currency} ${amount.toFixed(2)}`,
        },
      });
    });

    if (effectiveGroupId) {
      revalidatePath(`/groups/${effectiveGroupId}`);
    }
    revalidatePath("/friends");
    revalidatePath("/dashboard");
    revalidatePath("/activities");
    return { success: true };
  } catch (err) {
    console.error("Settle up error:", err);
    return { success: false, error: "Failed to record settlement." };
  }
}

/**
 * Delete a recorded settlement payment
 */
export async function deletePayment(
  paymentId: string
): Promise<SettleActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        payer: { select: { name: true } },
        payee: { select: { name: true } },
      },
    });

    if (!payment) {
      return { success: false, error: "Payment not found." };
    }

    // Must be either the payer or the payee (or group member if group payment)
    if (session.userId !== payment.payerId && session.userId !== payment.payeeId) {
      return {
        success: false,
        error: "You are not authorized to delete this settlement payment.",
      };
    }

    await db.$transaction(async (tx) => {
      // 1. Delete payment
      await tx.payment.delete({
        where: { id: paymentId },
      });

      // 2. Log Activity
      await tx.activityLog.create({
        data: {
          userId: session.userId,
          groupId: payment.groupId,
          description: `deleted a settlement: ${payment.payer?.name || "Someone"} paid ${payment.payee?.name || "someone"} ${payment.currency} ${payment.amount.toFixed(2)}`,
        },
      });
    });

    if (payment.groupId) {
      revalidatePath(`/groups/${payment.groupId}`);
    }
    revalidatePath("/friends");
    revalidatePath("/dashboard");
    revalidatePath("/activities");

    return { success: true };
  } catch (err) {
    console.error("Delete payment error:", err);
    return { success: false, error: "Failed to delete settlement payment." };
  }
}

