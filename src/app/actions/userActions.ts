"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

export interface ProfileActionResult {
  success: boolean;
  error?: string;
}

export async function updateProfileName(name: string): Promise<ProfileActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized." };
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Name cannot be empty." };
  try {
    await db.user.update({ where: { id: session.userId }, data: { name: trimmed } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update name." };
  }
}

export async function updateUsername(newUsername: string): Promise<ProfileActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized." };
  const trimmed = newUsername.trim().toLowerCase();
  if (!trimmed || trimmed.length < 3) return { success: false, error: "Username must be at least 3 characters." };
  if (!/^[a-z0-9_]+$/.test(trimmed)) return { success: false, error: "Username can only contain letters, numbers, and underscores." };
  try {
    const existing = await db.user.findUnique({ where: { username: trimmed } });
    if (existing && existing.id !== session.userId) return { success: false, error: "That username is already taken." };
    await db.user.update({ where: { id: session.userId }, data: { username: trimmed } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update username." };
  }
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<ProfileActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized." };
  if (newPassword.length < 8) return { success: false, error: "New password must be at least 8 characters." };
  try {
    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user) return { success: false, error: "User not found." };
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return { success: false, error: "Current password is incorrect." };
    const hashed = await bcrypt.hash(newPassword, 12);
    await db.user.update({ where: { id: session.userId }, data: { password: hashed } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update password." };
  }
}

export async function deleteActivityLog(logId: string): Promise<ProfileActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized." };
  try {
    const log = await db.activityLog.findUnique({ where: { id: logId }, select: { userId: true } });
    if (!log) return { success: false, error: "Activity not found." };
    if (log.userId !== session.userId) return { success: false, error: "You can only delete your own activities." };
    await db.activityLog.delete({ where: { id: logId } });
    revalidatePath("/activities");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete activity." };
  }
}

export async function getCurrentUserProfile() {
  const session = await getCurrentUser();
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, username: true, createdAt: true },
  });
}

export interface FriendInfo {
  id: string;
  name: string;
  username: string;
  sharedGroups: string[];
  balances: Record<string, number>;
  latestActivityAt?: string | null;
}

export interface GroupInfo {
  id: string;
  name: string;
  memberCount?: number;
  latestActivityAt?: string | null;
}

export interface FriendLedgerTransaction {
  id: string;
  type: "expense" | "payment";
  description: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  payerId: string;
  payerName: string;
  isPayer: boolean;
  mySplitAmount: number;
  lentAmount: number;    // > 0 if friend owes user
  borrowedAmount: number; // > 0 if user owes friend
  splits?: { userId: string; name: string; amount: number }[];
}

export interface FriendLedgerData {
  friend: {
    id: string;
    name: string;
    username: string;
    sharedGroups: string[];
  };
  balances: Record<string, number>;
  transactions: FriendLedgerTransaction[];
}

