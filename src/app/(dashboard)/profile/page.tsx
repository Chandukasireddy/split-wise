"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateProfileName,
  updateUsername,
  updatePassword,
  getCurrentUserProfile,
} from "@/app/actions/userActions";
import {
  Pencil,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  ShieldCheck,
  AtSign,
  User,
} from "lucide-react";
import { signOut } from "@/app/actions/authActions";
import ThemeToggle from "@/components/ThemeToggle";

interface Profile {
  id: string;
  name: string;
  username: string;
  createdAt: Date;
}

type Status = { type: "success" | "error"; message: string } | null;
type EditingField = "name" | "username" | "password" | null;

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingField, setEditingField] = useState<EditingField>(null);

  // Field states
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    getCurrentUserProfile().then((p) => {
      if (p) {
        setProfile(p as Profile);
        setName(p.name);
        setUsername(p.username);
      }
    });
  }, []);

  function startEdit(field: EditingField) {
    setEditingField(field);
    setStatus(null);
    if (field === "name" && profile) setName(profile.name);
    if (field === "username" && profile) setUsername(profile.username);
    if (field === "password") {
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    }
  }

  function cancelEdit() {
    setEditingField(null);
    setStatus(null);
    if (profile) {
      setName(profile.name);
      setUsername(profile.username);
    }
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
  }

  async function handleSaveField() {
    if (!editingField) return;
    setSaving(true);
    setStatus(null);

    let res: { success: boolean; error?: string };

    if (editingField === "name") {
      if (!name.trim()) {
        setStatus({ type: "error", message: "Name cannot be empty." });
        setSaving(false);
        return;
      }
      res = await updateProfileName(name.trim());
    } else if (editingField === "username") {
      if (!username.trim() || username.trim().length < 3) {
        setStatus({ type: "error", message: "Username must be at least 3 characters." });
        setSaving(false);
        return;
      }
      res = await updateUsername(username.trim().toLowerCase());
    } else if (editingField === "password") {
      if (!currentPw) {
        setStatus({ type: "error", message: "Please enter your current password." });
        setSaving(false);
        return;
      }
      if (newPw.length < 8) {
        setStatus({ type: "error", message: "New password must be at least 8 characters." });
        setSaving(false);
        return;
      }
      if (newPw !== confirmPw) {
        setStatus({ type: "error", message: "Passwords do not match." });
        setSaving(false);
        return;
      }
      res = await updatePassword(currentPw, newPw);
    } else {
      setSaving(false);
      return;
    }

    if (res.success) {
      const successMessage =
        editingField === "password"
          ? "Password updated successfully."
          : `${editingField === "name" ? "Display name" : "Username"} updated.`;

      setStatus({ type: "success", message: successMessage });

      if (profile) {
        if (editingField === "name") setProfile({ ...profile, name: name.trim() });
        if (editingField === "username") setProfile({ ...profile, username: username.trim().toLowerCase() });
      }

      startTransition(() => {
        router.refresh();
      });

      setTimeout(() => {
        setEditingField(null);
        setStatus(null);
      }, 1200);
    } else {
      setStatus({ type: "error", message: res.error || "Failed to update." });
    }

    setSaving(false);
  }

  async function handleLogout() {
    await signOut();
    window.location.href = "/login";
  }

  if (!profile) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "260px" }}>
        <Loader2 size={26} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div style={styles.page} className="animate-fade-in">
      {/* Profile Hero Card with integrated single Theme Toggle icon */}
      <div className="glass-card" style={styles.heroCard}>
        <div style={styles.avatarCircle}>
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.heroName}>{profile.name}</div>
          <div style={styles.heroUsername}>@{profile.username}</div>
          <div style={styles.heroSince}>
            Member since {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}
          </div>
        </div>
        {/* Single Theme Toggle icon right here on the Me screen */}
        <ThemeToggle />
      </div>

      {/* Account Details Card with Seamless Inline Editing */}
      <div className="glass-card" style={styles.infoCard}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Account Details</h2>
        </div>

        {status && (
          <div
            style={{
              ...styles.statusBanner,
              background: status.type === "success" ? "rgba(16,185,129,0.09)" : "rgba(244,63,94,0.09)",
              borderColor: status.type === "success" ? "rgba(16,185,129,0.25)" : "rgba(244,63,94,0.25)",
              color: status.type === "success" ? "#10B981" : "#f43f5e",
            }}
          >
            {status.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{status.message}</span>
          </div>
        )}

        {/* Display Name Row */}
        <div style={styles.row}>
          <div style={styles.iconBox}>
            <User size={15} color="var(--primary)" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={styles.label}>Display Name</span>
            {editingField === "name" ? (
              <div style={styles.inlineEditWrap}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveField();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="form-input"
                  style={styles.inlineInput}
                  placeholder="Your full name"
                  disabled={saving || isPending}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveField}
                  disabled={saving || isPending}
                  style={styles.inlineSaveBtn}
                  title="Save Name"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving || isPending}
                  style={styles.inlineCancelBtn}
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={styles.valueRow}>
                <span style={styles.value}>{profile.name}</span>
                <button
                  type="button"
                  onClick={() => startEdit("name")}
                  style={styles.editBtn}
                  title="Edit Display Name"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Username Row */}
        <div style={styles.row}>
          <div style={styles.iconBox}>
            <AtSign size={15} color="var(--primary)" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={styles.label}>Username</span>
            {editingField === "username" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.25rem" }}>
                <div style={styles.inlineEditWrap}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <span style={styles.atPrefix}>@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveField();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="form-input"
                      style={{ ...styles.inlineInput, paddingLeft: "1.6rem" }}
                      placeholder="username"
                      disabled={saving || isPending}
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveField}
                    disabled={saving || isPending}
                    style={styles.inlineSaveBtn}
                    title="Save Username"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving || isPending}
                    style={styles.inlineCancelBtn}
                    title="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
                <span style={styles.subtext}>3+ chars, letters, numbers, underscores only</span>
              </div>
            ) : (
              <div style={styles.valueRow}>
                <span style={styles.value}>@{profile.username}</span>
                <button
                  type="button"
                  onClick={() => startEdit("username")}
                  style={styles.editBtn}
                  title="Edit Username"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Password Row */}
        <div style={{ ...styles.row, borderBottom: "none" }}>
          <div style={styles.iconBox}>
            <ShieldCheck size={15} color="var(--primary)" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={styles.label}>Password</span>
            {editingField === "password" ? (
              <div style={styles.passwordForm}>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="form-input"
                  style={styles.inlineInput}
                  placeholder="Current Password"
                  disabled={saving || isPending}
                  autoFocus
                />
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="form-input"
                  style={styles.inlineInput}
                  placeholder="New Password (min 8 chars)"
                  disabled={saving || isPending}
                />
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="form-input"
                  style={styles.inlineInput}
                  placeholder="Confirm New Password"
                  disabled={saving || isPending}
                />
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <button
                    type="button"
                    onClick={handleSaveField}
                    disabled={saving || isPending}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: "0.45rem", fontSize: "0.82rem" }}
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : "Update Password"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving || isPending}
                    className="btn btn-secondary"
                    style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.valueRow}>
                <span style={styles.value}>••••••••</span>
                <button
                  type="button"
                  onClick={() => startEdit("password")}
                  style={styles.editBtn}
                  title="Change Password"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simple, clean, outlined Sign Out icon button at the end */}
      <div style={styles.signOutWrap}>
        <button
          type="button"
          onClick={handleLogout}
          style={styles.simpleSignOutBtn}
          title="Sign Out"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: "460px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    width: "100%",
    paddingBottom: "1.5rem",
  },
  heroCard: {
    display: "flex",
    alignItems: "center",
    gap: "0.875rem",
    padding: "0.875rem 1rem",
    borderRadius: "14px",
  },
  avatarCircle: {
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    background: "var(--primary)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "1.2rem",
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
  },
  heroName: {
    fontSize: "1.02rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    lineHeight: 1.25,
  },
  heroUsername: {
    fontSize: "0.82rem",
    color: "var(--primary)",
    fontWeight: 600,
    marginTop: "0.1rem",
  },
  heroSince: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    marginTop: "0.15rem",
  },
  infoCard: {
    padding: "0.875rem 1rem",
    borderRadius: "14px",
    display: "flex",
    flexDirection: "column",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.35rem",
  },
  cardTitle: {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  statusBanner: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    padding: "0.45rem 0.75rem",
    borderRadius: "8px",
    fontSize: "0.78rem",
    fontWeight: 500,
    border: "1px solid",
    marginBottom: "0.5rem",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.6rem 0",
    borderBottom: "1px solid var(--border-light)",
  },
  iconBox: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "rgba(16,185,129,0.08)",
    border: "1px solid rgba(16,185,129,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: {
    fontSize: "0.68rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    display: "block",
  },
  valueRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
    marginTop: "0.1rem",
  },
  value: {
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "var(--text-primary)",
    wordBreak: "break-all",
  },
  editBtn: {
    background: "transparent",
    border: "1px solid var(--border-light)",
    borderRadius: "6px",
    width: "26px",
    height: "26px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "var(--text-muted)",
    flexShrink: 0,
    transition: "all 0.15s ease",
  },
  inlineEditWrap: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    marginTop: "0.25rem",
    width: "100%",
  },
  inlineInput: {
    padding: "0.4rem 0.65rem",
    fontSize: "0.85rem",
    borderRadius: "8px",
    height: "32px",
    background: "var(--input-bg)",
  },
  inlineSaveBtn: {
    background: "var(--primary)",
    color: "#fff",
    border: "none",
    borderRadius: "7px",
    width: "30px",
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  inlineCancelBtn: {
    background: "transparent",
    color: "var(--text-muted)",
    border: "1px solid var(--border-light)",
    borderRadius: "7px",
    width: "30px",
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  atPrefix: {
    position: "absolute",
    left: "0.65rem",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "0.82rem",
    color: "var(--text-muted)",
    pointerEvents: "none",
  },
  subtext: {
    fontSize: "0.68rem",
    color: "var(--text-muted)",
  },
  passwordForm: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    marginTop: "0.35rem",
    paddingTop: "0.25rem",
  },
  signOutWrap: {
    display: "flex",
    justifyContent: "center",
    paddingTop: "0.5rem",
  },
  simpleSignOutBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.4rem 0.85rem",
    fontSize: "0.78rem",
    fontWeight: 500,
    color: "var(--text-muted)",
    background: "transparent",
    border: "1px solid var(--border-light)",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
};
