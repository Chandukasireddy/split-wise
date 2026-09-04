"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Plus,
  ArrowLeft,
  DollarSign,
  ChevronRight,
  Sparkles,
  UserPlus,
  X,
  Trash2,
  Utensils,
  Plane,
  Zap,
  Film,
  Receipt,
  PiggyBank,
} from "lucide-react";
import { searchUsers, addMembersToGroup } from "@/app/actions/groupActions";
import {
  FriendInfo,
  GroupInfo,
  FriendLedgerData,
  FriendLedgerTransaction,
  getFriendLedger,
} from "@/app/actions/userActions";
import { addExpense, updateExpense, deleteExpense } from "@/app/actions/expenseActions";
import { settleUp } from "@/app/actions/settleActions";

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
  Payment: "#10b981",
};

function getCategoryIcon(cat: string, size = 16) {
  switch (cat) {
    case "Food & Dining":
      return <Utensils size={size} />;
    case "Travel & Transport":
      return <Plane size={size} />;
    case "Utilities & Bills":
      return <Zap size={size} />;
    case "Entertainment":
      return <Film size={size} />;
    case "Payment":
      return <PiggyBank size={size} />;
    default:
      return <Receipt size={size} />;
  }
}

function formatCurrency(amount: number, currency: string = "EUR") {
  return new Intl.NumberFormat("en-EU", { style: "currency", currency }).format(amount);
}

interface CurrentUserProps {
  userId: string;
  username: string;
  name: string;
}

interface FriendsClientProps {
  initialFriends: FriendInfo[];
  userGroups: GroupInfo[];
  currentUser: CurrentUserProps | null;
}

