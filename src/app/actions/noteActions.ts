"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export interface NoteActionResult {
  success: boolean;
  error?: string;
  noteId?: string;
}

export interface FriendNoteItem {
  id: string;
  friendName: string;
  matchedUser?: { id: string; name: string; username: string } | null;
  type: "LENT" | "BORROWED";
  amount: number;
  currency: string;
  category: string;
  date: string;
  description: string | null;
  isSettled: boolean;
  createdAt: string;
}

export interface FriendNotesData {
  notes: FriendNoteItem[];
  totalsByCurrency: Record<
    string,
    {
      lent: number;     // Friend owes current user
      borrowed: number; // Current user owes friend
      net: number;      // lent - borrowed
    }
  >;
  uniqueFriendNames: string[];
}

/**
 * Fetch all friend notes for the currently authenticated user
 */
export async function getFriendNotes(): Promise<FriendNotesData> {
  const session = await getCurrentUser();
  if (!session) {
    return {
      notes: [],
      totalsByCurrency: {},
      uniqueFriendNames: [],
    };
  }

  const rawNotes = await db.friendNote.findMany({
    where: { userId: session.userId },
    orderBy: [{ isSettled: "asc" }, { date: "desc" }, { createdAt: "desc" }],
  });

  const totalsByCurrency: Record<
    string,
    { lent: number; borrowed: number; net: number }
  > = {};
  const namesSet = new Set<string>();

  rawNotes.forEach((n) => {
    namesSet.add(n.friendName);
    if (!n.isSettled) {
      if (!totalsByCurrency[n.currency]) {
        totalsByCurrency[n.currency] = { lent: 0, borrowed: 0, net: 0 };
      }
      if (n.type === "LENT") {
        totalsByCurrency[n.currency].lent = parseFloat(
          (totalsByCurrency[n.currency].lent + n.amount).toFixed(2)
        );
      } else {
        totalsByCurrency[n.currency].borrowed = parseFloat(
          (totalsByCurrency[n.currency].borrowed + n.amount).toFixed(2)
        );
      }
      totalsByCurrency[n.currency].net = parseFloat(
        (
          totalsByCurrency[n.currency].lent -
          totalsByCurrency[n.currency].borrowed
        ).toFixed(2)
      );
    }
  });

  // Find registered users matching the friend names (case-insensitive)
  const namesArray = Array.from(namesSet);
  const matchedUsers = namesArray.length > 0
    ? await db.user.findMany({
        where: {
          AND: [
            {
              OR: [
                { username: { in: namesArray.map((n) => n.toLowerCase().replace(/^@/, "")) } },
                { name: { in: namesArray, mode: "insensitive" } },
              ],
            },
            { id: { not: session.userId } },
          ],
        },
        select: { id: true, name: true, username: true },
      })
    : [];

  const userMapByName = new Map<string, { id: string; name: string; username: string }>();
  for (const u of matchedUsers) {
    userMapByName.set(u.username.toLowerCase(), u);
    userMapByName.set(u.name.toLowerCase(), u);
  }

  const notes: FriendNoteItem[] = rawNotes.map((n) => {
    const cleanKey = n.friendName.toLowerCase().replace(/^@/, "");
    const matched = userMapByName.get(cleanKey) || userMapByName.get(n.friendName.toLowerCase()) || null;

    return {
      id: n.id,
      friendName: n.friendName,
      matchedUser: matched,
      type: n.type as "LENT" | "BORROWED",
      amount: n.amount,
      currency: n.currency,
      category: n.category,
      date: n.date.toISOString(),
      description: n.description,
      isSettled: n.isSettled,
      createdAt: n.createdAt.toISOString(),
    };
  });

  return {
    notes,
    totalsByCurrency,
    uniqueFriendNames: Array.from(namesSet).sort(),
  };
}

export interface AddNoteInput {
  friendName: string;
  type: "LENT" | "BORROWED";
  amount: number;
  currency: string;
  category?: string;
  date?: string;
  description?: string;
}

/**
 * Create a new note / IOU for an unregistered friend
 */
export async function addFriendNote(input: AddNoteInput): Promise<NoteActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const name = input.friendName.trim();
  if (!name) {
    return { success: false, error: "Friend name is required." };
  }

  if (input.amount <= 0) {
    return { success: false, error: "Amount must be greater than 0." };
  }

  let noteDate = new Date();
  if (input.date) {
    const parsed = new Date(input.date);
    if (!isNaN(parsed.getTime())) {
      noteDate = parsed;
    }
  }

  try {
    const created = await db.friendNote.create({
      data: {
        userId: session.userId,
        friendName: name,
        type: input.type,
        amount: parseFloat(input.amount.toFixed(2)),
        currency: input.currency || "USD",
        category: input.category || "General",
        date: noteDate,
        description: input.description?.trim() || null,
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        description: `added a personal note: ${
          input.type === "LENT" ? `lent to ${name}` : `borrowed from ${name}`
        } ${input.currency || "USD"} ${input.amount.toFixed(2)}`,
      },
    });

    revalidatePath("/friends");
    revalidatePath("/dashboard");
    revalidatePath("/activities");

    return { success: true, noteId: created.id };
  } catch (err) {
    console.error("Error creating friend note:", err);
    return { success: false, error: "Failed to create note." };
  }
}

