"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { joinGroup } from "@/app/actions/groupActions";
import { ArrowLeft, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface JoinGroupClientProps {
  groupId: string;
  groupName: string;
  description: string | null;
  creatorName: string;
  memberCount: number;
  isMember: boolean;
}

export default function JoinGroupClient({
  groupId,
  groupName,
  description,
  creatorName,
  memberCount,
  isMember,
}: JoinGroupClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setLoading(true);
    setError(null);
    const res = await joinGroup(groupId);
    if (res.success) {
      router.push(`/groups/${groupId}`);
      router.refresh();
    } else {
      setError(res.error || "Failed to join group.");
      setLoading(false);
    }
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      <Link href="/dashboard" style={styles.backLink}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="glass-card" style={styles.card}>
        {isMember ? (
          <div style={styles.content}>
            <div style={styles.iconContainer}>
              <CheckCircle2 size={48} color="var(--primary)" />
            </div>
            <h1 style={styles.title}>Already a Member</h1>
            <p style={styles.subtitle}>
              You are already a member of <strong>{groupName}</strong>. You can view all transactions and splits now.
            </p>
            <Link href={`/groups/${groupId}`} className="btn btn-primary" style={styles.btn}>
              Go to Group Dashboard
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div style={styles.content}>
            <span style={styles.badge}>Group Invitation</span>
            <h1 style={styles.title}>Join &quot;{groupName}&quot;?</h1>
            
            {description && (
              <p style={styles.desc}>{description}</p>
            )}

            <div style={styles.metaBox}>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Invited By:</span>
                <span style={styles.metaValue}>{creatorName}</span>
              </div>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Current Members:</span>
                <span style={styles.metaValue}>{memberCount} member{memberCount !== 1 ? "s" : ""}</span>
              </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button
              onClick={handleJoin}
              disabled={loading}
              className="btn btn-primary"
              style={styles.btn}
            >
              {loading ? "Joining Group..." : "Accept Invite & Join Group"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "500px",
    margin: "4rem auto",
    padding: "0 1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    width: "100%",
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "var(--text-muted)",
    textDecoration: "none",
    fontSize: "0.9rem",
    alignSelf: "flex-start",
  },
  card: {
    padding: "2.5rem 2rem",
    textAlign: "center",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.5rem",
  },
  iconContainer: {
    background: "rgba(99, 102, 241, 0.1)",
    padding: "1rem",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    background: "rgba(99, 102, 241, 0.15)",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    color: "var(--primary)",
    padding: "0.25rem 0.75rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "var(--text)",
    margin: 0,
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "var(--text-muted)",
    lineHeight: 1.5,
    margin: 0,
  },
  desc: {
    fontSize: "0.9rem",
    color: "var(--text-muted)",
    background: "rgba(0, 0, 0, )",
    border: "1px solid rgba(0, 0, 0, )",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    width: "100%",
    textAlign: "left",
    lineHeight: 1.4,
    margin: 0,
  },
  metaBox: {
    background: "rgba(0, 0, 0, )",
    border: "1px solid rgba(0, 0, 0, )",
    borderRadius: "0.5rem",
    width: "100%",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.85rem",
  },
  metaLabel: {
    color: "var(--text-muted)",
  },
  metaValue: {
    color: "var(--text)",
    fontWeight: 600,
  },
  btn: {
    width: "100%",
    padding: "0.85rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    marginTop: "0.5rem",
  },
  error: {
    color: "var(--owes)",
    fontSize: "0.85rem",
    background: "rgba(244, 63, 94, 0.1)",
    border: "1px solid rgba(244, 63, 94, 0.2)",
    padding: "0.5rem",
    borderRadius: "0.375rem",
    width: "100%",
  },
};
