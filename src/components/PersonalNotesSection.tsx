"use client";

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  StickyNote,
  Search,
  X,
  Trash2,
  CheckCircle2,
  Link2,
  Utensils,
  Plane,
  Zap,
  Film,
  Receipt,
  UserCheck,
  ChevronRight,
  ArrowLeft,
  PiggyBank,
  Settings,
  DollarSign,
  Pencil,
} from "lucide-react";
import {
  FriendNotesData,
  FriendNoteItem,
  addFriendNote,
  updateFriendNote,
  toggleSettleFriendNote,
  deleteFriendNote,
  linkNoteToRegisteredUser,
  settleAllNotesForFriend,
  deleteAllNotesForFriend,
  linkAllNotesForFriend,
} from "@/app/actions/noteActions";
import { searchUsers } from "@/app/actions/groupActions";
import { getAvatarGradient } from "@/lib/avatar";

const CATEGORIES = [
  "General",
  "Food & Dining",
  "Travel & Transport",
  "Utilities & Bills",
  "Entertainment",
];

const CATEGORY_COLORS: Record<string, string> = {
  General: "#64748b",
  "Food & Dining": "#f97316",
  "Travel & Transport": "#0ea5e9",
  "Utilities & Bills": "#eab308",
  Entertainment: "#ec4899",
};

const CURRENCIES = [
  "EUR", "USD", "GBP", "INR", "PLN", "JPY", "CAD", "AUD", "CHF", "CNY",
  "SEK", "NOK", "DKK", "BRL", "MXN", "SGD", "HKD", "KRW", "TRY", "ZAR",
  "AED", "THB", "MYR", "IDR", "PHP", "CZK", "HUF", "RON", "BGN", "HRK",
  "NZD", "PKR", "BDT", "VND", "EGP", "UAH", "NGN", "KES", "GHS", "ILS",
];

function getCategoryIcon(cat: string, size = 15) {
  switch (cat) {
    case "Food & Dining":
      return <Utensils size={size} />;
    case "Travel & Transport":
      return <Plane size={size} />;
    case "Utilities & Bills":
      return <Zap size={size} />;
    case "Entertainment":
      return <Film size={size} />;
    default:
      return <Receipt size={size} />;
  }
}

