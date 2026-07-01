import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/actions/authActions";
import { Wallet, LogOut, Settings } from "lucide-react";
import PWAInstallButton from "@/components/PWAInstallButton";
import BottomNav from "@/components/BottomNav";
import NavLinks from "@/components/NavLinks";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();

  if (!session) {
    redirect("/login");
  }

  const displayName = session.username;

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
              <Wallet size={20} color="#e5a93b" />
            </div>
            <span style={styles.brandText}>SplitEasy</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="desktop-only">
            <NavLinks />
          </div>

          {/* Right-side: PWA button + Profile + Desktop Logout */}
          <div style={styles.userSection}>
            <PWAInstallButton />

            <Link href="/profile" className="desktop-only" style={styles.profileBadge}>
              <span style={styles.avatar}>
                {displayName.charAt(0).toUpperCase()}
              </span>
              <span className="profile-username" style={styles.userName}>
                {displayName}
              </span>
              <Settings size={14} color="var(--text-muted)" />
            </Link>

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

      {/* Mobile Bottom Nav (Client Component — handles Profile popup + logout) */}
      <BottomNav displayName={displayName} />
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
    background: "var(--surface)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(0, 0, 0, 0.07)",
    position: "sticky",
    top: 0,
    zIndex: 600,
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
    background: "rgba(229, 169, 59, 0.15)",
    padding: "0.35rem",
    borderRadius: "8px",
    border: "1px solid rgba(229, 169, 59, 0.25)",
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
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  profileBadge: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    background: "rgba(0, 0, 0, 0.04)",
    padding: "0.35rem 0.75rem",
    borderRadius: "20px",
    border: "1px solid rgba(0, 0, 0, 0.07)",
    textDecoration: "none",
    transition: "background 0.15s",
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
  logoutText: {},
  mainContent: {
    flex: 1,
    paddingTop: "2rem",
    paddingBottom: "5rem",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
};