/**
 * Toggle settled status of a note
 */
export async function toggleSettleFriendNote(
  noteId: string
): Promise<NoteActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const existing = await db.friendNote.findUnique({
      where: { id: noteId },
    });

    if (!existing || existing.userId !== session.userId) {
      return { success: false, error: "Note not found." };
    }

    const nextSettled = !existing.isSettled;

    await db.friendNote.update({
      where: { id: noteId },
      data: { isSettled: nextSettled },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        description: nextSettled
          ? `settled personal note with ${existing.friendName} (${existing.currency} ${existing.amount.toFixed(2)})`
          : `marked personal note with ${existing.friendName} as unsettled`,
      },
    });

    revalidatePath("/friends");
    revalidatePath("/dashboard");
    revalidatePath("/activities");

    return { success: true };
  } catch (err) {
    console.error("Error settling friend note:", err);
    return { success: false, error: "Failed to update note status." };
  }
}

/**
 * Delete a friend note
 */
export async function deleteFriendNote(noteId: string): Promise<NoteActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const existing = await db.friendNote.findUnique({
      where: { id: noteId },
    });

    if (!existing || existing.userId !== session.userId) {
      return { success: false, error: "Note not found." };
    }

    await db.friendNote.delete({
      where: { id: noteId },
    });

    revalidatePath("/friends");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("Error deleting friend note:", err);
    return { success: false, error: "Failed to delete note." };
  }
}

/**
 * Convert / link an unregistered friend note into a real direct 1-on-1 SplitEasy expense
 * with a registered user once they join the app.
 */
export async function linkNoteToRegisteredUser(
  noteId: string,
  registeredUserId: string
): Promise<NoteActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  if (session.userId === registeredUserId) {
    return { success: false, error: "You cannot link a note to yourself." };
  }

  try {
    const note = await db.friendNote.findUnique({
      where: { id: noteId },
    });

    if (!note || note.userId !== session.userId) {
      return { success: false, error: "Note not found." };
    }

    const registeredUser = await db.user.findUnique({
      where: { id: registeredUserId },
      select: { id: true, name: true, username: true },
    });

    if (!registeredUser) {
      return { success: false, error: "Registered user not found." };
    }

    await db.$transaction(async (tx) => {
      const description =
        note.description?.trim() ||
        (note.type === "LENT"
          ? `Lent to ${note.friendName}`
          : `Borrowed from ${note.friendName}`);

      if (note.type === "LENT") {
        // User lent money to friend => User paid, registered user owes full amount
        const expense = await tx.expense.create({
          data: {
            description,
            amount: note.amount,
            category: note.category,
            currency: note.currency,
            groupId: null, // Direct 1-on-1
            payerId: session.userId,
            splitType: "UNEQUAL",
            conversionRate: 1.0,
            convertedAmount: note.amount,
            createdById: session.userId,
            date: note.date,
          },
        });

        await tx.expenseSplit.createMany({
          data: [
            {
              expenseId: expense.id,
              userId: registeredUser.id,
              amount: note.amount, // registered user owes full amount
            },
            {
              expenseId: expense.id,
              userId: session.userId,
              amount: 0,
            },
          ],
        });
      } else {
        // User borrowed money from friend => Registered user paid, current user owes full amount
        const expense = await tx.expense.create({
          data: {
            description,
            amount: note.amount,
            category: note.category,
            currency: note.currency,
            groupId: null, // Direct 1-on-1
            payerId: registeredUser.id,
            splitType: "UNEQUAL",
            conversionRate: 1.0,
            convertedAmount: note.amount,
            createdById: session.userId,
            date: note.date,
          },
        });

        await tx.expenseSplit.createMany({
          data: [
            {
              expenseId: expense.id,
              userId: session.userId,
              amount: note.amount, // current user owes full amount
            },
            {
              expenseId: expense.id,
              userId: registeredUser.id,
              amount: 0,
            },
          ],
        });
      }

      // Delete the offline note now that it has been migrated to real 1-on-1 expense
      await tx.friendNote.delete({
        where: { id: noteId },
      });

      await tx.activityLog.create({
        data: {
          userId: session.userId,
          description: `linked offline note for "${note.friendName}" to @${registeredUser.username}`,
        },
      });
    });

    revalidatePath("/friends");
    revalidatePath("/dashboard");
    revalidatePath("/activities");

    return { success: true };
  } catch (err) {
    console.error("Error linking note to registered user:", err);
    return { success: false, error: "Failed to link note to registered user." };
  }
}

