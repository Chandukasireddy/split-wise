"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateProfileName,
  updateUsername,
  updatePassword,
  getCurrentUserProfile,
} from "@/app/actions/userActions";
import { Pencil, Lock, X, CheckCircle2, AlertCircle, Loader2, LogOut, ShieldCheck, AtSign, User } from "lucide-react";
import { signOut } from "@/app/actions/authActions";

interface Profile { id: string; name: string; username: string; createdAt: Date; }
type Status = { type: "success" | "error"; message: string } | null;
type EditMode = "name" | "username" | "password" | null;

function StatusMsg({ status }: { status: Status }) {
  if (!status) return null;
  const ok = status.type === "success";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 0.875rem", borderRadius: "10px", fontSize: "0.82rem", fontWeight: 500, background: ok ? "rgba(16,185,129,0.08)" : "rgba(244,63,94,0.08)", border: `1px solid ${ok ? "rgba(16,185,129,0.25)" : "rgba(244,63,94,0.25)"}`, color: ok ? "#065F46" : "#f43f5e" }}>
      {ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      {status.message}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, onEdit }: { icon: React.ElementType; label: string; value: string; onEdit: () => void }) {
  return (
    <div style={row.wrap}>
      <div style={row.iconBox}><Icon size={16} color="var(--primary)" /></div>
      <div style={row.content}>
        <span style={row.label}>{label}</span>
        <span style={row.value}>{value}</span>
      </div>
      <button onClick={onEdit} style={row.editBtn} title={`Edit ${label}`}>
        <Pencil size={14} />
      </button>
    </div>
  );
}

