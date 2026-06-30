"use server";

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
  groupId: string,
  payerId: string, // the debtor paying
  payeeId: string  // the creditor receiving
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

  try {
    // Verify group memberships
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

    const payerExists = group.members.some((m) => m.userId === payerId);
    const payeeExists = group.members.some((m) => m.userId === payeeId);

    if (!payerExists || !payeeExists) {
      return { success: false, error: "Payer or Payee is no longer in this group." };
    }

    // Perform database writes
    await db.$transaction(async (tx) => {
      // 1. Create Payment
      await tx.payment.create({
        data: {
          amount,
          currency,
          groupId,
          payerId,
          payeeId,
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
          groupId,
          description: `recorded a settlement: ${payerUser?.name} paid ${payeeUser?.name} ${currency} ${amount.toFixed(2)}`,
        },
      });
    });

    return { success: true };
  } catch (err) {
    console.error("Settle up error:", err);
    return { success: false, error: "Failed to record settlement." };
  }
}
