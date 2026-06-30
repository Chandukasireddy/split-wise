"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Users, Activity, User, LogOut, X } from "lucide-react";
import { signOut } from "@/app/actions/authActions";

interface BottomNavProps {
  displayName: string;
}

export default function BottomNav({ displayName }: BottomNavProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  async function handleLogout() {
    await signOut();
    window.location.href = "/login";
  }

  return (
    <>
      {/* Bottom Nav Bar for Mobile Devices */}
      <nav className="bottom-nav">
        <Link href="/dashboard" className="bottom-nav-link">
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        
        <Link href="/friends" className="bottom-nav-link">
          <Users size={20} />
          <span>Friends</span>
        </Link>

        <Link href="/activities" className="bottom-nav-link">
          <Activity size={20} />
          <span>Activity</span>
        </Link>

        <button 
          onClick={() => setShowProfileMenu(!showProfileMenu)} 
          className="bottom-nav-btn"
          style={showProfileMenu ? { color: "var(--primary)" } : {}}
        >
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>

      {/* Floating Profile Modal Menu (Toggled on bottom right click) */}
      {showProfileMenu && (
        <div style={styles.modalOverlay} onClick={() => setShowProfileMenu(false)}>
          <div 
            style={styles.modalCard} 
            className="glass-card animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Your Profile</h3>
              <button style={styles.closeBtn} onClick={() => setShowProfileMenu(false)} title="Close">
                <X size={18} />
              </button>
            </div>
            
            <div style={styles.profileInfo}>
              <span style={styles.avatar}>
                {displayName.charAt(0).toUpperCase()}
              </span>
              <div style={styles.profileText}>
                <div style={styles.profileName}>{displayName}</div>
                <div style={styles.profileRole}>Active Member</div>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="btn btn-danger"
              style={styles.logoutBtn}
            >
              <LogOut size={16} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "flex-end", // Slide up from bottom on mobile
    justifyContent: "center",
    zIndex: 2000,
    paddingBottom: "80px", // Align right above bottom nav bar
  },
  modalCard: {
    width: "90%",
    maxWidth: "340px",
    padding: "1.25rem",
    background: "var(--surface)",
    border: "1px solid var(--border-light)",
    borderRadius: "16px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "0.25rem",
  },
  profileInfo: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "0.5rem 0",
  },
  avatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "var(--primary)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "1.25rem",
  },
  profileText: {
    display: "flex",
    flexDirection: "column",
  },
  profileName: {
    fontWeight: 700,
    fontSize: "1rem",
    color: "var(--text-primary)",
  },
  profileRole: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginTop: "0.15rem",
  },
  logoutBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  },
};
