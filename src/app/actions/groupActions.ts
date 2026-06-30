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
  defaultCurrency: string = "USD"
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
