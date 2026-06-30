import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUserOverallBalances } from "@/lib/balances";
import { db } from "@/lib/db";
import { 
  Users, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Activity, 
  ChevronRight,
  Sparkles
} from "lucide-react";

export const revalidate = 0; // Disable server cache to ensure real-time balance calculations

export default async function DashboardPage() {
  const session = await getCurrentUser();
  if (!session) return null;

  // Fetch balances and active groups
  const overall = await getUserOverallBalances(session.userId);

  // Fetch user groups to filter activity log
  const userGroupMember = await db.groupMember.findMany({
    where: { userId: session.userId },
    select: { groupId: true },
  });
  const groupIds = userGroupMember.map((ug) => ug.groupId);

  // Fetch recent activity logs (either user's actions or actions inside their groups)
  const recentActivities = await db.activityLog.findMany({
    where: {
      OR: [
        { userId: session.userId },
        { groupId: { in: groupIds } },
      ],
    },
    include: {
      user: {
        select: { name: true, username: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Currencies formatting helper
  function formatCurrency(amount: number, currency: string = "EUR") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  // Check if user has any balances at all
  const hasOwed = Object.keys(overall.totalOwed).length > 0;
  const hasOwes = Object.keys(overall.totalOwes).length > 0;

  return (
    <div style={styles.dashboardContainer} className="animate-fade-in">
      {/* Welcome Header */}
      <div style={styles.welcomeHeader}>
        <div>
          <h1 className="page-title" style={styles.welcomeTitle}>Dashboard</h1>
          <p style={styles.welcomeSubtitle}>Keep track of shared expenses, simplified debts, and settlements.</p>
        </div>
        <Link href="/groups/new" className="btn btn-primary" style={styles.createBtn}>
          <Plus size={18} />
          Create a Group
        </Link>
      </div>

      {/* Balance Summary Cards */}
      <div style={styles.balanceGrid}>
        {/* Total You Are Owed */}
        <div className="glass-card" style={styles.balanceCard}>
          <div style={styles.balanceIconContainerOwed}>
            <ArrowUpRight size={24} color="var(--owed)" />
          </div>
          <div>
            <span style={styles.balanceLabel}>You are owed</span>
            <div style={styles.balanceAmounts}>
              {hasOwed ? (
                Object.entries(overall.totalOwed).map(([curr, amt]) => (
                  <div key={curr} className="balance-value" style={{ color: "var(--owed)", fontWeight: 700 }}>
                    {formatCurrency(amt, curr)}
                  </div>
                ))
              ) : (
                <div className="balance-value" style={{ color: "var(--text-secondary)", fontWeight: 700 }}>$0.00</div>
              )}
            </div>
          </div>
        </div>

        {/* Total You Owe */}
        <div className="glass-card" style={styles.balanceCard}>
          <div style={styles.balanceIconContainerOwes}>
            <ArrowDownLeft size={24} color="var(--owes)" />
          </div>
          <div>
            <span style={styles.balanceLabel}>You owe</span>
            <div style={styles.balanceAmounts}>
              {hasOwes ? (
                Object.entries(overall.totalOwes).map(([curr, amt]) => (
                  <div key={curr} className="balance-value" style={{ color: "var(--owes)", fontWeight: 700 }}>
                    {formatCurrency(amt, curr)}
                  </div>
                ))
              ) : (
                <div className="balance-value" style={{ color: "var(--text-secondary)", fontWeight: 700 }}>$0.00</div>
              )}
            </div>
          </div>
        </div>

        {/* Net Balance Summary */}
        <div className="glass-card" style={{ ...styles.balanceCard, background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)" }}>
          <div style={styles.balanceIconContainerNet}>
            <Sparkles size={24} color="var(--primary)" />
          </div>
          <div>
            <span style={styles.balanceLabel}>Net balance status</span>
            <div style={styles.balanceAmounts}>
              {Object.keys(overall.netBalances).length > 0 ? (
                Object.entries(overall.netBalances).map(([curr, amt]) => {
                  const isOwed = amt > 0;
                  const isOwes = amt < 0;
                  const color = isOwed ? "var(--owed)" : isOwes ? "var(--owes)" : "var(--text-secondary)";
                  return (
                    <div key={curr} className="balance-value" style={{ color, fontWeight: 700 }}>
                      {amt === 0 ? "$0.00 (Settled)" : formatCurrency(amt, curr)}
                    </div>
                  );
                })
              ) : (
                <div className="balance-value" style={{ color: "var(--text-secondary)", fontWeight: 700 }}>$0.00 (Settled)</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Groups & Activity */}
      <div style={styles.mainGrid} className="responsive-grid-2-1">
        {/* Groups Column */}
        <div style={styles.groupsColumn}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              <Users size={20} color="var(--primary)" />
              Your Groups
            </h2>
            <span style={styles.sectionCount}>{overall.groups.length} active</span>
          </div>

          <div style={styles.groupList}>
            {overall.groups.length === 0 ? (
              <div className="glass-card" style={styles.emptyCard}>
                <Users size={48} color="var(--text-muted)" style={{ marginBottom: "1rem" }} />
                <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>No groups yet</h3>
                <p style={{ fontSize: "0.875rem", marginBottom: "1.5rem", maxWidth: "300px" }}>
                  Create a group to start splitting bills and expenses with friends.
                </p>
                <Link href="/groups/new" className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
                  <Plus size={16} /> Create Group
                </Link>
              </div>
            ) : (
              overall.groups.map((group) => {
                // Determine group status text
                const currencies = Object.keys(group.balances);
                const hasBalances = currencies.length > 0 && currencies.some(curr => group.balances[curr] !== 0);

                return (
                  <Link
                    key={group.id}
                    href={`/groups/${group.id}`}
                    className="glass-card"
                    style={styles.groupCard}
                  >
                    <div style={styles.groupCardLeft}>
                      <div style={styles.groupAvatar}>
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 style={styles.groupName}>{group.name}</h3>
                        <p style={styles.groupDesc}>
                          {group.description || "No description"}
                        </p>
                      </div>
                    </div>

                    <div style={styles.groupCardRight}>
                      <div style={styles.groupBalanceInfo}>
                        {!hasBalances ? (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>settled up</span>
                        ) : (
                          Object.entries(group.balances).map(([curr, bal]) => {
                            if (bal === 0) return null;
                            const isOwed = bal > 0;
                            return (
                              <div key={curr} style={styles.groupBalanceLine}>
                                <span style={styles.balanceStatusLabel}>
                                  {isOwed ? "you are owed" : "you owe"}
                                </span>
                                <span style={{
                                  fontWeight: 600,
                                  color: isOwed ? "var(--owed)" : "var(--owes)",
                                  fontSize: "0.95rem"
                                }}>
                                  {formatCurrency(Math.abs(bal), curr)}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <ChevronRight size={18} color="var(--text-muted)" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Activity Log Snapshot Column */}
        <div style={styles.activityColumn}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              <Activity size={20} color="var(--secondary)" />
              Recent Activity
            </h2>
            <Link href="/activities" style={styles.viewAllLink}>
              View all
            </Link>
          </div>

          <div className="glass-card" style={styles.activityCard}>
            {recentActivities.length === 0 ? (
              <div style={styles.emptyActivity}>
                <Activity size={32} color="var(--text-muted)" style={{ marginBottom: "0.5rem" }} />
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No recent activity to show.</p>
              </div>
            ) : (
              <div style={styles.activityList}>
                {recentActivities.map((log, index) => (
                  <div key={log.id} style={{
                    ...styles.activityItem,
                    borderBottom: index === recentActivities.length - 1 ? "none" : "1px solid var(--border-light)"
                  }}>
                    <div style={styles.activityAvatar}>
                      {log.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={styles.activityContent}>
                      <span style={styles.activityText}>
                      <strong style={{ color: "var(--text-primary)" }}>{log.user.name}</strong> {log.description}
                      </span>
                      <span style={styles.activityTime}>
                        {new Date(log.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  dashboardContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  welcomeHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "1rem",
  },
  welcomeTitle: {
    fontSize: "1.25rem",
    fontWeight: 800,
    color: "var(--text-primary)",
  },
  welcomeSubtitle: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    marginTop: "0.25rem",
  },
  createBtn: {
    padding: "0.6rem 1.2rem",
    fontSize: "0.9rem",
  },
  balanceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "1.25rem",
  },
  balanceCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1.25rem",
    padding: "1.5rem",
  },
  balanceIconContainerOwed: {
    background: "rgba(16, 185, 129, 0.1)",
    padding: "0.75rem",
    borderRadius: "12px",
    border: "1px solid rgba(16, 185, 129, 0.2)",
  },
  balanceIconContainerOwes: {
    background: "rgba(244, 63, 94, 0.1)",
    padding: "0.75rem",
    borderRadius: "12px",
    border: "1px solid rgba(244, 63, 94, 0.2)",
  },
  balanceIconContainerNet: {
    background: "rgba(16, 185, 129, 0.15)",
    padding: "0.75rem",
    borderRadius: "12px",
    border: "1px solid rgba(16, 185, 129, 0.25)",
  },
  balanceLabel: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: 600,
    display: "block",
    marginBottom: "0.5rem",
  },
  balanceAmounts: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  neutralBalance: {
    color: "var(--text-secondary)",
    fontWeight: 700,
    fontSize: "1.25rem",
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "2rem",
  },
  groupsColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  activityColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: "1.25rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  sectionCount: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    background: "rgba(16, 185, 129, 0.08)",
    padding: "0.2rem 0.6rem",
    borderRadius: "20px",
  },
  viewAllLink: {
    fontSize: "0.85rem",
    color: "var(--primary)",
    fontWeight: 600,
  },
  groupList: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  emptyCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 1.5rem",
    textAlign: "center",
  },
  groupCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    textDecoration: "none",
    cursor: "pointer",
    padding: "1.25rem",
  },
  groupCardLeft: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  groupAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "1.25rem",
    color: "#fff",
    boxShadow: "0 4px 10px rgba(16, 185, 129, 0.2)",
  },
  groupName: {
    fontSize: "1.05rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  groupDesc: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginTop: "0.15rem",
  },
  groupCardRight: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
  },
  groupBalanceInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.25rem",
  },
  groupBalanceLine: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  balanceStatusLabel: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  activityCard: {
    padding: "1.25rem",
  },
  emptyActivity: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
    textAlign: "center",
  },
  activityList: {
    display: "flex",
    flexDirection: "column",
  },
  activityItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    padding: "0.85rem 0",
  },
  activityAvatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    border: "1px solid var(--border-light)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    flexShrink: 0,
  },
  activityContent: {
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
  },
  activityText: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
  },
  activityTime: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
};