/**
 * Toggle settled status of all notes for a specific friend name
 */
export async function settleAllNotesForFriend(
  friendName: string
): Promise<NoteActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const trimmed = friendName.trim();
    const notes = await db.friendNote.findMany({
      where: {
        userId: session.userId,
        friendName: { equals: trimmed, mode: "insensitive" },
      },
    });

    if (notes.length === 0) {
      return { success: false, error: "No notes found for this person." };
    }

    const hasUnsettled = notes.some((n) => !n.isSettled);
    const nextSettled = hasUnsettled;

    await db.friendNote.updateMany({
      where: {
        userId: session.userId,
        friendName: { equals: trimmed, mode: "insensitive" },
      },
      data: { isSettled: nextSettled },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        description: nextSettled
          ? `settled all notes with ${friendName}`
          : `marked notes with ${friendName} as unsettled`,
      },
    });

    revalidatePath("/friends");
    revalidatePath("/dashboard");
    revalidatePath("/activities");

    return { success: true };
  } catch (err) {
    console.error("Error settling all notes for friend:", err);
    return { success: false, error: "Failed to settle notes." };
  }
}

/**
 * Delete all notes for a specific friend name
 */
export async function deleteAllNotesForFriend(
  friendName: string
): Promise<NoteActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const trimmed = friendName.trim();
    await db.friendNote.deleteMany({
      where: {
        userId: session.userId,
        friendName: { equals: trimmed, mode: "insensitive" },
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        description: `deleted personal notes for "${friendName}"`,
      },
    });

    revalidatePath("/friends");
    revalidatePath("/dashboard");
    revalidatePath("/activities");

    return { success: true };
  } catch (err) {
    console.error("Error deleting notes for friend:", err);
    return { success: false, error: "Failed to delete notes." };
  }
}

/**
 * Link and migrate all notes for a specific friend name to a registered user
 */
export async function linkAllNotesForFriend(
  friendName: string,
  registeredUserId: string
): Promise<NoteActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  if (session.userId === registeredUserId) {
    return { success: false, error: "You cannot link notes to yourself." };
  }

  try {
    const trimmed = friendName.trim();
    const notes = await db.friendNote.findMany({
      where: {
        userId: session.userId,
        friendName: { equals: trimmed, mode: "insensitive" },
      },
    });

    if (notes.length === 0) {
      return { success: false, error: "No notes found for this person." };
    }

    const registeredUser = await db.user.findUnique({
      where: { id: registeredUserId },
      select: { id: true, name: true, username: true },
    });

    if (!registeredUser) {
      return { success: false, error: "Registered user not found." };
    }

    await db.$transaction(async (tx) => {
      for (const note of notes) {
        const description =
          note.description?.trim() ||
          (note.type === "LENT"
            ? `Lent to ${note.friendName}`
            : `Borrowed from ${note.friendName}`);

        if (note.type === "LENT") {
          const expense = await tx.expense.create({
            data: {
              description,
              amount: note.amount,
              category: note.category,
              currency: note.currency,
              groupId: null,
              payerId: session.userId,
              splitType: "UNEQUAL",
              conversionRate: 1.0,
              convertedAmount: note.amount,
              createdById: session.userId,
              date: note.date,
            },
          });

          await tx.expenseSplit.createMany({
            data: [
              {
                expenseId: expense.id,
                userId: registeredUser.id,
                amount: note.amount,
              },
              {
                expenseId: expense.id,
                userId: session.userId,
                amount: 0,
              },
            ],
          });
        } else {
          const expense = await tx.expense.create({
            data: {
              description,
              amount: note.amount,
              category: note.category,
              currency: note.currency,
              groupId: null,
              payerId: registeredUser.id,
              splitType: "UNEQUAL",
              conversionRate: 1.0,
              convertedAmount: note.amount,
              createdById: session.userId,
              date: note.date,
            },
          });

          await tx.expenseSplit.createMany({
            data: [
              {
                expenseId: expense.id,
                userId: session.userId,
                amount: note.amount,
              },
              {
                expenseId: expense.id,
                userId: registeredUser.id,
                amount: 0,
              },
            ],
          });
        }
      }

      await tx.friendNote.deleteMany({
        where: {
          userId: session.userId,
          friendName: { equals: trimmed, mode: "insensitive" },
        },
      });

      await tx.activityLog.create({
        data: {
          userId: session.userId,
          description: `migrated personal notes for "${friendName}" to @${registeredUser.username}`,
        },
      });
    });

    revalidatePath("/friends");
    revalidatePath("/dashboard");
    revalidatePath("/activities");

    return { success: true };
  } catch (err) {
    console.error("Error migrating all notes for friend:", err);
    return { success: false, error: "Failed to migrate notes to registered user." };
  }
}

