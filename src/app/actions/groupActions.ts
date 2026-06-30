"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export interface GroupActionResult {
  success: boolean;
  groupId?: string;
  error?: string;
}

export interface UserSearchResult {
  id: string;
  name: string;
  username: string;
}

/**
 * Search for users in the database by username (case-insensitive)
 * Used to add friends to a group.
 */
export async function searchUsers(
  query: string
): Promise<UserSearchResult[]> {
  const session = await getCurrentUser();
  if (!session) return [];

  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery || trimmedQuery.length < 2) return [];

  try {
    const users = await db.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: trimmedQuery } },
              { name: { contains: trimmedQuery } },
            ],
          },
          // Exclude current user from search
          { id: { not: session.userId } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
      },
      take: 5,
    });
    
    return users;
  } catch (err) {
    console.error("Search users error:", err);
    return [];
  }
}

/**
 * Server action to create a new group and add initial members.
 */
export async function createGroup(
  name: string,
  description: string,
  memberIds: string[],
  defaultCurrency: string = "EUR"
): Promise<GroupActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "Group name is required." };
  }

  try {
    // Start transaction to create group and add members
    const result = await db.$transaction(async (tx) => {
      // 1. Create group
      const group = await tx.group.create({
        data: {
          name: trimmedName,
          description: description.trim() || null,
          defaultCurrency: defaultCurrency,
          createdById: session.userId,
        },
      });

      // 2. Add creator as member
      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: session.userId,
        },
      });

      // 3. Add other members
      const uniqueMemberIds = Array.from(new Set(memberIds)).filter(
        (id) => id !== session.userId
      );
      
      if (uniqueMemberIds.length > 0) {
        await tx.groupMember.createMany({
          data: uniqueMemberIds.map((id) => ({
            groupId: group.id,
            userId: id,
          })),
        });
      }

      // 4. Log activity
      await tx.activityLog.create({
        data: {
          userId: session.userId,
          groupId: group.id,
          description: `created the group "${trimmedName}"`,
        },
      });

      return group;
    });

    return { success: true, groupId: result.id };
  } catch (err) {
    console.error("Create group error:", err);
    return { success: false, error: "Failed to create group." };
  }
}

/**
 * Server action to add new members to an existing group.
 */
export async function addMembersToGroup(
  groupId: string,
  memberIds: string[]
): Promise<GroupActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  if (!groupId) {
    return { success: false, error: "Group ID is required." };
  }

  if (memberIds.length === 0) {
    return { success: false, error: "Please select at least one member to add." };
  }

  try {
    // 1. Check if group exists and if requesting user is currently a member
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      return { success: false, error: "Group not found." };
    }

    const isMember = group.members.some((m) => m.userId === session.userId);
    if (!isMember) {
      return { success: false, error: "You are not authorized to add members to this group." };
    }

    // 2. Filter out user IDs that are already group members
    const existingMemberIds = new Set(group.members.map((m) => m.userId));
    const newMemberIds = Array.from(new Set(memberIds)).filter(
      (id) => !existingMemberIds.has(id)
    );

    if (newMemberIds.length === 0) {
      return { success: false, error: "All selected users are already members of this group." };
    }

    // 3. Add members and log activity inside a transaction
    await db.$transaction(async (tx) => {
      // Create group members
      await tx.groupMember.createMany({
        data: newMemberIds.map((id) => ({
          groupId,
          userId: id,
        })),
      });

      // Fetch user names of the new members for the activity log
      const newUsers = await tx.user.findMany({
        where: { id: { in: newMemberIds } },
        select: { name: true },
      });
      const namesList = newUsers.map((u) => u.name).join(", ");

      // Create activity log
      await tx.activityLog.create({
        data: {
          userId: session.userId,
          groupId,
          description: `added ${namesList} to the group`,
        },
      });
    });

    return { success: true };
  } catch (err) {
    console.error("Add members to group error:", err);
    return { success: false, error: "Failed to add members to the group." };
  }
}

/**
 * Server action to delete a group and all its data.
 */
export async function deleteGroup(groupId: string): Promise<GroupActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized. Please log in." };

  try {
    const group = await db.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, createdById: true },
    });

    if (!group) return { success: false, error: "Group not found." };
    if (group.createdById !== session.userId)
      return { success: false, error: "Only the group creator can delete this group." };

    await db.group.delete({ where: { id: groupId } });

    return { success: true };
  } catch (err) {
    console.error("Delete group error:", err);
    return { success: false, error: "Failed to delete group." };
  }
}

/**
 * Server action to join a group using an invite link.
 */
export async function joinGroup(groupId: string): Promise<GroupActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  if (!groupId) {
    return { success: false, error: "Group ID is required." };
  }

  try {
    // 1. Verify group exists
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) {
      return { success: false, error: "Group not found." };
    }

    // 2. Check if user is already a member
    const isAlreadyMember = group.members.some((m) => m.userId === session.userId);
    if (isAlreadyMember) {
      return { success: true, groupId: group.id }; // Idempotent success
    }

    // 3. Add user as a member and log activity
    await db.$transaction(async (tx) => {
      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: session.userId,
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: session.userId,
          groupId: group.id,
          description: "joined the group via invite link",
        },
      });
    });

    return { success: true, groupId: group.id };
  } catch (err) {
    console.error("Join group error:", err);
    return { success: false, error: "Failed to join the group." };
  }
}