function formatCurrency(amount: number, currency: string = "EUR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

interface PersonNoteGroup {
  friendName: string;
  notes: FriendNoteItem[];
  matchedUser?: { id: string; name: string; username: string } | null;
  primaryCurrency: string;
  primaryNet: number;
  isSettled: boolean;
  hasUnsettled: boolean;
}

interface PersonalNotesSectionProps {
  notesData: FriendNotesData;
  onRefreshNotes: () => Promise<void>;
  onRefreshFriends?: () => Promise<void>;
  onSwitchToContacts?: () => void;
  currentUserId?: string;
}

export default function PersonalNotesSection({
  notesData,
  onRefreshNotes,
  onRefreshFriends,
  onSwitchToContacts,
  currentUserId,
}: PersonalNotesSectionProps) {
  // Navigation state: which person profile is open (null = all personal notes directory)
  const [selectedPersonName, setSelectedPersonName] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedNoteForDetails, setSelectedNoteForDetails] = useState<FriendNoteItem | null>(null);

  // Add Note Form state
  const [friendName, setFriendName] = useState("");
  const [noteType, setNoteType] = useState<"LENT" | "BORROWED">("LENT");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [category, setCategory] = useState("General");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Note Form state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNote, setEditingNote] = useState<FriendNoteItem | null>(null);
  const [editFriendName, setEditFriendName] = useState("");
  const [editNoteType, setEditNoteType] = useState<"LENT" | "BORROWED">("LENT");
  const [editAmount, setEditAmount] = useState("");
  const [editCurrency, setEditCurrency] = useState("EUR");
  const [editCategory, setEditCategory] = useState("General");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Link Note Modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedNoteForLinking, setSelectedNoteForLinking] = useState<FriendNoteItem | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<{ id: string; name: string; username: string }[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Live matching of registered users in Add Note modal
  const [matchedRegisteredUsers, setMatchedRegisteredUsers] = useState<
    { id: string; name: string; username: string }[]
  >([]);

  // Group notes by unique friend name
  const personGroups: PersonNoteGroup[] = useMemo(() => {
    const map = new Map<string, PersonNoteGroup>();

    for (const note of notesData.notes) {
      const key = note.friendName.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          friendName: note.friendName,
          notes: [],
          matchedUser: note.matchedUser || null,
          primaryCurrency: note.currency || "EUR",
          primaryNet: 0,
          isSettled: true,
          hasUnsettled: false,
        });
      }
      const group = map.get(key)!;
      group.notes.push(note);
      if (note.matchedUser && !group.matchedUser) {
        group.matchedUser = note.matchedUser;
      }
    }

    return Array.from(map.values()).map((g) => {
      // Sort notes: newest date/created first
      g.notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      g.primaryCurrency = g.notes[0]?.currency || "EUR";

      let net = 0;
      let hasUnsettled = false;
      for (const n of g.notes) {
        if (!n.isSettled) {
          hasUnsettled = true;
          if (n.type === "LENT") {
            net += n.amount;
          } else {
            net -= n.amount;
          }
        }
      }
      g.primaryNet = parseFloat(net.toFixed(2));
      g.hasUnsettled = hasUnsettled;
      g.isSettled = !hasUnsettled;
      return g;
    });
  }, [notesData.notes]);

  // Current selected person group
  const currentPerson = useMemo(() => {
    if (!selectedPersonName) return null;
    return (
      personGroups.find(
        (p) => p.friendName.toLowerCase() === selectedPersonName.toLowerCase()
      ) || null
    );
  }, [personGroups, selectedPersonName]);

  function handleFriendNameChange(val: string) {
    setFriendName(val);
    const trimmed = val.trim();
    if (trimmed.length >= 2) {
      searchUsers(trimmed)
        .then((res) => {
          setMatchedRegisteredUsers(res.filter((u) => u.id !== currentUserId));
        })
        .catch(() => {});
    } else {
      setMatchedRegisteredUsers([]);
    }
  }

  function resetAddForm(prefillName = "") {
    setFriendName(prefillName);
    setNoteType("LENT");
    setAmount("");
    setCurrency(currentPerson?.primaryCurrency || "EUR");
    setCategory("General");
    setDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setError(null);
    setMatchedRegisteredUsers([]);
  }

  // Add Note submit
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }
    if (!friendName.trim()) {
      setError("Please enter a person's name.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await addFriendNote({
        friendName: friendName.trim(),
        type: noteType,
        amount: parsedAmount,
        currency,
        category,
        date,
        description: description.trim() || undefined,
      });

      if (res.success) {
        setShowAddModal(false);
        resetAddForm();
        await onRefreshNotes();
      } else {
        setError(res.error || "Failed to create note.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  // Open Edit Note modal
  function openEditNoteModal(note: FriendNoteItem) {
    setEditingNote(note);
    setEditFriendName(note.friendName);
    setEditNoteType(note.type);
    setEditAmount(note.amount.toString());
    setEditCurrency(note.currency);
    setEditCategory(note.category);
    setEditDate(note.date ? note.date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setEditDescription(note.description || "");
    setEditError(null);
    setShowEditModal(true);
  }

  // Submit Edit Note
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingNote) return;

    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setEditError("Please enter a valid amount greater than 0.");
      return;
    }
    if (!editFriendName.trim()) {
      setEditError("Please enter a person's name.");
      return;
    }

    setEditSaving(true);
    setEditError(null);

    try {
      const res = await updateFriendNote({
        id: editingNote.id,
        friendName: editFriendName.trim(),
        type: editNoteType,
        amount: parsedAmount,
        currency: editCurrency,
        category: editCategory,
        date: editDate,
        description: editDescription.trim() || undefined,
      });

      if (res.success) {
        setShowEditModal(false);
        if (
          selectedPersonName &&
          selectedPersonName.toLowerCase() === editingNote.friendName.toLowerCase()
        ) {
          setSelectedPersonName(editFriendName.trim());
        }
        setEditingNote(null);
        await onRefreshNotes();
        if (onRefreshFriends) {
          await onRefreshFriends();
        }
      } else {
        setEditError(res.error || "Failed to update note.");
      }
    } catch {
      setEditError("An unexpected error occurred while updating note.");
    } finally {
      setEditSaving(false);
    }
  }

  // Toggle settled for single note
  async function handleToggleSettle(noteId: string) {
    try {
      await toggleSettleFriendNote(noteId);
      await onRefreshNotes();
      if (selectedNoteForDetails && selectedNoteForDetails.id === noteId) {
        setSelectedNoteForDetails((prev) =>
          prev ? { ...prev, isSettled: !prev.isSettled } : null
        );
      }
    } catch (err) {
      console.error("Error toggling settle:", err);
    }
  }

  // Settle all notes for current person
  async function handleSettlePerson(targetFriendName: string) {
    try {
      await settleAllNotesForFriend(targetFriendName);
      await onRefreshNotes();
    } catch (err) {
      console.error("Error settling friend notes:", err);
    }
  }

  // Delete single note
  async function handleDeleteNote(noteId: string) {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await deleteFriendNote(noteId);
      setSelectedNoteForDetails(null);
      await onRefreshNotes();
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  }

  // Delete all notes for current person
  async function handleDeleteAllPersonNotes(targetFriendName: string) {
    if (!confirm(`Are you sure you want to delete all notes for ${targetFriendName}?`)) return;
    try {
      await deleteAllNotesForFriend(targetFriendName);
      setShowSettingsModal(false);
      setSelectedPersonName(null);
      await onRefreshNotes();
    } catch (err) {
      console.error("Error deleting all notes:", err);
    }
  }

  // Open search to link user
  function openLinkModal(note: FriendNoteItem) {
    setSelectedNoteForLinking(note);
    setUserSearch("");
    setUserResults([]);
    setLinkError(null);
    setShowLinkModal(true);
  }

  async function handleUserSearch(query: string) {
    setUserSearch(query);
    if (!query.trim()) {
      setUserResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const res = await searchUsers(query.trim());
      setUserResults(res.filter((u) => u.id !== currentUserId));
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setSearchingUsers(false);
    }
  }

  // Link single note to registered user
  async function handleLinkSingleNote(targetUserId: string, noteId: string) {
    setLinking(true);
    setLinkError(null);

    try {
      const res = await linkNoteToRegisteredUser(noteId, targetUserId);
      if (res.success) {
        setShowLinkModal(false);
        setSelectedNoteForLinking(null);
        setSelectedNoteForDetails(null);
        await onRefreshNotes();
        if (onRefreshFriends) {
          await onRefreshFriends();
        }
        if (onSwitchToContacts) {
          onSwitchToContacts();
        }
      } else {
        alert(res.error || "Failed to link note to user.");
        setLinkError(res.error || "Failed to link note to user.");
      }
    } catch {
      alert("An unexpected error occurred while linking.");
      setLinkError("An unexpected error occurred while linking.");
    } finally {
      setLinking(false);
    }
  }

  // Migrate ALL notes for person to registered user
  async function handleMigrateAllNotes(targetUserId: string, targetFriendName: string) {
    setLinking(true);
    setLinkError(null);

    try {
      const res = await linkAllNotesForFriend(targetFriendName, targetUserId);
      if (res.success) {
        setShowSettingsModal(false);
        setSelectedPersonName(null);
        await onRefreshNotes();
        if (onRefreshFriends) {
          await onRefreshFriends();
        }
        if (onSwitchToContacts) {
          onSwitchToContacts();
        }
      } else {
        alert(res.error || "Failed to migrate notes to user.");
        setLinkError(res.error || "Failed to migrate notes to user.");
      }
    } catch {
      alert("An unexpected error occurred while migrating notes.");
      setLinkError("An unexpected error occurred while migrating notes.");
    } finally {
      setLinking(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW 2: DEDICATED PERSON PROFILE (Matches Contact Ledger View)
  // ─────────────────────────────────────────────────────────────
  if (selectedPersonName && currentPerson) {
    const isOwed = currentPerson.primaryNet > 0.01;
    const owesUser = currentPerson.primaryNet < -0.01;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", maxWidth: "800px", margin: "0 auto" }}>
        {/* Dedicated Back Navigation */}
        <div style={styles.detailTopNav}>
          <button
            type="button"
            onClick={() => setSelectedPersonName(null)}
            style={styles.detailBackBtn}
            title="Back to all personal notes"
          >
            <ArrowLeft size={16} />
            <span>Friends</span>
          </button>
        </div>

        {/* Person Profile & Balance Card - 100% Visual Parity with Contact Card */}
        <div style={styles.friendHeaderCard} className="glass-card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flex: 1, minWidth: 0 }}>
            <div
              style={{
                ...styles.avatar,
                width: "44px",
                height: "44px",
                fontSize: "1.15rem",
                background: getAvatarGradient(currentPerson.friendName),
              }}
            >
              {currentPerson.friendName.charAt(0).toUpperCase()}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, lineHeight: 1.25 }}>
                  {currentPerson.friendName}
                </h1>
                {currentPerson.matchedUser && (
                  <span style={styles.registeredMiniBadge} title={`Registered user @${currentPerson.matchedUser.username}`}>
                    @{currentPerson.matchedUser.username}
                  </span>
                )}
              </div>

              <div style={{ fontSize: "0.82rem", fontWeight: 700, marginTop: "0.15rem" }}>
                {isOwed ? (
                  <span style={{ color: "var(--owed)" }}>
                    owes you {formatCurrency(currentPerson.primaryNet, currentPerson.primaryCurrency)}
                  </span>
                ) : owesUser ? (
                  <span style={{ color: "#f59e0b" }}>
                    you owe {formatCurrency(Math.abs(currentPerson.primaryNet), currentPerson.primaryCurrency)}
                  </span>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>settled up</span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons matching the image: Settle up & Settings */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => handleSettlePerson(currentPerson.friendName)}
              style={styles.compactSettleBtn}
              title={currentPerson.isSettled ? "Mark notes as pending" : "Settle up with this contact"}
            >
              <PiggyBank size={14} />
              <span>{currentPerson.isSettled ? "Settled" : "Settle up"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="group-pill-badge"
              style={{ padding: "0.45rem 0.75rem", fontSize: "0.8rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              title="Contact options and settings"
            >
              <Settings size={13} />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Transaction History Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Transaction History
            </h2>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {currentPerson.notes.length} record{currentPerson.notes.length !== 1 ? "s" : ""}
            </span>
          </div>

          {currentPerson.notes.length === 0 ? (
            <div className="glass-card" style={styles.emptyCard}>
              <DollarSign size={38} color="var(--text-muted)" style={{ marginBottom: "0.75rem" }} />
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                No notes for {currentPerson.friendName}
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "280px", marginBottom: "1rem" }}>
                Record money lent or borrowed with this person.
              </p>
              <button
                type="button"
                onClick={() => {
                  resetAddForm(currentPerson.friendName);
                  setShowAddModal(true);
                }}
                className="btn btn-primary"
                style={{ fontSize: "0.85rem", padding: "0.55rem 1.15rem" }}
              >
                <Plus size={15} /> Add first note
              </button>
            </div>
          ) : (
            <div className="glass-card" style={styles.expenseCardContainer}>
              {currentPerson.notes.map((note, index) => {
                const catColor = CATEGORY_COLORS[note.category] || "#64748b";
                const isLent = note.type === "LENT";
                const dateObj = new Date(note.date);

                return (
                  <div
                    key={note.id}
                    className="expense-row-item"
                    style={{
                      ...styles.expenseRow,
                      borderBottom:
                        index < currentPerson.notes.length - 1
                          ? "1px solid var(--border-light)"
                          : "none",
                      opacity: note.isSettled ? 0.7 : 1,
                    }}
                    onClick={() => setSelectedNoteForDetails(note)}
                    role="button"
                    tabIndex={0}
                    title="Click to view details"
                  >
                    <div style={styles.expenseRowLeft}>
                      {/* Date Badge: Month & Day */}
                      <div style={styles.expenseDateBadge}>
                        <span style={styles.dateMonth}>
                          {dateObj.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
                        </span>
                        <span style={styles.dateDay}>
                          {dateObj.toLocaleDateString("en-US", { day: "2-digit", timeZone: "UTC" })}
                        </span>
                      </div>

                      {/* Icon badge */}
                      <div
                        style={{
                          ...styles.categoryIconBadge,
                          backgroundColor: note.isSettled ? "rgba(16, 185, 129, 0.12)" : `${catColor}15`,
                          color: note.isSettled ? "var(--primary)" : catColor,
                          border: `1px solid ${note.isSettled ? "rgba(16, 185, 129, 0.3)" : `${catColor}35`}`,
                        }}
                        title={note.isSettled ? "Settled note" : note.category}
                      >
                        {note.isSettled ? (
                          <PiggyBank size={16} />
                        ) : (
                          getCategoryIcon(note.category, 16)
                        )}
                      </div>

                      {/* Title & Details */}
                      <div style={styles.expenseTitleCol}>
                        <span style={styles.expenseTitle}>
                          {note.description || (isLent ? `Lent to ${note.friendName}` : `Borrowed from ${note.friendName}`)}
                        </span>
                        <span style={styles.expensePayerText}>
                          {note.isSettled
                            ? `Settled • ${isLent ? "You lent" : "You borrowed"} ${formatCurrency(note.amount, note.currency)}`
                            : isLent
                            ? `You lent ${formatCurrency(note.amount, note.currency)}`
                            : `You borrowed ${formatCurrency(note.amount, note.currency)}`}
                        </span>
                      </div>
                    </div>

                    {/* Right column: Tag & Amount */}
                    <div style={styles.expenseRowRight}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)" }}>
                        {note.isSettled ? "settlement" : note.category.toLowerCase()}
                      </span>
                      <span
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          color: note.isSettled
                            ? "var(--primary)"
                            : isLent
                            ? "var(--owed)"
                            : "#f59e0b",
                        }}
                      >
                        {formatCurrency(note.amount, note.currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add note button at bottom of history */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={() => {
                resetAddForm(currentPerson.friendName);
                setShowAddModal(true);
              }}
              className="group-add-pill"
              title={`Add a new note for ${currentPerson.friendName}`}
            >
              <Plus size={15} strokeWidth={2.2} />
              <span>Add note for {currentPerson.friendName}</span>
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            MODAL: SETTINGS MODAL (Matching Settings request)
        ───────────────────────────────────────────────────────────── */}
        {showSettingsModal && typeof document !== "undefined" && createPortal(
          <div style={styles.modalOverlay} onClick={() => setShowSettingsModal(false)}>
            <div
              className="glass-card"
              style={{ ...styles.modalCard, maxWidth: "440px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                  <div style={{ ...styles.avatar, width: "32px", height: "32px", fontSize: "0.85rem", background: getAvatarGradient(currentPerson.friendName) }}>
                    {currentPerson.friendName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Contact Settings
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {currentPerson.friendName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  style={styles.modalCloseBtn}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "0.85rem" }}>
                {/* Account Status / Link to Friends */}
                <div style={styles.settingsSectionBox}>
                  <span style={styles.settingsSectionLabel}>Account Link</span>
                  {currentPerson.matchedUser ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.82rem", color: "var(--text-primary)" }}>
                        <UserCheck size={16} color="var(--primary)" />
                        <span>Registered User: <strong>@{currentPerson.matchedUser.username}</strong></span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Move all notes with this contact directly into your shared 1-on-1 Friends ledger.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (currentPerson.matchedUser) {
                            if (confirm(`Move all notes with ${currentPerson.friendName} to your shared Friends ledger with @${currentPerson.matchedUser.username}?`)) {
                              handleMigrateAllNotes(currentPerson.matchedUser.id, currentPerson.friendName);
                            }
                          }
                        }}
                        disabled={linking}
                        className="btn btn-primary"
                        style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem", display: "inline-flex", alignItems: "center", gap: "0.4rem", justifyContent: "center" }}
                      >
                        <Link2 size={14} />
                        <span>{linking ? "Migrating…" : `Move to Friends (@${currentPerson.matchedUser.username})`}</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                      <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                        Currently an unregistered contact. If they joined SplitEasy, link them to convert notes into shared expenses.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (currentPerson.notes[0]) {
                            openLinkModal(currentPerson.notes[0]);
                          }
                        }}
                        style={styles.actionBtnLink}
                      >
                        <Search size={13} />
                        <span>Search & Link to Registered User</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div style={styles.settingsSectionBox}>
                  <span style={styles.settingsSectionLabel}>Ledger Actions</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <button
                      type="button"
                      onClick={() => handleSettlePerson(currentPerson.friendName)}
                      style={styles.settingsActionRowBtn}
                    >
                      <PiggyBank size={15} color="var(--primary)" />
                      <span>{currentPerson.isSettled ? "Mark All Notes as Pending" : "Settle Up All Notes"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsModal(false);
                        resetAddForm(currentPerson.friendName);
                        setShowAddModal(true);
                      }}
                      style={styles.settingsActionRowBtn}
                    >
                      <Plus size={15} color="var(--primary)" />
                      <span>Add New Note for {currentPerson.friendName}</span>
                    </button>
                  </div>
                </div>

                {/* Danger Zone: Delete all */}
                <div style={{ ...styles.settingsSectionBox, borderColor: "rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.04)" }}>
                  <span style={{ ...styles.settingsSectionLabel, color: "var(--expense)" }}>Danger Zone</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteAllPersonNotes(currentPerson.friendName)}
                    style={{ ...styles.settingsActionRowBtn, color: "var(--expense)" }}
                  >
                    <Trash2 size={15} color="var(--expense)" />
                    <span>Delete All Notes for {currentPerson.friendName}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ─────────────────────────────────────────────────────────────
            MODAL: TRANSACTION DETAILS (Clicking any record in history)
        ───────────────────────────────────────────────────────────── */}
        {selectedNoteForDetails && typeof document !== "undefined" && createPortal(
          <div style={styles.modalOverlay} onClick={() => setSelectedNoteForDetails(null)}>
            <div
              className="glass-card"
              style={{ ...styles.modalCard, maxWidth: "420px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Transaction Details
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {formatDate(selectedNoteForDetails.date)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNoteForDetails(null)}
                  style={styles.modalCloseBtn}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "0.85rem" }}>
                {/* Amount display */}
                <div style={{ textAlign: "center", padding: "0.85rem 0", background: "var(--surface-hover)", borderRadius: "12px" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.15rem" }}>
                    {selectedNoteForDetails.type === "LENT" ? "Money Lent" : "Money Borrowed"}
                  </div>
                  <div
                    style={{
                      fontSize: "1.6rem",
                      fontWeight: 800,
                      color: selectedNoteForDetails.isSettled
                        ? "var(--primary)"
                        : selectedNoteForDetails.type === "LENT"
                        ? "var(--owed)"
                        : "#f59e0b",
                    }}
                  >
                    {formatCurrency(selectedNoteForDetails.amount, selectedNoteForDetails.currency)}
                  </div>
                  <div style={{ marginTop: "0.35rem" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "20px",
                        background: selectedNoteForDetails.isSettled ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        color: selectedNoteForDetails.isSettled ? "var(--primary)" : "#f59e0b",
                      }}
                    >
                      {selectedNoteForDetails.isSettled ? "Settled" : "Pending Settlement"}
                    </span>
                  </div>
                </div>

                {/* Details list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.82rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Person</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedNoteForDetails.friendName}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Category</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedNoteForDetails.category}</span>
                  </div>
                  {selectedNoteForDetails.description && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", marginTop: "0.2rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Description</span>
                      <p style={{ margin: 0, fontStyle: "italic", color: "var(--text-secondary)", background: "var(--surface)", padding: "0.45rem 0.65rem", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                        &ldquo;{selectedNoteForDetails.description}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* Settle status toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "0.5rem", paddingTop: "0.2rem" }}>
                  <button
                    type="button"
                    onClick={() => handleToggleSettle(selectedNoteForDetails.id)}
                    style={selectedNoteForDetails.isSettled ? styles.actionBtnSettled : styles.actionBtn}
                  >
                    <CheckCircle2 size={14} color={selectedNoteForDetails.isSettled ? "var(--primary)" : "var(--text-muted)"} />
                    <span>{selectedNoteForDetails.isSettled ? "Mark as Pending" : "Mark as Settled"}</span>
                  </button>
                </div>

                {/* Bottom Action buttons: Delete & Edit note (Exact match to Contacts Expense Details) */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginTop: "0.45rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-light)" }}>
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(selectedNoteForDetails.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.6rem 1rem",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--owes)",
                      background: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      borderRadius: "10px",
                      cursor: "pointer",
                      minHeight: "42px",
                    }}
                    title="Delete this note"
                  >
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const note = selectedNoteForDetails;
                      setSelectedNoteForDetails(null);
                      openEditNoteModal(note);
                    }}
                    className="btn btn-primary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      padding: "0.6rem 1.35rem",
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      borderRadius: "10px",
                      minHeight: "42px",
                    }}
                    title="Edit this note"
                  >
                    <Pencil size={15} />
                    <span>Edit note</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Add Note Modal (reused) */}
        {showAddModal && renderAddModal()}

        {/* Edit Note Modal */}
        {showEditModal && renderEditModal()}

        {/* Link User Modal (reused) */}
        {showLinkModal && renderLinkModal()}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW 1: CONTACTS LIST (Exact match to Your Contacts)
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", width: "100%" }}>
      {personGroups.length === 0 ? (
        <div className="glass-card" style={styles.emptyCard}>
          <StickyNote size={38} color="var(--text-muted)" style={{ marginBottom: "0.65rem", opacity: 0.8 }} />
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.3rem" }}>
            No personal notes yet
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "320px", marginBottom: "1rem" }}>
            Record personal notes of money lent or borrowed. When your friends register, you can move them to Your Contacts with 1-click!
          </p>
          <button
            type="button"
            onClick={() => {
              resetAddForm();
              setShowAddModal(true);
            }}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem", padding: "0.5rem 1.15rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Plus size={15} />
            <span>Add a personal note</span>
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {personGroups.map((group) => {
            const isOwed = group.primaryNet > 0.01;

            return (
              <div
                key={group.friendName}
                className="glass-card"
                style={styles.contactCard}
                onClick={() => setSelectedPersonName(group.friendName)}
                role="button"
                tabIndex={0}
                title={`Open ${group.friendName}'s profile and transaction history`}
              >
                {/* Main Row: Exact visual match to Your Contacts */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem" }}>
                  <div style={styles.contactLeft}>
                    <div style={{ ...styles.avatar, background: getAvatarGradient(group.friendName) }}>
                      {group.friendName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={styles.contactName}>{group.friendName}</h3>
                    </div>
                  </div>

                  <div style={styles.contactRight}>
                    {group.isSettled ? (
                      <span style={styles.settledBadge}>settled up</span>
                    ) : (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.72rem", color: isOwed ? "var(--owed)" : "#f59e0b", fontWeight: 600 }}>
                          {isOwed ? "owes you" : "you owe"}
                        </div>
                        <div
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 700,
                            color: isOwed ? "var(--owed)" : "#f59e0b",
                          }}
                        >
                          {formatCurrency(Math.abs(group.primaryNet), group.primaryCurrency)}
                        </div>
                      </div>
                    )}
                    <ChevronRight
                      size={17}
                      color="var(--text-muted)"
                      style={{ flexShrink: 0 }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pill button at bottom */}
      {personGroups.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={() => {
              resetAddForm();
              setShowAddModal(true);
            }}
            className="group-add-pill"
            title="Add a new personal note"
          >
            <Plus size={15} strokeWidth={2.2} />
            <span>Add personal note</span>
          </button>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddModal && renderAddModal()}

      {/* Edit Note Modal */}
      {showEditModal && renderEditModal()}

      {/* Link User Modal */}
      {showLinkModal && renderLinkModal()}
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // MODAL: ADD PERSONAL NOTE
  // ─────────────────────────────────────────────────────────────
  function renderAddModal() {
    if (typeof document === "undefined") return null;
    return createPortal(
      <div style={styles.modalOverlay}>
        <div className="glass-card" style={styles.modalCard}>
          <div style={styles.modalHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <StickyNote size={18} color="var(--primary)" />
              <h3 style={styles.modalTitle}>Add Personal Note</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                resetAddForm();
              }}
              style={styles.modalCloseBtn}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleAddSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "0.75rem" }}>
            {/* Direction Toggle */}
            <div style={styles.directionToggleContainer}>
              <button
                type="button"
                onClick={() => setNoteType("LENT")}
                style={noteType === "LENT" ? styles.directionBtnLentActive : styles.directionBtn}
              >
                I Lent Money
              </button>
              <button
                type="button"
                onClick={() => setNoteType("BORROWED")}
                style={noteType === "BORROWED" ? styles.directionBtnBorrowActive : styles.directionBtn}
              >
                I Borrowed Money
              </button>
            </div>

            {/* Friend Name with live suggestion */}
            <div>
              <label style={styles.fieldLabel}>Person / Friend Name *</label>
              <input
                type="text"
                value={friendName}
                onChange={(e) => handleFriendNameChange(e.target.value)}
                placeholder="e.g. John Doe"
                required
                className="form-input"
                style={{ width: "100%" }}
              />

              {matchedRegisteredUsers.length > 0 && (
                <div style={styles.matchedSuggestionsBox}>
                  <div style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <UserCheck size={12} />
                    <span>Registered users found:</span>
                  </div>
                  {matchedRegisteredUsers.slice(0, 3).map((u) => (
                    <div key={u.id} style={styles.suggestionUserRow}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
                        <div style={{ ...styles.avatar, width: "22px", height: "22px", fontSize: "0.7rem", background: getAvatarGradient(u.name || u.username) }}>
                          {(u.name || u.username).charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>
                          {u.name} <span style={{ color: "var(--text-muted)" }}>(@{u.username})</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFriendName(u.name || u.username);
                          setMatchedRegisteredUsers([]);
                        }}
                        style={styles.suggestionSelectBtn}
                      >
                        Use this
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Amount & Currency */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "0.55rem" }}>
              <div>
                <label style={styles.fieldLabel}>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="form-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={styles.fieldLabel}>Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="form-input"
                  style={{ width: "100%", paddingRight: "0.5rem" }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category & Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem" }}>
              <div>
                <label style={styles.fieldLabel}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-input"
                  style={{ width: "100%" }}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.fieldLabel}>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="form-input"
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={styles.fieldLabel}>Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Lunch split, ticket reimbursement..."
                className="form-input"
                style={{ width: "100%" }}
              />
            </div>

            {error && (
              <p style={{ fontSize: "0.78rem", color: "var(--expense)", margin: 0 }}>
                {error}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.4rem" }}>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetAddForm();
                }}
                className="btn btn-secondary"
                style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}
              >
                {saving ? "Saving…" : "Save Note"}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MODAL: EDIT PERSONAL NOTE
  // ─────────────────────────────────────────────────────────────
  function renderEditModal() {
    if (typeof document === "undefined" || !editingNote) return null;
    return createPortal(
      <div style={styles.modalOverlay}>
        <div className="glass-card" style={styles.modalCard}>
          <div style={styles.modalHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Pencil size={18} color="var(--primary)" />
              <h3 style={styles.modalTitle}>Edit Personal Note</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setEditingNote(null);
              }}
              style={styles.modalCloseBtn}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "0.75rem" }}>
            {/* Direction Toggle */}
            <div style={styles.directionToggleContainer}>
              <button
                type="button"
                onClick={() => setEditNoteType("LENT")}
                style={editNoteType === "LENT" ? styles.directionBtnLentActive : styles.directionBtn}
              >
                I Lent Money
              </button>
              <button
                type="button"
                onClick={() => setEditNoteType("BORROWED")}
                style={editNoteType === "BORROWED" ? styles.directionBtnBorrowActive : styles.directionBtn}
              >
                I Borrowed Money
              </button>
            </div>

            {/* Friend Name */}
            <div>
              <label style={styles.fieldLabel}>Person / Friend Name *</label>
              <input
                type="text"
                value={editFriendName}
                onChange={(e) => setEditFriendName(e.target.value)}
                placeholder="e.g. John Doe"
                required
                className="form-input"
                style={{ width: "100%" }}
              />
            </div>

            {/* Amount & Currency */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "0.55rem" }}>
              <div>
                <label style={styles.fieldLabel}>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="form-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={styles.fieldLabel}>Currency</label>
                <select
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="form-input"
                  style={{ width: "100%", paddingRight: "0.5rem" }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category & Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem" }}>
              <div>
                <label style={styles.fieldLabel}>Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="form-input"
                  style={{ width: "100%" }}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.fieldLabel}>Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="form-input"
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={styles.fieldLabel}>Description (optional)</label>
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="e.g. Lunch split, ticket reimbursement..."
                className="form-input"
                style={{ width: "100%" }}
              />
            </div>

            {editError && (
              <p style={{ fontSize: "0.78rem", color: "var(--expense)", margin: 0 }}>
                {editError}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.4rem" }}>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingNote(null);
                }}
                className="btn btn-secondary"
                style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="btn btn-primary"
                style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}
              >
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MODAL: LINK TO REGISTERED USER
  // ─────────────────────────────────────────────────────────────
  function renderLinkModal() {
    if (typeof document === "undefined" || !selectedNoteForLinking) return null;
    return createPortal(
      <div style={styles.modalOverlay}>
        <div className="glass-card" style={styles.modalCard}>
          <div style={styles.modalHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <UserCheck size={18} color="var(--primary)" />
              <h3 style={styles.modalTitle}>Link Note to Registered User</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowLinkModal(false);
                setSelectedNoteForLinking(null);
              }}
              style={styles.modalCloseBtn}
            >
              <X size={18} />
            </button>
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.5rem", marginBottom: "0.75rem" }}>
            Link note for <strong>{selectedNoteForLinking.friendName}</strong> (
            {formatCurrency(selectedNoteForLinking.amount, selectedNoteForLinking.currency)}) to their real SplitEasy account.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={14} color="var(--text-muted)" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="Search username or name..."
                className="form-input"
                style={{ width: "100%", paddingLeft: "32px" }}
              />
            </div>
          </div>

          {linkError && (
            <p style={{ fontSize: "0.78rem", color: "var(--expense)", marginBottom: "0.5rem" }}>
              {linkError}
            </p>
          )}

          <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {searchingUsers ? (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "1rem" }}>
                Searching…
              </p>
            ) : userResults.length === 0 && userSearch.trim().length > 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "1rem" }}>
                No registered users found matching &ldquo;{userSearch}&rdquo;.
              </p>
            ) : (
              userResults.map((u) => (
                <div key={u.id} style={styles.userResultRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                    <div style={{ ...styles.avatar, width: "30px", height: "30px", fontSize: "0.8rem", background: getAvatarGradient(u.name || u.username) }}>
                      {(u.name || u.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{u.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>@{u.username}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLinkSingleNote(u.id, selectedNoteForLinking.id)}
                    disabled={linking}
                    className="btn btn-primary"
                    style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
                  >
                    {linking ? "Linking…" : "Link"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  }
}

const styles: Record<string, React.CSSProperties> = {
  /* Contact row - 100% matching Your Contacts */
  contactCard: {
    display: "flex",
    flexDirection: "column",
    padding: "0.6rem 0.85rem",
    borderRadius: "14px",
    background: "var(--card-bg)",
    border: "1px solid var(--border-light)",
    cursor: "pointer",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
  },
  contactLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    flex: 1,
    minWidth: 0,
  },
  contactRight: {
    display: "flex",
    alignItems: "center",
    gap: "0.65rem",
    flexShrink: 0,
  },
  contactName: {
    fontSize: "0.92rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    color: "#fff",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.92rem",
    flexShrink: 0,
  },
  settledBadge: {
    fontSize: "0.72rem",
    color: "var(--text-muted)",
    background: "var(--surface-hover)",
    padding: "0.15rem 0.5rem",
    borderRadius: "20px",
    fontWeight: 600,
  },
  emptyCard: {
    padding: "2.75rem 1.5rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    borderRadius: "16px",
  },

  /* Dedicated Top Navigation */
  detailTopNav: {
    display: "flex",
    alignItems: "center",
    marginBottom: "0.15rem",
  },
  detailBackBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "0.35rem 0.5rem",
    borderRadius: "8px",
    transition: "color 0.15s ease",
  },

  /* Profile Header Card */
  friendHeaderCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.85rem 1rem",
    gap: "0.75rem",
    borderRadius: "14px",
  },
  compactSettleBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    background: "var(--primary)",
    color: "#fff",
    border: "none",
    padding: "0.45rem 0.85rem",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
    transition: "transform 0.1s ease",
  },
  registeredMiniBadge: {
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "var(--primary)",
    background: "rgba(16, 185, 129, 0.1)",
    border: "1px solid rgba(16, 185, 129, 0.25)",
    padding: "0.08rem 0.4rem",
    borderRadius: "6px",
  },

  /* Transaction Items (Matching Image & Contact History) */
  expenseCardContainer: {
    padding: 0,
    overflow: "hidden",
    border: "1px solid var(--border-light)",
    borderRadius: "14px",
    background: "var(--card-bg)",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
  },
  expenseRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.85rem 1.15rem",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    gap: "0.75rem",
  },
  expenseRowLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.85rem",
    minWidth: 0,
    flex: 1,
  },
  expenseDateBadge: {
    width: "38px",
    height: "38px",
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dateMonth: {
    fontSize: "0.6rem",
    textTransform: "uppercase",
    fontWeight: 700,
    color: "var(--text-muted)",
    lineHeight: 1,
  },
  dateDay: {
    fontSize: "0.92rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
    lineHeight: 1.1,
    marginTop: "1px",
  },
  categoryIconBadge: {
    width: "36px",
    height: "36px",
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  expenseTitleCol: {
    display: "flex",
    flexDirection: "column",
    gap: "0.1rem",
    minWidth: 0,
  },
  expenseTitle: {
    fontSize: "0.92rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  expensePayerText: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  expenseRowRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.1rem",
    flexShrink: 0,
    textAlign: "right",
  },

  /* Modals */
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "1rem",
  },
  modalCard: {
    width: "100%",
    maxWidth: "460px",
    padding: "1.35rem 1.45rem",
    borderRadius: "16px",
    boxShadow: "0 12px 35px rgba(0, 0, 0, 0.25)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: "1.05rem",
    fontWeight: 750,
    color: "var(--text-primary)",
    margin: 0,
  },
  modalCloseBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "0.25rem",
    borderRadius: "6px",
  },
  fieldLabel: {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: "0.3rem",
  },

  /* Direction Toggle */
  directionToggleContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.35rem",
    background: "var(--surface-hover)",
    padding: "3px",
    borderRadius: "10px",
    border: "1px solid var(--border-light)",
  },
  directionBtn: {
    padding: "0.45rem",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    background: "transparent",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  directionBtnLentActive: {
    padding: "0.45rem",
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "#fff",
    background: "var(--primary)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(16, 185, 129, 0.25)",
  },
  directionBtnBorrowActive: {
    padding: "0.45rem",
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "#fff",
    background: "#f59e0b",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(245, 158, 11, 0.25)",
  },

  /* Action Buttons inside modals */
  actionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "0.35rem 0.65rem",
    borderRadius: "8px",
    border: "1px solid var(--border-light)",
    background: "var(--surface)",
    color: "var(--text-primary)",
    cursor: "pointer",
  },
  actionBtnSettled: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "0.35rem 0.65rem",
    borderRadius: "8px",
    border: "1px solid rgba(16, 185, 129, 0.35)",
    background: "rgba(16, 185, 129, 0.08)",
    color: "var(--primary)",
    cursor: "pointer",
  },
  actionBtnLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    fontSize: "0.78rem",
    fontWeight: 600,
    padding: "0.4rem 0.75rem",
    borderRadius: "8px",
    border: "1px solid var(--border-light)",
    background: "var(--surface)",
    color: "var(--text-primary)",
    cursor: "pointer",
  },
  deleteBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    padding: "0.35rem",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Settings Modal Sections */
  settingsSectionBox: {
    padding: "0.75rem 0.85rem",
    borderRadius: "12px",
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
    display: "flex",
    flexDirection: "column",
    gap: "0.45rem",
  },
  settingsSectionLabel: {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  settingsActionRowBtn: {
    display: "flex",
    alignItems: "center",
    gap: "0.55rem",
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    background: "var(--surface)",
    border: "1px solid var(--border-light)",
    padding: "0.5rem 0.75rem",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
  },

  /* Suggestions & Link rows */
  matchedSuggestionsBox: {
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
    borderRadius: "10px",
    padding: "0.55rem 0.75rem",
    marginTop: "0.45rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  suggestionUserRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
    padding: "0.3rem 0.45rem",
    borderRadius: "8px",
    background: "var(--surface)",
    border: "1px solid var(--border-light)",
  },
  suggestionSelectBtn: {
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
    borderRadius: "6px",
    padding: "0.2rem 0.5rem",
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "var(--primary)",
    cursor: "pointer",
    flexShrink: 0,
  },
  userResultRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.55rem 0.75rem",
    borderRadius: "10px",
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
  },
};
