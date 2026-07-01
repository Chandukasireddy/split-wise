import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ArrowLeft, Activity } from "lucide-react";
import ActivitiesClient from "@/components/ActivitiesClient";

export const revalidate = 60;

export default async function ActivitiesPage() {
  const session = await getCurrentUser();
  if (!session) return null;

  const userGroupMember = await db.groupMember.findMany({
    where: { userId: session.userId },
    select: { groupId: true },
  });
  const groupIds = userGroupMember.map((ug) => ug.groupId);

  const logs = await db.activityLog.findMany({
    where: {
      OR: [{ userId: session.userId }, { groupId: { in: groupIds } }],
    },
    include: { user: { select: { name: true, username: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div style={styles.page} className="animate-fade-in">
      <Link href="/dashboard" style={styles.back}>
        <ArrowLeft size={15} />
        Dashboard
      </Link>

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <Activity size={20} color="var(--primary)" />
          </div>
          <div>
            <h1 style={styles.title}>Activity Log</h1>
            <p style={styles.subtitle}>{logs.length} entries across all your groups</p>
          </div>
        </div>
      </div>

      <ActivitiesClient logs={logs} currentUserId={session.userId} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: "680px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    width: "100%",
  },
  back: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    fontWeight: 500,
    width: "fit-content",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "0.875rem" },
  headerIcon: {
    width: "44px", height: "44px", borderRadius: "12px",
    background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  title: { fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" },
  subtitle: { fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.1rem" },
};
