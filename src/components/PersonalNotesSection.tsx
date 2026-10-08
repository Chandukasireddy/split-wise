"use client";

import React, { useState } from "react";
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
  TrendingUp,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import {
  FriendNotesData,
  FriendNoteItem,
  addFriendNote,
  toggleSettleFriendNote,
  deleteFriendNote,
  linkNoteToRegisteredUser,
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
  const [filter, setFilter] = useState<"pending" | "settled" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Add Note Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [noteType, setNoteType] = useState<"LENT" | "BORROWED">("LENT");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [category, setCategory] = useState("General");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Link Note Modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<FriendNoteItem | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<{ id: string; name: string; username: string }[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Live matching of registered users in Add Note modal
  const [matchedRegisteredUsers, setMatchedRegisteredUsers] = useState<
    { id: string; name: string; username: string }[]
  >([]);

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

  // Filter notes
  const filteredNotes = notesData.notes.filter((note) => {
    // Status filter
    if (filter === "pending" && note.isSettled) return false;
    if (filter === "settled" && !note.isSettled) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = note.friendName.toLowerCase().includes(q);
      const matchDesc = note.description?.toLowerCase().includes(q) || false;
      return matchName || matchDesc;
    }
    return true;
  });

  const pendingCount = notesData.notes.filter((n) => !n.isSettled).length;
  const settledCount = notesData.notes.filter((n) => n.isSettled).length;

  // Add Note submit
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }
    if (!friendName.trim()) {
      setError("Friend name is required.");
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

  function resetAddForm() {
    setFriendName("");
    setNoteType("LENT");
    setAmount("");
    setCurrency("EUR");
    setCategory("General");
    setDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setMatchedRegisteredUsers([]);
    setError(null);
  }

  // Toggle Settle
  async function handleToggleSettle(noteId: string) {
    try {
      const res = await toggleSettleFriendNote(noteId);
      if (res.success) {
        await onRefreshNotes();
      }
    } catch (err) {
      console.error("Error updating note settle status:", err);
    }
  }

  // Delete Note
  async function handleDelete(noteId: string) {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      const res = await deleteFriendNote(noteId);
      if (res.success) {
        await onRefreshNotes();
      }
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  }

  // Open Link Modal
  function openLinkModal(note: FriendNoteItem) {
    setSelectedNote(note);
    setUserSearch(note.friendName);
    setUserResults([]);
    setLinkError(null);
    setShowLinkModal(true);
    // Pre-trigger search with friendName
    handleSearchUsers(note.friendName);
  }

  async function handleSearchUsers(query: string) {
    setUserSearch(query);
    if (query.trim().length < 2) {
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

  // Submit Link
  async function handleLinkUser(targetUserId: string, noteId?: string) {
    const targetNoteId = noteId || selectedNote?.id;
    if (!targetNoteId) return;
    setLinking(true);
    setLinkError(null);

    try {
      const res = await linkNoteToRegisteredUser(targetNoteId, targetUserId);
      if (res.success) {
        setShowLinkModal(false);
        setSelectedNote(null);
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

  // Check currencies for summary cards
  const currencyKeys = Object.keys(notesData.totalsByCurrency);
  const primaryCurrency = currencyKeys[0] || "EUR";
  const primaryTotals = notesData.totalsByCurrency[primaryCurrency] || { lent: 0, borrowed: 0, net: 0 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", width: "100%" }}>
      {/* ─────────────────────────────────────────────────────────────
          1. SUMMARY CARDS
      ───────────────────────────────────────────────────────────── */}
      <div style={styles.summaryGrid}>
        <div className="glass-card" style={styles.summaryCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={styles.summaryLabel}>Total Lent</span>
            <div style={{ ...styles.iconPill, background: "rgba(16, 185, 129, 0.12)", color: "var(--owed)" }}>
              <TrendingUp size={15} />
            </div>
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--owed)", marginTop: "0.35rem" }}>
            {formatCurrency(primaryTotals.lent, primaryCurrency)}
          </div>
          <span style={styles.summarySubtext}>Friends owe you</span>
        </div>

        <div className="glass-card" style={styles.summaryCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={styles.summaryLabel}>Total Borrowed</span>
            <div style={{ ...styles.iconPill, background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b" }}>
              <TrendingDown size={15} />
            </div>
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#f59e0b", marginTop: "0.35rem" }}>
            {formatCurrency(primaryTotals.borrowed, primaryCurrency)}
          </div>
          <span style={styles.summarySubtext}>You owe friends</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. CONTROLS BAR (Filters + Search)
      ───────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        {/* Filter Pills */}
        <div style={styles.filterPillsGroup}>
          <button
            type="button"
            onClick={() => setFilter("pending")}
            style={filter === "pending" ? styles.filterPillActive : styles.filterPill}
          >
            <span>Pending</span>
            <span style={styles.pillCount}>{pendingCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("settled")}
            style={filter === "settled" ? styles.filterPillActive : styles.filterPill}
          >
            <span>Settled</span>
            <span style={styles.pillCount}>{settledCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            style={filter === "all" ? styles.filterPillActive : styles.filterPill}
          >
            <span>All</span>
            <span style={styles.pillCount}>{notesData.notes.length}</span>
          </button>
        </div>

        {/* Search */}
        <div style={styles.searchBox}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search note or friend..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--text-muted)" }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. NOTES LIST
      ───────────────────────────────────────────────────────────── */}
      {filteredNotes.length === 0 ? (
        <div className="glass-card" style={styles.emptyCard}>
          <StickyNote size={38} color="var(--text-muted)" style={{ marginBottom: "0.65rem", opacity: 0.8 }} />
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.3rem" }}>
            {searchQuery
              ? `No notes matching "${searchQuery}"`
              : filter === "settled"
              ? "No settled notes yet"
              : "No pending notes"}
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "340px", marginBottom: "1rem" }}>
            Record payments with friends who aren&apos;t registered on SplitEasy yet. When they join, link them with 1-click!
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
            <span>Add a Note</span>
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          {filteredNotes.map((note) => {
            const isLent = note.type === "LENT";
            const catColor = CATEGORY_COLORS[note.category] || "#64748b";

            return (
              <div
                key={note.id}
                className="glass-card"
                style={{
                  ...styles.noteCard,
                  opacity: note.isSettled ? 0.65 : 1,
                  borderLeft: `4px solid ${note.isSettled ? "var(--border-light)" : isLent ? "var(--owed)" : "#f59e0b"}`,
                }}
              >
                {/* Top Row: Avatar + Friend Info + Direction/Amount */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, flex: 1 }}>
                    <div style={{ ...styles.avatar, background: getAvatarGradient(note.friendName) }}>
                      {note.friendName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                        <h3 style={styles.friendName}>{note.friendName}</h3>
                        {note.matchedUser ? (
                          <span style={styles.matchedRegisteredTag}>
                            registered: @{note.matchedUser.username}
                          </span>
                        ) : (
                          <span style={styles.unregisteredTag}>unregistered</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.15rem", flexWrap: "wrap" }}>
                        <span style={styles.dateText}>{formatDate(note.date)}</span>
                        <span
                          style={{
                            ...styles.categoryBadge,
                            backgroundColor: `${catColor}15`,
                            color: catColor,
                            borderColor: `${catColor}30`,
                          }}
                        >
                          {getCategoryIcon(note.category, 12)}
                          <span>{note.category}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Amount & Direction */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {note.isSettled ? (
                      <span style={styles.settledTag}>settled</span>
                    ) : (
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: isLent ? "var(--owed)" : "#f59e0b" }}>
                        {isLent ? "owes you" : "you owe"}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: 800,
                        color: note.isSettled ? "var(--text-muted)" : isLent ? "var(--owed)" : "#f59e0b",
                        textDecoration: note.isSettled ? "line-through" : "none",
                      }}
                    >
                      {formatCurrency(note.amount, note.currency)}
                    </div>
                  </div>
                </div>

                {/* Optional Note Description */}
                {note.description && (
                  <p style={styles.noteDescription}>
                    &ldquo;{note.description}&rdquo;
                  </p>
                )}

                {/* Bottom Action Buttons */}
                <div style={styles.noteActionsRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    {/* Settle Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleSettle(note.id)}
                      style={note.isSettled ? styles.actionBtnSettled : styles.actionBtn}
                      title={note.isSettled ? "Mark as pending" : "Mark as settled"}
                    >
                      <CheckCircle2 size={13} color={note.isSettled ? "var(--primary)" : "var(--text-muted)"} />
                      <span>{note.isSettled ? "Settled" : "Settle"}</span>
                    </button>

                    {/* Link to Registered User or Move to Friends */}
                    {!note.isSettled && (
                      <button
                        type="button"
                        onClick={() => {
                          if (note.matchedUser) {
                            if (
                              confirm(
                                `Move this note into your shared friends ledger with @${note.matchedUser.username}?`
                              )
                            ) {
                              handleLinkUser(note.matchedUser.id, note.id);
                            }
                          } else {
                            openLinkModal(note);
                          }
                        }}
                        style={note.matchedUser ? styles.actionBtnMove : styles.actionBtnLink}
                        title={
                          note.matchedUser
                            ? `Move note to friends ledger with @${note.matchedUser.username}`
                            : "Link to registered user when they join"
                        }
                      >
                        <Link2 size={13} />
                        <span>
                          {note.matchedUser
                            ? `Move to Friends (@${note.matchedUser.username})`
                            : "Link to User"}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    style={styles.deleteBtn}
                    title="Delete note"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. ADD NOTE PILL BUTTON AT BOTTOM
      ───────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "0.4rem" }}>
        <button
          type="button"
          onClick={() => {
            resetAddForm();
            setShowAddModal(true);
          }}
          className="group-add-pill"
          title="Add a new debt note for an unregistered friend"
        >
          <Plus size={15} strokeWidth={2.2} />
          <span>Add personal note</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: ADD FRIEND NOTE
      ───────────────────────────────────────────────────────────── */}
      {showAddModal && typeof document !== "undefined" && createPortal(
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <StickyNote size={20} color="var(--primary)" />
                <h3 style={styles.modalTitle}>Add Personal Note</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={styles.closeBtn}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Make a note of money lent or borrowed with an unregistered friend.
            </p>

            {error && (
              <div style={styles.errorAlert}>
                {error}
              </div>
            )}

            <form onSubmit={handleAddSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {/* Direction Toggle */}
              <div style={styles.typeToggleWrapper}>
                <button
                  type="button"
                  onClick={() => setNoteType("LENT")}
                  style={noteType === "LENT" ? styles.typeBtnLentActive : styles.typeBtn}
                >
                  <TrendingUp size={14} />
                  <span>They owe me (I lent)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNoteType("BORROWED")}
                  style={noteType === "BORROWED" ? styles.typeBtnBorrowedActive : styles.typeBtn}
                >
                  <TrendingDown size={14} />
                  <span>I owe them (I borrowed)</span>
                </button>
              </div>

              {/* Friend Name */}
              <div>
                <label style={styles.label}>Friend&apos;s Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh, Alex, Roommate"
                  value={friendName}
                  onChange={(e) => handleFriendNameChange(e.target.value)}
                  required
                  autoFocus
                  style={styles.input}
                />
                {matchedRegisteredUsers.length > 0 && (
                  <div style={styles.matchedSuggestionsBox}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", color: "var(--primary)", fontWeight: 700 }}>
                      <Sparkles size={12} />
                      <span>Registered user found on SplitEasy:</span>
                    </div>
                    {matchedRegisteredUsers.slice(0, 3).map((u) => (
                      <div key={u.id} style={styles.suggestionUserRow}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", minWidth: 0, flex: 1 }}>
                          <div style={{ ...styles.resultAvatar, width: "24px", height: "24px", fontSize: "0.72rem", background: getAvatarGradient(u.id || u.name) }}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>{u.name}</span>{" "}
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>@{u.username}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFriendName(u.name);
                            setMatchedRegisteredUsers([]);
                          }}
                          style={styles.suggestionSelectBtn}
                          title="Save as private personal note for this user"
                        >
                          Keep as Note
                        </button>
                      </div>
                    ))}
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                      💡 Private notes are only visible to you. You can move them to Friends anytime to request payment!
                    </div>
                  </div>
                )}
                {notesData.uniqueFriendNames.length > 0 && !friendName && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Recent:</span>
                    {notesData.uniqueFriendNames.slice(0, 4).map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setFriendName(name)}
                        style={styles.recentNameChip}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount & Currency */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "0.5rem" }}>
                <div>
                  <label style={styles.label}>Amount</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={styles.label}>Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={styles.select}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category & Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={styles.label}>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={styles.select}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={styles.label}>Description / Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Lunch at canteen, Movie tickets, Groceries"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.4rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: "0.6rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: "0.6rem" }}
                >
                  {saving ? "Saving..." : "Save Note"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: LINK NOTE TO REGISTERED USER
      ───────────────────────────────────────────────────────────── */}
      {showLinkModal && selectedNote && typeof document !== "undefined" && createPortal(
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Link2 size={20} color="var(--primary)" />
                <h3 style={styles.modalTitle}>Link to SplitEasy User</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLinkModal(false);
                  setSelectedNote(null);
                }}
                style={styles.closeBtn}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.85rem" }}>
              Migrate this note for <strong>{selectedNote.friendName}</strong> into a real 1-on-1 SplitEasy expense once they join the app.
            </p>

            {/* Note details snippet */}
            <div style={styles.noteSnippetCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  {selectedNote.type === "LENT" ? "You lent" : "You borrowed"}
                </span>
                <span
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    color: selectedNote.type === "LENT" ? "var(--owed)" : "#f59e0b",
                  }}
                >
                  {formatCurrency(selectedNote.amount, selectedNote.currency)}
                </span>
              </div>
              {selectedNote.description && (
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  &ldquo;{selectedNote.description}&rdquo;
                </div>
              )}
            </div>

            {linkError && (
              <div style={styles.errorAlert}>
                {linkError}
              </div>
            )}

            {/* Search registered user */}
            <label style={styles.label}>Search Registered Users</label>
            <div style={styles.searchBarWrapper}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search name or username..."
                value={userSearch}
                onChange={(e) => handleSearchUsers(e.target.value)}
                autoFocus
                style={styles.searchInputModal}
              />
              {searchingUsers && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Searching...</span>}
            </div>

            {/* Search results */}
            <div style={styles.resultsContainer}>
              {userResults.length > 0 ? (
                userResults.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => !linking && handleLinkUser(u.id)}
                    style={styles.userResultRow}
                  >
                    <div style={{ ...styles.resultAvatar, background: getAvatarGradient(u.id || u.name) }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text-primary)" }}>{u.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>@{u.username}</div>
                    </div>
                    <button
                      type="button"
                      disabled={linking}
                      className="btn btn-primary"
                      style={{ fontSize: "0.76rem", padding: "0.35rem 0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      <UserCheck size={13} />
                      <span>{linking ? "Linking..." : "Link & Convert"}</span>
                    </button>
                  </div>
                ))
              ) : userSearch.trim().length >= 2 ? (
                <div style={{ textAlign: "center", padding: "1.25rem", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  No users found matching &quot;{userSearch}&quot;
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "1.25rem", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  Type a name or username to search SplitEasy users
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.65rem",
  },
  summaryCard: {
    padding: "0.85rem 1rem",
    borderRadius: "14px",
    display: "flex",
    flexDirection: "column",
  },
  summaryLabel: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  summarySubtext: {
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    marginTop: "0.15rem",
  },
  iconPill: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  filterPillsGroup: {
    display: "inline-flex",
    alignItems: "center",
    background: "var(--surface-hover)",
    padding: "3px",
    borderRadius: "10px",
    border: "1px solid var(--border-light)",
    gap: "3px",
  },
  filterPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.35rem 0.65rem",
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    background: "transparent",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  filterPillActive: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.35rem 0.65rem",
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    background: "var(--surface)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  },
  pillCount: {
    fontSize: "0.68rem",
    padding: "0.05rem 0.35rem",
    borderRadius: "9999px",
    background: "var(--border-light)",
    color: "var(--text-secondary)",
  },
  searchBox: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.45rem",
    background: "var(--surface)",
    border: "1px solid var(--border-light)",
    borderRadius: "10px",
    padding: "0.35rem 0.65rem",
    flex: "1 1 200px",
    maxWidth: "260px",
  },
  searchInput: {
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: "0.8rem",
    color: "var(--text-primary)",
    width: "100%",
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
  noteCard: {
    padding: "0.95rem 1.1rem",
    borderRadius: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "0.65rem",
    transition: "all 0.18s ease",
  },
  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    color: "#fff",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.95rem",
    flexShrink: 0,
  },
  friendName: {
    fontSize: "0.95rem",
    fontWeight: 750,
    color: "var(--text-primary)",
    margin: 0,
  },
  unregisteredTag: {
    fontSize: "0.65rem",
    padding: "0.1rem 0.4rem",
    borderRadius: "9999px",
    background: "var(--surface-hover)",
    color: "var(--text-muted)",
    border: "1px solid var(--border-light)",
    fontWeight: 600,
  },
  matchedRegisteredTag: {
    fontSize: "0.65rem",
    padding: "0.1rem 0.45rem",
    borderRadius: "9999px",
    background: "var(--primary-glow)",
    color: "var(--primary)",
    border: "1px solid var(--primary)",
    fontWeight: 700,
  },
  dateText: {
    fontSize: "0.72rem",
    color: "var(--text-muted)",
  },
  categoryBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    fontSize: "0.68rem",
    fontWeight: 600,
    padding: "0.12rem 0.45rem",
    borderRadius: "6px",
    border: "1px solid transparent",
  },
  settledTag: {
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    background: "var(--surface-hover)",
    padding: "0.1rem 0.4rem",
    borderRadius: "6px",
    display: "inline-block",
  },
  noteDescription: {
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    margin: 0,
    fontStyle: "italic",
    background: "var(--surface-hover)",
    padding: "0.4rem 0.65rem",
    borderRadius: "8px",
    borderLeft: "2px solid var(--border-light)",
  },
  noteActionsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderTop: "1px solid var(--border-light)",
    paddingTop: "0.55rem",
    marginTop: "0.1rem",
  },
  actionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.3rem 0.6rem",
    borderRadius: "8px",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  actionBtnSettled: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.3rem 0.6rem",
    borderRadius: "8px",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "var(--primary)",
    background: "var(--primary-glow)",
    border: "1px solid var(--primary)",
    cursor: "pointer",
  },
  actionBtnLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.3rem 0.65rem",
    borderRadius: "8px",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--primary)",
    background: "var(--surface)",
    border: "1px solid var(--border-light)",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  actionBtnMove: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.3rem 0.65rem",
    borderRadius: "8px",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#ffffff",
    background: "var(--primary)",
    border: "none",
    cursor: "pointer",
    transition: "opacity 0.15s ease",
  },
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
  deleteBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "0.3rem",
    borderRadius: "6px",
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
    background: "var(--surface)",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "460px",
    padding: "1.35rem",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.35rem",
  },
  modalTitle: {
    fontSize: "1.1rem",
    fontWeight: 800,
    color: "var(--text-primary)",
    margin: 0,
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
  },
  errorAlert: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    color: "#ef4444",
    padding: "0.55rem 0.75rem",
    borderRadius: "8px",
    fontSize: "0.8rem",
    marginBottom: "0.65rem",
  },
  label: {
    display: "block",
    fontSize: "0.76rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
    marginBottom: "0.25rem",
  },
  input: {
    width: "100%",
    padding: "0.55rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid var(--border-light)",
    background: "var(--input-bg)",
    color: "var(--text-primary)",
    fontSize: "0.85rem",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "0.55rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid var(--border-light)",
    background: "var(--input-bg)",
    color: "var(--text-primary)",
    fontSize: "0.85rem",
    outline: "none",
    boxSizing: "border-box",
  },
  typeToggleWrapper: {
    display: "flex",
    gap: "0.45rem",
  },
  typeBtn: {
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.4rem",
    padding: "0.55rem 0.5rem",
    borderRadius: "10px",
    border: "1px solid var(--border-light)",
    background: "var(--surface-hover)",
    color: "var(--text-secondary)",
    fontSize: "0.78rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  typeBtnLentActive: {
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.4rem",
    padding: "0.55rem 0.5rem",
    borderRadius: "10px",
    border: "1.5px solid var(--owed)",
    background: "var(--owed-glow)",
    color: "var(--owed)",
    fontSize: "0.78rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  typeBtnBorrowedActive: {
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.4rem",
    padding: "0.55rem 0.5rem",
    borderRadius: "10px",
    border: "1.5px solid #f59e0b",
    background: "rgba(245, 158, 11, 0.12)",
    color: "#f59e0b",
    fontSize: "0.78rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  recentNameChip: {
    fontSize: "0.68rem",
    padding: "0.15rem 0.45rem",
    borderRadius: "6px",
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
    color: "var(--text-secondary)",
    cursor: "pointer",
  },
  noteSnippetCard: {
    padding: "0.65rem 0.85rem",
    borderRadius: "10px",
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
    marginBottom: "0.85rem",
  },
  searchBarWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.55rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid var(--border-light)",
    background: "var(--input-bg)",
    marginBottom: "0.75rem",
  },
  searchInputModal: {
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: "0.85rem",
    color: "var(--text-primary)",
    width: "100%",
  },
  resultsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.45rem",
    maxHeight: "220px",
    overflowY: "auto",
  },
  userResultRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.65rem",
    padding: "0.55rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid var(--border-light)",
    background: "var(--surface)",
    cursor: "pointer",
  },
  resultAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    color: "#fff",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
    flexShrink: 0,
  },
};