export default function FriendsClient({
  initialFriends,
  userGroups,
  currentUser,
}: FriendsClientProps) {
  const [friends, setFriends] = useState<FriendInfo[]>(initialFriends);
  const [selectedFriend, setSelectedFriend] = useState<FriendInfo | null>(null);

  // Search for any user
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; username: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Selected friend's ledger state
  const [ledger, setLedger] = useState<FriendLedgerData | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Add Expense Modal state
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmt, setExpenseAmt] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("General");
  const [expenseCurrency, setExpenseCurrency] = useState("EUR");
  const [expenseDate, setExpenseDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [expensePayerId, setExpensePayerId] = useState<string>(currentUser?.userId || "");
  const [splitEqually, setSplitEqually] = useState(true);
  const [customUserAmount, setCustomUserAmount] = useState("");
  const [customFriendAmount, setCustomFriendAmount] = useState("");
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // Edit Expense Modal state
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FriendLedgerTransaction | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmt, setEditAmt] = useState("");
  const [editCategory, setEditCategory] = useState("General");
  const [editCurrency, setEditCurrency] = useState("EUR");
  const [editDate, setEditDate] = useState("");
  const [editPayerId, setEditPayerId] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Settle Up Modal state
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settlePayerId, setSettlePayerId] = useState("");
  const [settlePayeeId, setSettlePayeeId] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleCurrency, setSettleCurrency] = useState("EUR");
  const [settleDate, setSettleDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  // Add to Group Modal state
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState(userGroups[0]?.id || "");
  const [addingToGroup, setAddingToGroup] = useState(false);
  const [groupSuccess, setGroupSuccess] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);

  // Portal mount flag
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Lock scroll when modal is open
  const isAnyModalOpen =
    showAddExpenseModal ||
    showEditExpenseModal ||
    showSettleModal ||
    showAddToGroupModal;

  useEffect(() => {
    if (isAnyModalOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isAnyModalOpen]);

  // Load ledger when selectedFriend changes
  useEffect(() => {
    if (!selectedFriend) return;

    let isSubscribed = true;
    getFriendLedger(selectedFriend.id)
      .then((data) => {
        if (isSubscribed) {
          setLedger(data);
          setLoadingLedger(false);
        }
      })
      .catch((err) => {
        console.error("Error loading ledger:", err);
        if (isSubscribed) setLoadingLedger(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [selectedFriend]);

  // Helper to open a friend's ledger
  function handleOpenFriend(friend: FriendInfo) {
    setLedger(null);
    setLoadingLedger(true);
    setSelectedFriend(friend);
  }

  // Refresh ledger data
  async function reloadLedger(friendId: string) {
    const data = await getFriendLedger(friendId);
    if (data) {
      setLedger(data);
      // Update balance in friends list
      setFriends((prev) =>
        prev.map((f) => (f.id === friendId ? { ...f, balances: data.balances } : f))
      );
    }
  }

  // Handle Search Users
  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(query.trim());
      // Filter out current user
      setSearchResults(results.filter((u) => u.id !== currentUser?.userId));
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }

  // Select a user to open 1-on-1 ledger
  function handleSelectUser(user: { id: string; name: string; username: string }) {
    const existing = friends.find((f) => f.id === user.id);
    if (existing) {
      handleOpenFriend(existing);
    } else {
      const newFriend: FriendInfo = {
        id: user.id,
        name: user.name,
        username: user.username,
        sharedGroups: [],
        balances: {},
      };
      setFriends((prev) => [newFriend, ...prev]);
      handleOpenFriend(newFriend);
    }
    setSearchQuery("");
    setSearchResults([]);
    setSearchFocused(false);
  }

  // Open Settle Up modal pre-filled
  function openSettleUpModal() {
    if (!selectedFriend || !currentUser) return;
    setSettleError(null);

    // Check primary balance
    const currs = Object.keys(ledger?.balances || {});
    const primaryCurrency = currs[0] || "EUR";
    const net = ledger?.balances[primaryCurrency] || 0;

    if (net > 0) {
      // Friend owes user => Friend pays, User receives
      setSettlePayerId(selectedFriend.id);
      setSettlePayeeId(currentUser.userId);
      setSettleAmount(net.toFixed(2));
    } else if (net < 0) {
      // User owes friend => User pays, Friend receives
      setSettlePayerId(currentUser.userId);
      setSettlePayeeId(selectedFriend.id);
      setSettleAmount(Math.abs(net).toFixed(2));
    } else {
      // Settled or 0
      setSettlePayerId(currentUser.userId);
      setSettlePayeeId(selectedFriend.id);
      setSettleAmount("");
    }

    setSettleCurrency(primaryCurrency);
    setSettleDate(new Date().toISOString().split("T")[0]);
    setShowSettleModal(true);
  }

  // Submit Settle Up
  async function handleSettleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFriend || !currentUser) return;

    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      setSettleError("Please enter a valid amount.");
      return;
    }

    setSettleLoading(true);
    setSettleError(null);

    try {
      const res = await settleUp(
        amt,
        settleCurrency,
        null, // Direct 1-on-1 payment
        settlePayerId,
        settlePayeeId,
        settleDate
      );

      if (res.success) {
        setShowSettleModal(false);
        await reloadLedger(selectedFriend.id);
      } else {
        setSettleError(res.error || "Failed to record payment.");
      }
    } catch (err) {
      console.error(err);
      setSettleError("An unexpected error occurred.");
    } finally {
      setSettleLoading(false);
    }
  }

  // Open Add Expense modal
  function openAddExpenseModal() {
    if (!selectedFriend || !currentUser) return;
    setExpenseError(null);
    setExpenseDesc("");
    setExpenseAmt("");
    setExpenseCategory("General");
    setExpenseCurrency("EUR");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setExpensePayerId(currentUser.userId);
    setSplitEqually(true);
    setCustomUserAmount("");
    setCustomFriendAmount("");
    setShowAddExpenseModal(true);
  }

  // Submit 1-on-1 Expense
  async function handleAddExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFriend || !currentUser) return;

    const total = parseFloat(expenseAmt);
    if (isNaN(total) || total <= 0) {
      setExpenseError("Please enter a valid amount.");
      return;
    }

    let splits: { userId: string; amount?: number }[] = [];
    let splitType: "EQUAL" | "UNEQUAL" = "EQUAL";

    if (splitEqually) {
      splitType = "EQUAL";
      splits = [
        { userId: currentUser.userId },
        { userId: selectedFriend.id },
      ];
    } else {
      splitType = "UNEQUAL";
      const uAmt = parseFloat(customUserAmount) || 0;
      const fAmt = parseFloat(customFriendAmount) || 0;
      if (Math.abs(uAmt + fAmt - total) > 0.02) {
        setExpenseError(`Sum of splits (${(uAmt + fAmt).toFixed(2)}) must equal total (${total.toFixed(2)}).`);
        return;
      }
      splits = [
        { userId: currentUser.userId, amount: uAmt },
        { userId: selectedFriend.id, amount: fAmt },
      ];
    }

    setExpenseLoading(true);
    setExpenseError(null);

    try {
      const res = await addExpense(
        expenseDesc,
        total,
        expenseCategory,
        expenseCurrency,
        null, // Direct 1-on-1
        expensePayerId,
        splitType,
        splits,
        1.0,
        expenseDate
      );

      if (res.success) {
        setShowAddExpenseModal(false);
        await reloadLedger(selectedFriend.id);
      } else {
        setExpenseError(res.error || "Failed to create expense.");
      }
    } catch (err) {
      console.error(err);
      setExpenseError("Failed to create expense.");
    } finally {
      setExpenseLoading(false);
    }
  }

  // Open Edit Expense Modal
  function openEditExpenseModal(tx: FriendLedgerTransaction) {
    if (tx.type !== "expense") return;
    setEditingExpense(tx);
    setEditDesc(tx.description);
    setEditAmt(tx.amount.toString());
    setEditCategory(tx.category);
    setEditCurrency(tx.currency);
    setEditDate(tx.date.split("T")[0]);
    setEditPayerId(tx.payerId);
    setEditError(null);
    setShowEditExpenseModal(true);
  }

  // Submit Edit Expense
  async function handleEditExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingExpense || !selectedFriend || !currentUser) return;

    const total = parseFloat(editAmt);
    if (isNaN(total) || total <= 0) {
      setEditError("Please enter a valid amount.");
      return;
    }

    setEditLoading(true);
    setEditError(null);

    try {
      const res = await updateExpense(
        editingExpense.id,
        editDesc,
        total,
        editCategory,
        editCurrency,
        editPayerId,
        "EQUAL",
        [{ userId: currentUser.userId }, { userId: selectedFriend.id }],
        1.0,
        editDate
      );

      if (res.success) {
        setShowEditExpenseModal(false);
        await reloadLedger(selectedFriend.id);
      } else {
        setEditError(res.error || "Failed to update expense.");
      }
    } catch (err) {
      console.error(err);
      setEditError("Failed to update expense.");
    } finally {
      setEditLoading(false);
    }
  }

  // Delete Expense
  async function handleDeleteExpense() {
    if (!editingExpense || !selectedFriend) return;
    if (!confirm("Are you sure you want to delete this expense?")) return;

    setDeleteLoading(true);
    try {
      const res = await deleteExpense(editingExpense.id);
      if (res.success) {
        setShowEditExpenseModal(false);
        await reloadLedger(selectedFriend.id);
      } else {
        setEditError(res.error || "Failed to delete expense.");
      }
    } catch (err) {
      console.error(err);
      setEditError("Failed to delete expense.");
    } finally {
      setDeleteLoading(false);
    }
  }

  // Add friend to group
  async function handleAddFriendToGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFriend || !targetGroupId) return;

    setAddingToGroup(true);
    setGroupError(null);
    setGroupSuccess(null);

    try {
      const res = await addMembersToGroup(targetGroupId, [selectedFriend.id]);
      if (res.success) {
        const groupName = userGroups.find((g) => g.id === targetGroupId)?.name || "Group";
        setGroupSuccess(`Added ${selectedFriend.name} to ${groupName}!`);
        setFriends((prev) =>
          prev.map((f) =>
            f.id === selectedFriend.id
              ? {
                  ...f,
                  sharedGroups: f.sharedGroups.includes(groupName)
                    ? f.sharedGroups
                    : [...f.sharedGroups, groupName],
                }
              : f
          )
        );
        setTimeout(() => setShowAddToGroupModal(false), 1200);
      } else {
        setGroupError(res.error || "Failed to add member.");
      }
    } catch (err) {
      console.error(err);
      setGroupError("An error occurred.");
    } finally {
      setAddingToGroup(false);
    }
  }

  // Primary balance for current friend
  const friendBalances = ledger?.balances || selectedFriend?.balances || {};
  const currs = Object.keys(friendBalances);
  const primaryCurrency = currs[0] || "EUR";
  const primaryNet = friendBalances[primaryCurrency] || 0;

  // Filtered friends in directory view
  const filteredFriends = friends.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q);
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: FRIENDS DIRECTORY (When no friend selected)
      ───────────────────────────────────────────────────────────── */}
      {!selectedFriend && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%", maxWidth: "800px", margin: "0 auto" }}>
          {/* Header */}
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>Friends</h1>
              <p style={styles.subtitle}>Direct 1-on-1 transactions and debts.</p>
            </div>
          </div>

          {/* User Search Bar */}
          <div style={{ position: "relative" }}>
            <div style={styles.searchBarWrapper}>
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search by name or username to start splitting…"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                style={styles.searchInput}
              />
              {searching && (
                <span style={{ fontSize: "0.75rem", color: "var(--primary)", flexShrink: 0 }}>
                  searching…
                </span>
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  style={styles.clearSearchBtn}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Live User Search Dropdown */}
            {searchFocused && searchResults.length > 0 && (
              <div style={styles.searchDropdown} className="glass-card">
                <div style={styles.searchDropdownHeader}>Registered Users</div>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    style={styles.searchResultItem}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div style={styles.searchResultAvatar}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={styles.searchResultName}>{user.name}</div>
                      <div style={styles.searchResultUsername}>@{user.username}</div>
                    </div>
                    <div style={styles.startTransBtn}>
                      <span>Split 1-on-1</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Friends List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Your Contacts ({filteredFriends.length})
              </h2>
            </div>

            {filteredFriends.length === 0 ? (
              <div className="glass-card" style={styles.emptyCard}>
                <Sparkles size={40} color="var(--text-muted)" style={{ marginBottom: "0.85rem" }} />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.35rem" }}>No friends added yet</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "320px", marginBottom: "1rem" }}>
                  Search any registered username above to start direct 1-on-1 transactions.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {filteredFriends.map((friend) => {
                  const friendCurrs = Object.keys(friend.balances);
                  const hasBal = friendCurrs.some((c) => friend.balances[c] !== 0);

                  return (
                    <div
                      key={friend.id}
                      onClick={() => handleOpenFriend(friend)}
                      className="glass-card"
                      style={styles.friendCard}
                      role="button"
                      tabIndex={0}
                    >
                      <div style={styles.friendLeft}>
                        <div style={styles.avatar}>
                          {friend.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <h3 style={styles.friendName}>{friend.name}</h3>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.15rem" }}>
                            <span style={styles.friendUsername}>@{friend.username}</span>
                            {friend.sharedGroups.slice(0, 2).map((g, i) => (
                              <span key={i} className="badge" style={styles.groupBadge}>
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div style={styles.friendRight}>
                        {!hasBal ? (
                          <span style={styles.settledBadge}>settled up</span>
                        ) : (
                          <div style={{ textAlign: "right" }}>
                            {friendCurrs.map((c) => {
                              const bal = friend.balances[c];
                              if (bal === 0) return null;
                              const owesUser = bal > 0;
                              return (
                                <div key={c}>
                                  <div style={{ fontSize: "0.72rem", color: owesUser ? "var(--owed)" : "#f59e0b", fontWeight: 600 }}>
                                    {owesUser ? "owes you" : "you owe"}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.95rem",
                                      fontWeight: 700,
                                      color: owesUser ? "var(--owed)" : "#f59e0b",
                                    }}
                                  >
                                    {formatCurrency(Math.abs(bal), c)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <ChevronRight size={17} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 2: 1-ON-1 TRANSACTION LEDGER (When friend is selected)
      ───────────────────────────────────────────────────────────── */}
      {selectedFriend && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%", maxWidth: "800px", margin: "0 auto" }}>
          {/* Top Bar Navigation */}
          <div style={styles.ledgerHeaderRow}>
            <button
              type="button"
              onClick={() => {
                setSelectedFriend(null);
                setLedger(null);
              }}
              style={styles.backBtn}
              title="Back to all friends"
            >
              <ArrowLeft size={18} />
              <span>Friends</span>
            </button>

            {userGroups.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setGroupSuccess(null);
                  setGroupError(null);
                  setShowAddToGroupModal(true);
                }}
                className="group-pill-badge"
                title="Add to a group"
              >
                <UserPlus size={14} />
                <span>Add to group</span>
              </button>
            )}
          </div>

          {/* Friend Profile & 1-on-1 Title */}
          <div style={styles.friendProfileCard} className="glass-card">
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div style={styles.largeAvatar}>
                {selectedFriend.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  {selectedFriend.name}
                </h1>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
                  @{selectedFriend.username}
                </p>
              </div>
            </div>

            {/* Direct Balance Status Banner */}
            <div style={styles.ledgerBalanceBanner}>
              {primaryNet > 0.01 ? (
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--owed)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Balance Status
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--owed)" }}>
                    {selectedFriend.name} owes you {formatCurrency(primaryNet, primaryCurrency)}
                  </div>
                </div>
              ) : primaryNet < -0.01 ? (
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Balance Status
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#f59e0b" }}>
                    You owe {selectedFriend.name} {formatCurrency(Math.abs(primaryNet), primaryCurrency)}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Balance Status
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                    You are all settled up with {selectedFriend.name}
                  </div>
                </div>
              )}

              {/* Settle Up Action Button */}
              <button
                type="button"
                onClick={openSettleUpModal}
                style={styles.settleUpBtn}
                title="Record a payment with this friend"
              >
                <PiggyBank size={16} />
                <span>Settle up</span>
              </button>
            </div>
          </div>

          {/* Transaction Ledger Feed */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Transaction History
              </h2>
              {ledger && (
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {ledger.transactions.length} record{ledger.transactions.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {loadingLedger ? (
              <div className="glass-card" style={styles.emptyCard}>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Loading transactions…</p>
              </div>
            ) : !ledger || ledger.transactions.length === 0 ? (
              <div className="glass-card" style={styles.emptyCard}>
                <DollarSign size={38} color="var(--text-muted)" style={{ marginBottom: "0.75rem" }} />
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                  No 1-on-1 transactions yet
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "280px", marginBottom: "1rem" }}>
                  Tap the button below to add your first direct bill split or shared expense with {selectedFriend.name}.
                </p>
                <button
                  type="button"
                  onClick={openAddExpenseModal}
                  className="btn btn-primary"
                  style={{ fontSize: "0.85rem", padding: "0.55rem 1.15rem" }}
                >
                  <Plus size={15} /> Add first expense
                </button>
              </div>
            ) : (
              <div className="glass-card" style={styles.expenseCardContainer}>
                {ledger.transactions.map((tx, index) => {
                  const catColor = CATEGORY_COLORS[tx.category] || "#64748b";
                  const isExpense = tx.type === "expense";
                  const dateObj = new Date(tx.date);

                  return (
                    <div
                      key={tx.id}
                      className="expense-row-item"
                      style={{
                        ...styles.expenseRow,
                        borderBottom:
                          index < ledger.transactions.length - 1
                            ? "1px solid var(--border-light)"
                            : "none",
                      }}
                      onClick={() => isExpense && openEditExpenseModal(tx)}
                      role="button"
                      tabIndex={0}
                      title={isExpense ? "Click to edit expense" : "Payment settlement"}
                    >
                      <div style={styles.expenseRowLeft}>
                        {/* Date badge */}
                        <div style={styles.expenseDateBadge}>
                          <span style={styles.dateMonth}>
                            {dateObj.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
                          </span>
                          <span style={styles.dateDay}>
                            {dateObj.toLocaleDateString("en-US", { day: "2-digit", timeZone: "UTC" })}
                          </span>
                        </div>

                        {/* Category icon */}
                        <div
                          style={{
                            ...styles.categoryIconBadge,
                            backgroundColor: `${catColor}15`,
                            color: catColor,
                            border: `1px solid ${catColor}35`,
                          }}
                          title={tx.category}
                        >
                          {getCategoryIcon(tx.category, 16)}
                        </div>

                        {/* Title & Payer info */}
                        <div style={styles.expenseTitleCol}>
                          <span style={styles.expenseTitle}>{tx.description}</span>
                          <span style={styles.expensePayerText}>
                            {tx.isPayer ? "You" : tx.payerName} paid {formatCurrency(tx.amount, tx.currency)}
                          </span>
                        </div>
                      </div>

                      {/* Split / Lent / Borrowed Amount */}
                      <div style={styles.expenseRowRight}>
                        {isExpense ? (
                          tx.isPayer ? (
                            <>
                              <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--owed)" }}>
                                you lent
                              </span>
                              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--owed)" }}>
                                {formatCurrency(tx.lentAmount, tx.currency)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#f59e0b" }}>
                                you borrowed
                              </span>
                              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f59e0b" }}>
                                {formatCurrency(tx.borrowedAmount, tx.currency)}
                              </span>
                            </>
                          )
                        ) : (
                          <>
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)" }}>
                              settlement
                            </span>
                            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--primary)" }}>
                              {formatCurrency(tx.amount, tx.currency)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Floating Action Button (Splitwise Mobile FAB) — Placed in exact same position */}
          <button
            type="button"
            onClick={openAddExpenseModal}
            className="splitwise-fab"
            title={`Add expense with ${selectedFriend.name}`}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Add expense</span>
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: ADD 1-ON-1 EXPENSE
      ───────────────────────────────────────────────────────────── */}
      {showAddExpenseModal && mounted && createPortal(
        <div
          className="modal-overlay-responsive"
          style={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddExpenseModal(false);
          }}
        >
          <div className="glass-card modal-card-responsive" style={styles.modalCard}>
            <div className="modal-drag-handle" />
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add 1-on-1 Expense</h2>
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="modal-close-btn-responsive"
                style={styles.modalCloseBtn}
              >
                <X size={20} />
              </button>
            </div>

            {expenseError && <div style={styles.errorBox}>{expenseError}</div>}

            <form onSubmit={handleAddExpenseSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label className="form-label">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Dinner, Movie ticket, Groceries"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="form-input"
                  required
                  autoFocus
                />
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={expenseAmt}
                    onChange={(e) => setExpenseAmt(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div style={{ width: "110px" }}>
                  <label className="form-label">Currency</label>
                  <select
                    value={expenseCurrency}
                    onChange={(e) => setExpenseCurrency(e.target.value)}
                    className="form-select"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="form-select"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Payer Toggle */}
              <div style={styles.formGroup}>
                <label className="form-label">Paid by</label>
                <div style={styles.toggleRow}>
                  <button
                    type="button"
                    onClick={() => setExpensePayerId(currentUser?.userId || "")}
                    style={{
                      ...styles.toggleBtn,
                      background: expensePayerId === currentUser?.userId ? "var(--primary)" : "var(--surface-hover)",
                      color: expensePayerId === currentUser?.userId ? "#fff" : "var(--text-secondary)",
                      border: expensePayerId === currentUser?.userId ? "none" : "1px solid var(--border-light)",
                    }}
                  >
                    You paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpensePayerId(selectedFriend?.id || "")}
                    style={{
                      ...styles.toggleBtn,
                      background: expensePayerId === selectedFriend?.id ? "var(--primary)" : "var(--surface-hover)",
                      color: expensePayerId === selectedFriend?.id ? "#fff" : "var(--text-secondary)",
                      border: expensePayerId === selectedFriend?.id ? "none" : "1px solid var(--border-light)",
                    }}
                  >
                    {selectedFriend?.name} paid
                  </button>
                </div>
              </div>

              {/* Split Mode Toggle */}
              <div style={styles.formGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Split between</label>
                  <button
                    type="button"
                    onClick={() => setSplitEqually(!splitEqually)}
                    style={{ background: "transparent", border: "none", color: "var(--primary)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    {splitEqually ? "Customize split" : "Split equally"}
                  </button>
                </div>

                {splitEqually ? (
                  <div style={styles.equalSplitInfo}>
                    <span>Split equally (50/50):</span>
                    <strong>
                      {expenseAmt && !isNaN(parseFloat(expenseAmt))
                        ? formatCurrency(parseFloat(expenseAmt) / 2, expenseCurrency)
                        : formatCurrency(0, expenseCurrency)}{" "}
                      each
                    </strong>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={styles.splitRow}>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>Your share:</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={customUserAmount}
                        onChange={(e) => setCustomUserAmount(e.target.value)}
                        className="form-input"
                        style={{ width: "120px" }}
                      />
                    </div>
                    <div style={styles.splitRow}>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{selectedFriend?.name}&apos;s share:</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={customFriendAmount}
                        onChange={(e) => setCustomFriendAmount(e.target.value)}
                        className="form-input"
                        style={{ width: "120px" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions-responsive" style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expenseLoading}
                  className="btn btn-primary"
                >
                  {expenseLoading ? "Saving…" : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: EDIT / DELETE 1-ON-1 EXPENSE
      ───────────────────────────────────────────────────────────── */}
      {showEditExpenseModal && editingExpense && mounted && createPortal(
        <div
          className="modal-overlay-responsive"
          style={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditExpenseModal(false);
          }}
        >
          <div className="glass-card modal-card-responsive" style={styles.modalCard}>
            <div className="modal-drag-handle" />
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Edit Expense</h2>
              <button
                type="button"
                onClick={() => setShowEditExpenseModal(false)}
                className="modal-close-btn-responsive"
                style={styles.modalCloseBtn}
              >
                <X size={20} />
              </button>
            </div>

            {editError && <div style={styles.errorBox}>{editError}</div>}

            <form onSubmit={handleEditExpenseSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label className="form-label">Description</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmt}
                    onChange={(e) => setEditAmt(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div style={{ width: "110px" }}>
                  <label className="form-label">Currency</label>
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="form-select"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="form-select"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Payer Toggle */}
              <div style={styles.formGroup}>
                <label className="form-label">Paid by</label>
                <div style={styles.toggleRow}>
                  <button
                    type="button"
                    onClick={() => setEditPayerId(currentUser?.userId || "")}
                    style={{
                      ...styles.toggleBtn,
                      background: editPayerId === currentUser?.userId ? "var(--primary)" : "var(--surface-hover)",
                      color: editPayerId === currentUser?.userId ? "#fff" : "var(--text-secondary)",
                      border: editPayerId === currentUser?.userId ? "none" : "1px solid var(--border-light)",
                    }}
                  >
                    You paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPayerId(selectedFriend?.id || "")}
                    style={{
                      ...styles.toggleBtn,
                      background: editPayerId === selectedFriend?.id ? "var(--primary)" : "var(--surface-hover)",
                      color: editPayerId === selectedFriend?.id ? "#fff" : "var(--text-secondary)",
                      border: editPayerId === selectedFriend?.id ? "none" : "1px solid var(--border-light)",
                    }}
                  >
                    {selectedFriend?.name} paid
                  </button>
                </div>
              </div>

              <div className="modal-actions-responsive" style={styles.modalActions}>
                <button
                  type="button"
                  onClick={handleDeleteExpense}
                  disabled={deleteLoading}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={16} />
                  <span>{deleteLoading ? "Deleting…" : "Delete"}</span>
                </button>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowEditExpenseModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="btn btn-primary"
                  >
                    {editLoading ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: SETTLE UP (1-ON-1 PAYMENT)
      ───────────────────────────────────────────────────────────── */}
      {showSettleModal && mounted && createPortal(
        <div
          className="modal-overlay-responsive"
          style={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettleModal(false);
          }}
        >
          <div className="glass-card modal-card-responsive" style={styles.modalCard}>
            <div className="modal-drag-handle" />
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <PiggyBank size={20} color="var(--primary)" />
                <h2 style={styles.modalTitle}>Settle Up with {selectedFriend?.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSettleModal(false)}
                className="modal-close-btn-responsive"
                style={styles.modalCloseBtn}
              >
                <X size={20} />
              </button>
            </div>

            {settleError && <div style={styles.errorBox}>{settleError}</div>}

            <form onSubmit={handleSettleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label className="form-label">Payment Direction</label>
                <div style={styles.toggleRow}>
                  <button
                    type="button"
                    onClick={() => {
                      setSettlePayerId(currentUser?.userId || "");
                      setSettlePayeeId(selectedFriend?.id || "");
                    }}
                    style={{
                      ...styles.toggleBtn,
                      background: settlePayerId === currentUser?.userId ? "var(--primary)" : "var(--surface-hover)",
                      color: settlePayerId === currentUser?.userId ? "#fff" : "var(--text-secondary)",
                      border: settlePayerId === currentUser?.userId ? "none" : "1px solid var(--border-light)",
                    }}
                  >
                    You paid {selectedFriend?.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettlePayerId(selectedFriend?.id || "");
                      setSettlePayeeId(currentUser?.userId || "");
                    }}
                    style={{
                      ...styles.toggleBtn,
                      background: settlePayerId === selectedFriend?.id ? "var(--primary)" : "var(--surface-hover)",
                      color: settlePayerId === selectedFriend?.id ? "#fff" : "var(--text-secondary)",
                      border: settlePayerId === selectedFriend?.id ? "none" : "1px solid var(--border-light)",
                    }}
                  >
                    {selectedFriend?.name} paid you
                  </button>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="form-input"
                    required
                    autoFocus
                  />
                </div>
                <div style={{ width: "110px" }}>
                  <label className="form-label">Currency</label>
                  <select
                    value={settleCurrency}
                    onChange={(e) => setSettleCurrency(e.target.value)}
                    className="form-select"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="modal-actions-responsive" style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settleLoading}
                  className="btn btn-primary"
                >
                  {settleLoading ? "Recording…" : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 4: ADD FRIEND TO GROUP
      ───────────────────────────────────────────────────────────── */}
      {showAddToGroupModal && mounted && createPortal(
        <div
          className="modal-overlay-responsive"
          style={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddToGroupModal(false);
          }}
        >
          <div className="glass-card modal-card-responsive" style={styles.modalCard}>
            <div className="modal-drag-handle" />
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add {selectedFriend?.name} to Group</h2>
              <button
                type="button"
                onClick={() => setShowAddToGroupModal(false)}
                className="modal-close-btn-responsive"
                style={styles.modalCloseBtn}
              >
                <X size={20} />
              </button>
            </div>

            {groupSuccess && <div style={styles.successBox}>{groupSuccess}</div>}
            {groupError && <div style={styles.errorBox}>{groupError}</div>}

            <form onSubmit={handleAddFriendToGroup} style={styles.form}>
              <div style={styles.formGroup}>
                <label className="form-label">Select Group</label>
                <select
                  value={targetGroupId}
                  onChange={(e) => setTargetGroupId(e.target.value)}
                  className="form-select"
                >
                  {userGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions-responsive" style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowAddToGroupModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingToGroup}
                  className="btn btn-primary"
                >
                  {addingToGroup ? "Adding…" : "Add to Group"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    width: "100%",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginTop: "0.15rem",
  },

  /* Search */
  searchBarWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "0.65rem",
    padding: "0.65rem 1rem",
    background: "#ffffff",
    border: "1px solid var(--border-light)",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  searchInput: {
    flex: 1,
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: "0.9rem",
    color: "var(--text-primary)",
  },
  clearSearchBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
  },
  searchDropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    borderRadius: "12px",
    padding: "0.5rem",
    zIndex: 50,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    maxHeight: "260px",
    overflowY: "auto",
  },
  searchDropdownHeader: {
    fontSize: "0.72rem",
    fontWeight: 700,
    textTransform: "uppercase",
    color: "var(--text-muted)",
    padding: "0.4rem 0.65rem",
    letterSpacing: "0.05em",
  },
  searchResultItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.65rem",
    padding: "0.6rem 0.75rem",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  searchResultAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.85rem",
    flexShrink: 0,
  },
  searchResultName: {
    fontSize: "0.88rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  searchResultUsername: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  startTransBtn: {
    display: "flex",
    alignItems: "center",
    gap: "0.2rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--primary)",
    background: "rgba(16, 185, 129, 0.08)",
    padding: "0.3rem 0.6rem",
    borderRadius: "6px",
    flexShrink: 0,
  },

  /* Friend cards */
  friendCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.85rem 1rem",
    gap: "0.75rem",
    cursor: "pointer",
    minHeight: "56px",
    textDecoration: "none",
  },
  friendLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "1rem",
    flexShrink: 0,
  },
  largeAvatar: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "1.3rem",
    flexShrink: 0,
  },
  friendName: {
    fontSize: "0.92rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  friendUsername: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
  },
  groupBadge: {
    fontSize: "0.68rem",
    padding: "0.1rem 0.45rem",
    borderRadius: "6px",
    background: "var(--surface-hover)",
    color: "var(--text-muted)",
    border: "1px solid var(--border-light)",
  },
  friendRight: {
    display: "flex",
    alignItems: "center",
    gap: "0.65rem",
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
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 1.5rem",
    textAlign: "center",
  },

  /* Ledger View */
  ledgerHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.88rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
    padding: "0.45rem 0.85rem",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  friendProfileCard: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    padding: "1.25rem",
  },
  ledgerBalanceBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.85rem 1rem",
    background: "var(--surface-hover)",
    borderRadius: "10px",
    border: "1px solid var(--border-light)",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  settleUpBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.45rem",
    background: "var(--primary)",
    color: "#fff",
    border: "none",
    padding: "0.55rem 1.15rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.2s ease",
  },

  /* Transaction Items */
  expenseCardContainer: {
    padding: 0,
    overflow: "hidden",
    border: "1px solid var(--border-light)",
    borderRadius: "14px",
    background: "#ffffff",
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
    background: "#fff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "480px",
    padding: "1.5rem",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1rem",
  },
  modalTitle: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  modalCloseBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "0.25rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  formRow: {
    display: "flex",
    gap: "0.65rem",
  },
  toggleRow: {
    display: "flex",
    gap: "0.5rem",
  },
  toggleBtn: {
    flex: 1,
    padding: "0.6rem 0.75rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.15s ease",
  },
  equalSplitInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.65rem 0.85rem",
    background: "var(--surface-hover)",
    borderRadius: "8px",
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
  },
  splitRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
  },
  modalActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "0.65rem",
    marginTop: "0.75rem",
  },
  deleteBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    background: "rgba(244, 63, 94, 0.08)",
    border: "1px solid rgba(244, 63, 94, 0.25)",
    color: "#f43f5e",
    fontWeight: 600,
    padding: "0.55rem 0.85rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.85rem",
    marginRight: "auto",
  },
  errorBox: {
    padding: "0.6rem 0.85rem",
    borderRadius: "8px",
    background: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    color: "var(--owes)",
    fontSize: "0.82rem",
    marginBottom: "0.5rem",
  },
  successBox: {
    padding: "0.6rem 0.85rem",
    borderRadius: "8px",
    background: "rgba(16, 185, 129, 0.08)",
    border: "1px solid rgba(16, 185, 129, 0.25)",
    color: "var(--owed)",
    fontSize: "0.82rem",
    marginBottom: "0.5rem",
  },
};
