"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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