const row: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.875rem 0", borderBottom: "1px solid var(--border-light)" },
  iconBox: { width: "34px", height: "34px", borderRadius: "9px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  content: { flex: 1, display: "flex", flexDirection: "column", gap: "0.05rem" },
  label: { fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" },
  value: { fontSize: "0.95rem", fontWeight: 500, color: "var(--text-primary)" },
  editBtn: { background: "transparent", border: "1px solid var(--border-light)", borderRadius: "7px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)", flexShrink: 0 },
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editMode, setEditMode] = useState<EditMode>(null);

  // Edit field states
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    getCurrentUserProfile().then((p) => {
      if (p) { setProfile(p as Profile); setName(p.name); setUsername(p.username); }
    });
  }, []);

  function openEdit(mode: EditMode) { setEditMode(mode); setStatus(null); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
  function closeEdit() { setEditMode(null); setStatus(null); if (profile) { setName(profile.name); setUsername(profile.username); } }

  async function handleSave() {
    setSaving(true); setStatus(null);
    let res;
    if (editMode === "name") res = await updateProfileName(name);
    else if (editMode === "username") res = await updateUsername(username);
    else if (editMode === "password") {
      if (newPw !== confirmPw) { setStatus({ type: "error", message: "Passwords do not match." }); setSaving(false); return; }
      res = await updatePassword(currentPw, newPw);
    } else { setSaving(false); return; }

    if (res.success) {
      setStatus({ type: "success", message: editMode === "password" ? "Password updated." : `${editMode === "name" ? "Name" : "Username"} updated.` });
      if (profile) {
        if (editMode === "name") setProfile({ ...profile, name });
        if (editMode === "username") setProfile({ ...profile, username });
        if (editMode === "password") { setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
      }
      router.refresh();
      if (editMode !== "password") setTimeout(closeEdit, 1000);
    } else {
      setStatus({ type: "error", message: res.error! });
    }
    setSaving(false);
  }

  async function handleLogout() {
    await signOut();
    window.location.href = "/login";
  }

  if (!profile) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px" }}>
      <Loader2 size={28} className="animate-spin" style={{ color: "var(--primary)" }} />
    </div>
  );

  const editTitle = editMode === "name" ? "Edit Display Name" : editMode === "username" ? "Edit Username" : "Change Password";

  return (
    <div style={styles.page} className="animate-fade-in">

      {/* Avatar hero */}
      <div className="glass-card" style={styles.heroCard}>
        <div style={styles.avatarCircle}>{profile.name.charAt(0).toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div style={styles.heroName}>{profile.name}</div>
          <div style={styles.heroUsername}>@{profile.username}</div>
          <div style={styles.heroSince}>Member since {new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
        </div>
      </div>

      {/* Account info rows */}
      <div className="glass-card" style={styles.infoCard}>
        <h2 style={styles.cardTitle}>Account Details</h2>
        <InfoRow icon={User}    label="Display Name" value={profile.name}           onEdit={() => openEdit("name")} />
        <InfoRow icon={AtSign}  label="Username"     value={`@${profile.username}`} onEdit={() => openEdit("username")} />
        <div style={{ ...row.wrap, borderBottom: "none" }}>
          <div style={row.iconBox}><ShieldCheck size={16} color="var(--primary)" /></div>
          <div style={row.content}>
            <span style={row.label}>Password</span>
            <span style={row.value}>••••••••</span>
          </div>
          <button onClick={() => openEdit("password")} style={row.editBtn} title="Change password"><Pencil size={14} /></button>
        </div>
      </div>

      {/* Logout */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <h2 style={{ ...styles.cardTitle, marginBottom: "0.875rem" }}>Session</h2>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {/* Edit modal */}
      {editMode && (
        <div style={styles.overlay}>
          <div className="glass-card animate-fade-in" style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editTitle}</h3>
              <button onClick={closeEdit} style={styles.closeBtn}><X size={18} /></button>
            </div>

            <div style={styles.modalBody}>
              {editMode === "name" && (
                <div style={styles.field}>
                  <label className="form-label">Full Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input" placeholder="Your name" autoFocus />
                </div>
              )}
              {editMode === "username" && (
                <div style={styles.field}>
                  <label className="form-label">Username</label>
                  <div style={{ position: "relative" }}>
                    <span style={styles.atPrefix}>@</span>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className="form-input" style={{ paddingLeft: "1.75rem" }} placeholder="yourname" autoFocus />
                  </div>
                  <span style={styles.hint}>3+ chars, letters/numbers/underscores only.</span>
                </div>
              )}
              {editMode === "password" && (
                <>
                  <div style={styles.field}>
                    <label className="form-label">Current Password</label>
                    <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="form-input" placeholder="••••••••" autoFocus />
                  </div>
                  <div style={styles.field}>
                    <label className="form-label">New Password</label>
                    <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="form-input" placeholder="min 8 characters" />
                  </div>
                  <div style={styles.field}>
                    <label className="form-label">Confirm New Password</label>
                    <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="form-input" placeholder="••••••••" />
                  </div>
                </>
              )}

              <StatusMsg status={status} />
            </div>

            <div style={styles.modalFooter}>
              <button onClick={closeEdit} className="btn btn-secondary" style={styles.footerBtn}>Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={styles.footerBtn}
              >
                {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: "520px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1rem", width: "100%" },
  heroCard: { display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" },
  avatarCircle: { width: "56px", height: "56px", borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.4rem", flexShrink: 0 },
  heroName: { fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" },
  heroUsername: { fontSize: "0.85rem", color: "var(--primary)", fontWeight: 600, marginTop: "0.1rem" },
  heroSince: { fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" },
  infoCard: { padding: "1.25rem" },
  cardTitle: { fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" },
  logoutBtn: { display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 1.25rem", fontSize: "0.875rem", fontWeight: 600, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: "10px", cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, background: "rgba(3,7,18,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 2000, padding: "0" },
  modal: { width: "100%", maxWidth: "480px", borderRadius: "20px 20px 0 0", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem", background: "#fff", maxHeight: "90vh", overflowY: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" },
  closeBtn: { background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.25rem", borderRadius: "6px" },
  modalBody: { display: "flex", flexDirection: "column", gap: "0.875rem" },
  modalFooter: { display: "flex", gap: "0.75rem" },
  footerBtn: { flex: 1, padding: "0.65rem", fontSize: "0.9rem" },
  field: { display: "flex", flexDirection: "column", gap: "0.35rem" },
  hint: { fontSize: "0.72rem", color: "var(--text-muted)" },
  atPrefix: { position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.9rem", color: "var(--text-muted)", pointerEvents: "none" },
};
