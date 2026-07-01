import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGroupCalculatedBalances } from "@/lib/balances";
import GroupDetailsClient from "./GroupDetailsClient";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupDetailsPage({ params }: PageProps) {
  const session = await getCurrentUser();
  if (!session) {
    redirect("/login");
  }

  // Resolve params promise in Next.js 15+ standard
  const resolvedParams = await params;
  const groupId = resolvedParams.id;

  // Verify group exists and user is a member
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, username: true },
          },
        },
      },
      expenses: {
        include: {
          splits: {
            include: {
              user: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { date: "desc" },
      },
      payments: {
        include: {
          payer: { select: { id: true, name: true } },
          payee: { select: { id: true, name: true } },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!group) {
    redirect("/dashboard");
  }

  const isMember = group.members.some((m) => m.userId === session.userId);
  if (!isMember) {
    redirect("/dashboard");
  }

  // Calculate balances & simplified debts
  const calculatedBalances = await getGroupCalculatedBalances(groupId);

  if (!calculatedBalances) {
    redirect("/dashboard");
  }

  return (
    <GroupDetailsClient
      currentUser={session}
      group={group}
      balances={calculatedBalances}
    />
  );
}
