import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPersonalSpendingData } from "@/app/actions/spendingActions";
import SpendingClient from "@/components/SpendingClient";

export const metadata = {
  title: "Personal Spending - SplitEasy",
  description: "Track your actual consumption, cash flow, and shared expenses reconciliation.",
};

export const revalidate = 0;

export default async function SpendingPage() {
  const session = await getCurrentUser();
  if (!session) {
    redirect("/login");
  }

  const summary = await getPersonalSpendingData();
  if (!summary) {
    redirect("/login");
  }

  return <SpendingClient summary={summary} />;
}