export async function getFriends(): Promise<FriendInfo[]> {
  const session = await getCurrentUser();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const friendsMap: Record<string, FriendInfo> = {};
  const friendActivityMap: Record<string, number> = {};

  // 1. Get all group members that share groups with the user
  const userGroups = await db.groupMember.findMany({
    where: { userId: session.userId },
    select: { groupId: true },
  });

  const groupIds = userGroups.map((g) => g.groupId);

  if (groupIds.length > 0) {
    const groupMembers = await db.groupMember.findMany({
      where: {
        groupId: { in: groupIds },
        userId: { not: session.userId },
      },
      select: {
        user: {
          select: { id: true, username: true, name: true },
        },
        group: {
          select: { id: true, name: true },
        },
      },
    });

    groupMembers.forEach((member) => {
      const u = member.user;
      if (!friendsMap[u.id]) {
        friendsMap[u.id] = {
          id: u.id,
          username: u.username,
          name: u.name,
          sharedGroups: [member.group.name],
          balances: {},
        };
      } else {
        if (!friendsMap[u.id].sharedGroups.includes(member.group.name)) {
          friendsMap[u.id].sharedGroups.push(member.group.name);
        }
      }
    });

    // Check recent group transactions for shared group activity
    const recentGroupExpenses = await db.expense.findMany({
      where: { groupId: { in: groupIds } },
      select: {
        createdAt: true,
        date: true,
        payerId: true,
        splits: { select: { userId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    for (const exp of recentGroupExpenses) {
      const expTime = Math.max(exp.createdAt.getTime(), exp.date.getTime());
      if (friendsMap[exp.payerId]) {
        const cur = friendActivityMap[exp.payerId] || 0;
        if (expTime > cur) friendActivityMap[exp.payerId] = expTime;
      }
      for (const split of exp.splits) {
        if (friendsMap[split.userId]) {
          const cur = friendActivityMap[split.userId] || 0;
          if (expTime > cur) friendActivityMap[split.userId] = expTime;
        }
      }
    }

    const recentGroupPayments = await db.payment.findMany({
      where: { groupId: { in: groupIds } },
      select: {
        createdAt: true,
        date: true,
        payerId: true,
        payeeId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    for (const pay of recentGroupPayments) {
      const payTime = Math.max(pay.createdAt.getTime(), pay.date.getTime());
      if (friendsMap[pay.payerId]) {
        const cur = friendActivityMap[pay.payerId] || 0;
        if (payTime > cur) friendActivityMap[pay.payerId] = payTime;
      }
      if (friendsMap[pay.payeeId]) {
        const cur = friendActivityMap[pay.payeeId] || 0;
        if (payTime > cur) friendActivityMap[pay.payeeId] = payTime;
      }
    }
  }

  // 2. Fetch direct 1-on-1 expenses (groupId is null)
  const directExpenses = await db.expense.findMany({
    where: {
      groupId: null,
      OR: [
        { payerId: session.userId },
        { splits: { some: { userId: session.userId } } },
      ],
    },
    include: {
      payer: { select: { id: true, name: true, username: true } },
      splits: {
        include: {
          user: { select: { id: true, name: true, username: true } },
        },
      },
    },
  });

  for (const exp of directExpenses) {
    const curr = exp.currency;
    const expTime = Math.max(exp.createdAt.getTime(), exp.date.getTime());

    if (exp.payerId === session.userId) {
      // Current user paid: each other split user owes current user
      for (const split of exp.splits) {
        if (split.userId !== session.userId) {
          if (!friendsMap[split.userId]) {
            friendsMap[split.userId] = {
              id: split.userId,
              name: split.user.name,
              username: split.user.username,
              sharedGroups: [],
              balances: {},
            };
          }
          const prev = friendsMap[split.userId].balances[curr] || 0;
          friendsMap[split.userId].balances[curr] = parseFloat((prev + split.amount).toFixed(2));

          const cur = friendActivityMap[split.userId] || 0;
          if (expTime > cur) friendActivityMap[split.userId] = expTime;
        }
      }
    } else {
      // Someone else paid: if current user is in splits, current user owes payer
      const mySplit = exp.splits.find((s) => s.userId === session.userId);
      if (mySplit) {
        const payerId = exp.payerId;
        if (!friendsMap[payerId]) {
          friendsMap[payerId] = {
            id: payerId,
            name: exp.payer.name,
            username: exp.payer.username,
            sharedGroups: [],
            balances: {},
          };
        }
        const prev = friendsMap[payerId].balances[curr] || 0;
        friendsMap[payerId].balances[curr] = parseFloat((prev - mySplit.amount).toFixed(2));

        const cur = friendActivityMap[payerId] || 0;
        if (expTime > cur) friendActivityMap[payerId] = expTime;
      }
    }
  }

  // 3. Fetch direct 1-on-1 payments (groupId is null)
  const directPayments = await db.payment.findMany({
    where: {
      groupId: null,
      OR: [
        { payerId: session.userId },
        { payeeId: session.userId },
      ],
    },
    include: {
      payer: { select: { id: true, name: true, username: true } },
      payee: { select: { id: true, name: true, username: true } },
    },
  });

  for (const pay of directPayments) {
    const curr = pay.currency;
    const payTime = Math.max(pay.createdAt.getTime(), pay.date.getTime());

    if (pay.payerId === session.userId) {
      // Current user paid friend: reduces debt or friend owes user
      const payeeId = pay.payeeId;
      if (!friendsMap[payeeId]) {
        friendsMap[payeeId] = {
          id: payeeId,
          name: pay.payee.name,
          username: pay.payee.username,
          sharedGroups: [],
          balances: {},
        };
      }
      const prev = friendsMap[payeeId].balances[curr] || 0;
      friendsMap[payeeId].balances[curr] = parseFloat((prev + pay.amount).toFixed(2));

      const cur = friendActivityMap[payeeId] || 0;
      if (payTime > cur) friendActivityMap[payeeId] = payTime;
    } else {
      // Friend paid current user: reduces what friend owes
      const payerId = pay.payerId;
      if (!friendsMap[payerId]) {
        friendsMap[payerId] = {
          id: payerId,
          name: pay.payer.name,
          username: pay.payer.username,
          sharedGroups: [],
          balances: {},
        };
      }
      const prev = friendsMap[payerId].balances[curr] || 0;
      friendsMap[payerId].balances[curr] = parseFloat((prev - pay.amount).toFixed(2));

      const cur = friendActivityMap[payerId] || 0;
      if (payTime > cur) friendActivityMap[payerId] = payTime;
    }
  }

  // Clean near-zero balances and attach latestActivityAt
  const friendsList: FriendInfo[] = Object.values(friendsMap).map((f) => {
    const cleanedBalances: Record<string, number> = {};
    for (const [c, b] of Object.entries(f.balances)) {
      if (Math.abs(b) >= 0.005) {
        cleanedBalances[c] = b;
      } else {
        cleanedBalances[c] = 0;
      }
    }
    const actTime = friendActivityMap[f.id];
    return {
      ...f,
      balances: cleanedBalances,
      latestActivityAt: actTime ? new Date(actTime).toISOString() : null,
    };
  });

  // Sort friends with latest activity first
  friendsList.sort((a, b) => {
    const tA = a.latestActivityAt ? new Date(a.latestActivityAt).getTime() : 0;
    const tB = b.latestActivityAt ? new Date(b.latestActivityAt).getTime() : 0;
    return tB - tA;
  });

  return friendsList;
}

export async function getFriendLedger(friendId: string): Promise<FriendLedgerData | null> {
  const session = await getCurrentUser();
  if (!session) return null;

  const friend = await db.user.findUnique({
    where: { id: friendId },
    select: { id: true, name: true, username: true },
  });

  if (!friend) return null;

  // Find shared groups
  const userGroupMemberships = await db.groupMember.findMany({
    where: { userId: session.userId },
    select: { groupId: true },
  });
  const userGroupIds = userGroupMemberships.map((g) => g.groupId);

  const sharedMemberships = await db.groupMember.findMany({
    where: {
      userId: friendId,
      groupId: { in: userGroupIds },
    },
    include: { group: { select: { name: true } } },
  });

  const sharedGroups = sharedMemberships.map((m) => m.group.name);

  // Fetch direct expenses between session.userId and friendId
  const directExpenses = await db.expense.findMany({
    where: {
      groupId: null,
      OR: [
        {
          payerId: session.userId,
          splits: { some: { userId: friendId } },
        },
        {
          payerId: friendId,
          splits: { some: { userId: session.userId } },
        },
      ],
    },
    include: {
      payer: { select: { id: true, name: true, username: true } },
      splits: {
        include: {
          user: { select: { id: true, name: true, username: true } },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  // Fetch direct payments between session.userId and friendId
  const directPayments = await db.payment.findMany({
    where: {
      groupId: null,
      OR: [
        { payerId: session.userId, payeeId: friendId },
        { payerId: friendId, payeeId: session.userId },
      ],
    },
    include: {
      payer: { select: { id: true, name: true, username: true } },
      payee: { select: { id: true, name: true, username: true } },
    },
    orderBy: { date: "desc" },
  });

  const balances: Record<string, number> = {};
  const transactions: FriendLedgerTransaction[] = [];

  for (const exp of directExpenses) {
    const isPayer = exp.payerId === session.userId;
    const mySplit = exp.splits.find((s) => s.userId === session.userId);
    const friendSplit = exp.splits.find((s) => s.userId === friendId);

    let lentAmount = 0;
    let borrowedAmount = 0;

    if (isPayer) {
      lentAmount = friendSplit?.amount || 0;
      balances[exp.currency] = parseFloat(((balances[exp.currency] || 0) + lentAmount).toFixed(2));
    } else {
      borrowedAmount = mySplit?.amount || 0;
      balances[exp.currency] = parseFloat(((balances[exp.currency] || 0) - borrowedAmount).toFixed(2));
    }

    transactions.push({
      id: exp.id,
      type: "expense",
      description: exp.description,
      amount: exp.amount,
      currency: exp.currency,
      date: exp.date.toISOString(),
      category: exp.category,
      payerId: exp.payerId,
      payerName: exp.payer.name,
      isPayer,
      mySplitAmount: mySplit?.amount || 0,
      lentAmount,
      borrowedAmount,
      splits: exp.splits.map((s) => ({
        userId: s.userId,
        name: s.user.name,
        amount: s.amount,
      })),
    });
  }

  for (const pay of directPayments) {
    const isPayer = pay.payerId === session.userId;
    if (isPayer) {
      // User paid friend
      balances[pay.currency] = parseFloat(((balances[pay.currency] || 0) + pay.amount).toFixed(2));
    } else {
      // Friend paid user
      balances[pay.currency] = parseFloat(((balances[pay.currency] || 0) - pay.amount).toFixed(2));
    }

    transactions.push({
      id: pay.id,
      type: "payment",
      description: isPayer ? `Payment to ${pay.payee.name}` : `Payment from ${pay.payer.name}`,
      amount: pay.amount,
      currency: pay.currency,
      date: pay.date.toISOString(),
      category: "Payment",
      payerId: pay.payerId,
      payerName: pay.payer.name,
      isPayer,
      mySplitAmount: pay.amount,
      lentAmount: isPayer ? pay.amount : 0,
      borrowedAmount: !isPayer ? pay.amount : 0,
    });
  }

  // Sort all transactions by date descending
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Clean near-zero balances
  for (const [c, b] of Object.entries(balances)) {
    if (Math.abs(b) < 0.005) {
      balances[c] = 0;
    }
  }

  return {
    friend: {
      id: friend.id,
      name: friend.name,
      username: friend.username,
      sharedGroups,
    },
    balances,
    transactions,
  };
}

export async function getUserGroups(): Promise<GroupInfo[]> {
  const session = await getCurrentUser();
  if (!session) return [];

  const userGroups = await db.groupMember.findMany({
    where: { userId: session.userId },
    select: {
      group: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: { select: { members: true } },
          expenses: {
            select: { createdAt: true, date: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          payments: {
            select: { createdAt: true, date: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const groupsList: GroupInfo[] = userGroups.map((g) => {
    const expTime = g.group.expenses[0]
      ? Math.max(g.group.expenses[0].createdAt.getTime(), g.group.expenses[0].date.getTime())
      : 0;
    const payTime = g.group.payments[0]
      ? Math.max(g.group.payments[0].createdAt.getTime(), g.group.payments[0].date.getTime())
      : 0;
    const groupCreated = g.group.createdAt ? g.group.createdAt.getTime() : 0;
    const latest = Math.max(expTime, payTime, groupCreated);

    return {
      id: g.group.id,
      name: g.group.name,
      memberCount: g.group._count?.members,
      latestActivityAt: latest > 0 ? new Date(latest).toISOString() : null,
    };
  });

  groupsList.sort((a, b) => {
    const tA = a.latestActivityAt ? new Date(a.latestActivityAt).getTime() : 0;
    const tB = b.latestActivityAt ? new Date(b.latestActivityAt).getTime() : 0;
    return tB - tA;
  });

  return groupsList;
}
