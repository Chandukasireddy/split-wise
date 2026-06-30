"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateProfileName,
  updateUsername,
  updatePassword,
  getCurrentUserProfile,
} from "@/app/actions/userActions";
import { User, Lock, AtSign, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface Profile {
  id: string;
  name: string;
  username: string;
  createdAt: Date;
}

type Status = { type: "success" | "error"; message: string } | null;

function StatusMsg({ status }: { status: Status }) {
  if (!status) return null;
  const isOk = status.type === "success";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.5rem",
      padding: "0.65rem 1rem", borderRadius: "10px", fontSize: "0.875rem", fontWeight: 500,
      background: isOk ? "rgba(16,185,129,0.08)" : "rgba(244,63,94,0.08)",
      border: `1px solid ${isOk ? "rgba(16,185,129,0.25)" : "rgba(244,63,94,0.25)"}`,
      color: isOk ? "#065F46" : "#f43f5e",
    }}>
      {isOk ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {status.message}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  // Name section
  const [name, setName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameStatus, setNameStatus] = useState<Status>(null);

  // Username section
  const [username, setUsername] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<Status>(null);

  // Password section
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwStatus, setPwStatus] = useState<Status>(null);

  useEffect(() => {
    getCurrentUserProfile().then((p) => {
      if (p) {
        setProfile(p as Profile);
        setName(p.name);
        setUsername(p.username);
      }
    });
  }, []);

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameLoading(true);
    setNameStatus(null);
    const res = await updateProfileName(name);
    setNameStatus(res.success ? { type: "success", message: "Display name updated." } : { type: "error", message: res.error! });
    if (res.success) router.refresh();
    setNameLoading(false);
  }

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUsernameLoading(true);
    setUsernameStatus(null);
    const res = await updateUsername(username);
    setUsernameStatus(res.success ? { type: "success", message: "Username updated." } : { type: "error", message: res.error! });
    if (res.success) router.refresh();
    setUsernameLoading(false);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwStatus({ type: "error", message: "New passwords do not match." }); return; }
    setPwLoading(true);
    setPwStatus(null);
    const res = await updatePassword(currentPw, newPw);
    if (res.success) {
      setPwStatus({ type: "success", message: "Password changed successfully." });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } else {
      setPwStatus({ type: "error", message: res.error! });
    }
    setPwLoading(false);
  }

  if (!profile) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px" }}>
        <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div style={styles.page} className="animate-fade-in">
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Profile Settings</h1>
        <p style={styles.pageSubtitle}>Manage your account details and security.</p>
      </div>

      {/* Avatar Card */}
      <div className="glass-card" style={styles.avatarCard}>
        <div style={styles.avatarCircle}>
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={styles.avatarName}>{profile.name}</div>
          <div style={styles.avatarUsername}>@{profile.username}</div>
          <div style={styles.avatarSince}>
            Member since {new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      <div className="grid-2-cols">
        {/* Display Name */}
        <div className="glass-card" style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIconBox}><User size={18} color="var(--primary)" /></div>
            <div>
              <h2 style={styles.sectionTitle}>Display Name</h2>
              <p style={styles.sectionDesc}>Your full name shown to group members.</p>
            </div>
          </div>
          <form onSubmit={handleNameSubmit} style={styles.form}>
            <div style={styles.field}>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                placeholder="Your display name"
                required
                disabled={nameLoading}
              />
            </div>
            <StatusMsg status={nameStatus} />
            <button type="submit" disabled={nameLoading || name === profile.name} className="btn btn-primary" style={styles.saveBtn}>
              {nameLoading ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : "Save Name"}
            </button>
          </form>
        </div>

        {/* Username */}
        <div className="glass-card" style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIconBox}><AtSign size={18} color="var(--primary)" /></div>
            <div>
              <h2 style={styles.sectionTitle}>Username</h2>
              <p style={styles.sectionDesc}>Used to search and identify you in groups.</p>
            </div>
          </div>
          <form onSubmit={handleUsernameSubmit} style={styles.form}>
            <div style={styles.field}>
              <label className="form-label">Username</label>
              <div style={{ position: "relative" }}>
                <span style={styles.atPrefix}>@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="form-input"
                  style={{ paddingLeft: "1.75rem" }}
                  placeholder="yourname"
                  required
                  disabled={usernameLoading}
                />
              </div>
              <span style={styles.fieldHint}>3+ characters, letters, numbers and underscores only.</span>
            </div>
            <StatusMsg status={usernameStatus} />
            <button type="submit" disabled={usernameLoading || username === profile.username} className="btn btn-primary" style={styles.saveBtn}>
              {usernameLoading ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : "Save Username"}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="glass-card" style={{ ...styles.section, gridColumn: "1 / -1" }} data-full-width="true">
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIconBox}><Lock size={18} color="var(--primary)" /></div>
            <div>
              <h2 style={styles.sectionTitle}>Change Password</h2>
              <p style={styles.sectionDesc}>Use a strong password of at least 8 characters.</p>
            </div>
          </div>
          <form onSubmit={handlePasswordSubmit} className="grid-2-cols" style={{ gap: "1rem" }}>
            <div style={styles.field}>
              <label className="form-label">Current Password</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
                disabled={pwLoading}
              />
            </div>
            <div style={styles.field}>
              <label className="form-label">New Password</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
                disabled={pwLoading}
              />
            </div>
            <div style={styles.field}>
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
                disabled={pwLoading}
              />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <StatusMsg status={pwStatus} />
              <button type="submit" disabled={pwLoading || !currentPw || !newPw || !confirmPw} className="btn btn-primary" style={styles.saveBtn}>
                {pwLoading ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: "860px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "1.75rem",
    width: "100%",
  },
  pageHeader: { display: "flex", flexDirection: "column", gap: "0.25rem" },
  pageTitle: { fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" },
  pageSubtitle: { fontSize: "0.95rem", color: "var(--text-secondary)" },
  avatarCard: {
    padding: "1.25rem 1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    flexWrap: "wrap",
  },
  avatarCircle: {
    width: "64px", height: "64px", borderRadius: "50%",
    background: "var(--primary)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: "1.6rem", flexShrink: 0,
  },
  avatarName: { fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" },
  avatarUsername: { fontSize: "0.9rem", color: "var(--primary)", fontWeight: 600, marginTop: "0.15rem" },
  avatarSince: { fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" },
  section: { padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" },
  sectionHeader: { display: "flex", alignItems: "flex-start", gap: "0.875rem" },
  sectionIconBox: {
    width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
    background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.1rem" },
  sectionDesc: { fontSize: "0.82rem", color: "var(--text-secondary)" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  pwForm: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
  },
  field: { display: "flex", flexDirection: "column", gap: "0.35rem" },
  fieldHint: { fontSize: "0.75rem", color: "var(--text-muted)" },
  atPrefix: {
    position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)",
    fontSize: "0.9rem", color: "var(--text-muted)", pointerEvents: "none",
  },
  saveBtn: { alignSelf: "flex-start", padding: "0.55rem 1.25rem", fontSize: "0.9rem" },
};
