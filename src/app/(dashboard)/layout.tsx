import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getAuthenticatedUser } from "@/lib/auth";
import { signOut } from "@/app/actions/authActions";
import { Wallet, LayoutDashboard, Activity, LogOut, Plus } from "lucide-react";
import PWAInstallButton from "@/components/PWAInstallButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();
  
  if (!session) {
    redirect("/login");
  }

  const user = await getAuthenticatedUser();
  const displayName = user?.name || session.username;

  async function handleLogout() {
    "use server";
    await signOut();
    redirect("/login");
  }

  return (
    <div style={styles.layoutWrapper}>
      {/* Top Navbar */}
      <nav style={styles.navbar}>
        <div className="container" style={styles.navContainer}>
          <Link href="/dashboard" style={styles.brand}>
            <div style={styles.logoBadge}>
              <Wallet size={20} color="#6366f1" />
            </div>
            <span style={styles.brandText}>SplitEasy</span>
          </Link>

          <div className="desktop-only" style={styles.navLinks}>
            <Link href="/dashboard" style={styles.navLink}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
            <Link href="/activities" style={styles.navLink}>
              <Activity size={18} />
              <span>Activity</span>
            </Link>
          </div>

          <div style={styles.userSection}>
            <PWAInstallButton />

            <div className="desktop-only" style={styles.profileBadge}>
              <span style={styles.avatar}>
                {displayName.charAt(0).toUpperCase()}
              </span>
              <span style={styles.userName}>{displayName}</span>
            </div>

            <form action={handleLogout} className="desktop-only">
              <button type="submit" className="btn btn-secondary" style={styles.logoutBtn} title="Sign Out">
                <LogOut size={16} />
                <span style={styles.logoutText}>Logout</span>
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="container" style={styles.mainContent}>
        {children}
      </main>

      {/* Bottom Nav Bar for Mobile Devices */}
      <nav className="bottom-nav">
        <Link href="/dashboard" className="bottom-nav-link">
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/groups/new" className="bottom-nav-link bottom-nav-center">
          <div className="bottom-nav-plus">
            <Plus size={24} color="#fff" />
          </div>
          <span>New Group</span>
        </Link>
        <Link href="/activities" className="bottom-nav-link">
          <Activity size={20} />
          <span>Activity</span>
        </Link>
        <form action={handleLogout} style={{ display: "contents" }}>
          <button type="submit" className="bottom-nav-btn">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </form>
      </nav>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layoutWrapper: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  navbar: {
    background: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(0, 0, 0, )",
    position: "sticky",
    top: 0,
    zIndex: 100,
    height: "64px",
    display: "flex",
    alignItems: "center",
  },
  navContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "100%",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    textDecoration: "none",
  },
  logoBadge: {
    background: "rgba(99, 102, 241, 0.15)",
    padding: "0.35rem",
    borderRadius: "8px",
    border: "1px solid rgba(99, 102, 241, 0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontWeight: 700,
    fontSize: "1.25rem",
    fontFamily: "var(--font-brand)",
    letterSpacing: "-0.03em",
    color: "var(--text-primary)",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "var(--text-secondary)",
    fontSize: "0.95rem",
    fontWeight: 500,
    padding: "0.5rem 0.75rem",
    borderRadius: "8px",
    transition: "all 0.2s ease",
  },
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  profileBadge: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    background: "rgba(0, 0, 0, )",
    padding: "0.35rem 0.75rem",
    borderRadius: "20px",
    border: "1px solid rgba(0, 0, 0, )",
  },
  avatar: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "var(--primary)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.8rem",
  },
  userName: {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "var(--text-primary)",
  },
  logoutBtn: {
    padding: "0.4rem 0.8rem",
    fontSize: "0.85rem",
    gap: "0.4rem",
  },
  logoutText: {
    // Hidden on very small screens, shown otherwise
  },
  mainContent: {
    flex: 1,
    paddingTop: "2rem",
    paddingBottom: "4rem",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
};
