"use server";

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
}

export interface GroupInfo {
  id: string;
  name: string;
}

export async function getFriends(): Promise<FriendInfo[]> {
  const session = await getCurrentUser();
  if (!session) {
    throw new Error("Unauthorized");
  }

  // 1. Get all group IDs the current user belongs to
  const userGroups = await db.groupMember.findMany({
    where: { userId: session.userId },
    select: { groupId: true },
  });

  const groupIds = userGroups.map((g) => g.groupId);

  if (groupIds.length === 0) {
    return [];
  }

  // 2. Get all other members of those groups
  const groupMembers = await db.groupMember.findMany({
    where: {
      groupId: { in: groupIds },
      userId: { not: session.userId },
    },
    select: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
      group: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // 3. Map them by friend ID to consolidate multiple shared groups
  const friendsMap: Record<string, FriendInfo> = {};

  groupMembers.forEach((member) => {
    const u = member.user;
    if (!friendsMap[u.id]) {
      friendsMap[u.id] = {
        id: u.id,
        username: u.username,
        name: u.name,
        sharedGroups: [member.group.name],
      };
    } else {
      if (!friendsMap[u.id].sharedGroups.includes(member.group.name)) {
        friendsMap[u.id].sharedGroups.push(member.group.name);
      }
    }
  });

  return Object.values(friendsMap);
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
        },
      },
    },
  });

  return userGroups.map((g) => g.group);
}
