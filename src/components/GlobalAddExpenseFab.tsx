"use client";

import React, { useState, useEffect, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Plus,
  Users,
  User,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { GroupInfo, FriendInfo, getUserGroups, getFriends } from "@/app/actions/userActions";
import { getAvatarGradient } from "@/lib/avatar";

interface GlobalAddExpenseFabProps {
  initialGroups: GroupInfo[];
  initialFriends: FriendInfo[];
  currentUserId: string;
}

export default function GlobalAddExpenseFab({
  initialGroups,
  initialFriends,
}: GlobalAddExpenseFabProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [groups, setGroups] = useState<GroupInfo[]>(initialGroups);
  const [friends, setFriends] = useState<FriendInfo[]>(initialFriends);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"group" | "friend">("group");

  // Portal mount flag
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Detect current group if inside /groups/[id]
  const groupMatch = pathname?.match(/^\/groups\/([^/]+)$/);
  const currentGroupId = groupMatch ? groupMatch[1] : null;
  const isSpecialGroupRoute = currentGroupId === "new" || currentGroupId === "join";
  const currentGroup = (!isSpecialGroupRoute && currentGroupId)
    ? groups.find((g) => g.id === currentGroupId) || null
    : null;

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [showModal]);

  function openModal() {
    setShowModal(true);
    getUserGroups().then((g) => setGroups(g)).catch(() => {});
    getFriends().then((f) => setFriends(f)).catch(() => {});
  }

  // Hide the FAB on group creation, joining, or profile/me pages
  if (
    pathname === "/groups/new" ||
    pathname?.startsWith("/groups/join") ||
    pathname === "/profile" ||
    pathname?.startsWith("/profile")
  ) {
    return null;
  }

  function handleSelectGroup(groupId: string) {
    setShowModal(false);
    if (currentGroupId === groupId) {
      window.dispatchEvent(new CustomEvent("open-group-expense-modal"));
    } else {
      startTransition(() => {
        router.push(`/groups/${groupId}?addExpense=true`);
      });
    }
  }

  function handleSelectFriend(friendId: string) {
    setShowModal(false);
    if (pathname === "/friends") {
      window.dispatchEvent(new CustomEvent("open-friend-expense-modal", { detail: { friendId } }));
      startTransition(() => {
        router.push(`/friends?friendId=${friendId}&addExpense=true`);
      });
    } else {
      startTransition(() => {
        router.push(`/friends?friendId=${friendId}&addExpense=true`);
      });
    }
  }

  return (
    <>
      {/* Universal Sticky "Add Expense" Button */}
      <button
        type="button"
        onClick={openModal}
        className="splitwise-fab"
        title="Add expense"
        aria-label="Add expense"
      >
        <Plus size={18} strokeWidth={2.5} />
        <span>Add expense</span>
      </button>

      {/* Destination Selection Modal */}
      {showModal && mounted && createPortal(
        <div
          style={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          className="animate-fade-in"
        >
          <div style={styles.modalCard} className="glass-card">
            {/* Header */}
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>Add an expense</h2>
                <p style={styles.modalSubtitle}>Who are you splitting with?</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={styles.closeBtn}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Context Shortcut: If already inside a group, offer 1-tap option */}
            {currentGroup && (
              <div style={styles.currentGroupBanner}>
                <button
                  type="button"
                  onClick={() => handleSelectGroup(currentGroup.id)}
                  style={styles.currentGroupBtn}
                >
                  <div style={styles.currentGroupLeft}>
                    <div style={styles.currentGroupBadge}>
                      <Sparkles size={16} color="#fff" />
                    </div>
                    <div style={{ textAlign: "left", minWidth: 0 }}>
                      <div style={styles.currentGroupTag}>THIS GROUP</div>
                      <div style={styles.currentGroupName}>
                        Add to {currentGroup.name}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--primary)" />
                </button>
                <div style={styles.orDivider}>
                  <span>or split somewhere else</span>
                </div>
              </div>
            )}

            {/* Selector Tabs: Group vs Friend */}
            <div style={styles.tabBar}>
              <button
                type="button"
                onClick={() => setActiveTab("group")}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === "group" ? styles.tabBtnActive : {}),
                }}
              >
                <Users size={16} />
                <span>In a Group</span>
                <span style={styles.tabBadge}>{groups.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("friend")}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === "friend" ? styles.tabBtnActive : {}),
                }}
              >
                <User size={16} />
                <span>With a Friend</span>
                <span style={styles.tabBadge}>{friends.length}</span>
              </button>
            </div>

            {/* List Body */}
            <div style={styles.listContainer}>
              {activeTab === "group" ? (
                /* Group List */
                <div style={styles.itemList}>
                  {groups.length === 0 ? (
                    <div style={styles.emptyState}>
                      <Users size={32} color="var(--text-muted)" />
                      <p style={styles.emptyText}>
                        You don&apos;t have any groups yet.
                      </p>
                    </div>
                  ) : (
                    groups.map((group) => {
                      const isCurrent = group.id === currentGroupId;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => handleSelectGroup(group.id)}
                          style={{
                            ...styles.itemRow,
                            ...(isCurrent ? styles.itemRowActive : {}),
                          }}
                        >
                          <div style={styles.itemLeft}>
                            <div
                              style={{
                                ...styles.groupAvatar,
                                background: getAvatarGradient(group.id || group.name),
                              }}
                            >
                              {group.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ textAlign: "left", minWidth: 0 }}>
                              <div style={styles.itemName}>{group.name}</div>
                              {group.memberCount !== undefined && (
                                <div style={styles.itemSub}>
                                  {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                                </div>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={16} color="var(--text-muted)" />
                        </button>
                      );
                    })
                  )}

                  {/* Create Group Action */}
                  <Link
                    href="/groups/new"
                    onClick={() => setShowModal(false)}
                    style={styles.actionBtnRow}
                  >
                    <Plus size={15} />
                    <span>Create a new group</span>
                  </Link>
                </div>
              ) : (
                /* Friends List */
                <div style={styles.itemList}>
                  {friends.length === 0 ? (
                    <div style={styles.emptyState}>
                      <User size={32} color="var(--text-muted)" />
                      <p style={styles.emptyText}>
                        No friends added yet. Connect with someone to split bills directly.
                      </p>
                    </div>
                  ) : (
                    friends.map((friend) => {
                      const primaryBal = Object.entries(friend.balances || {})[0];
                      const amount = primaryBal ? primaryBal[1] : 0;
                      const curr = primaryBal ? primaryBal[0] : "EUR";

                      return (
                        <button
                          key={friend.id}
                          type="button"
                          onClick={() => handleSelectFriend(friend.id)}
                          style={styles.itemRow}
                        >
                          <div style={styles.itemLeft}>
                            <div
                              style={{
                                ...styles.friendAvatar,
                                background: getAvatarGradient(friend.id || friend.name),
                              }}
                            >
                              {friend.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ textAlign: "left", minWidth: 0 }}>
                              <div style={styles.itemName}>{friend.name}</div>
                              <div style={styles.itemSub}>
                                {amount > 0.01 ? (
                                  <span style={{ color: "var(--owed)", fontWeight: 600 }}>
                                    owes you {curr} {amount.toFixed(2)}
                                  </span>
                                ) : amount < -0.01 ? (
                                  <span style={{ color: "#f59e0b", fontWeight: 600 }}>
                                    you owe {curr} {Math.abs(amount).toFixed(2)}
                                  </span>
                                ) : (
                                  <span style={{ color: "var(--text-muted)" }}>settled up</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={16} color="var(--text-muted)" />
                        </button>
                      );
                    })
                  )}

                  {/* Add / Manage Friends Action */}
                  <Link
                    href="/friends"
                    onClick={() => setShowModal(false)}
                    style={styles.actionBtnRow}
                  >
                    <Plus size={15} />
                    <span>Add or find friends</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.65)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
  },
  modalCard: {
    width: "100%",
    maxWidth: "460px",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    borderRadius: "20px",
    background: "var(--surface)",
    border: "1px solid var(--border-light)",
    boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "1.25rem 1.25rem 0.75rem",
  },
  modalTitle: {
    fontSize: "1.25rem",
    fontWeight: 800,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    margin: 0,
  },
  modalSubtitle: {
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    margin: "0.2rem 0 0",
  },
  closeBtn: {
    background: "var(--surface-hover)",
    border: "none",
    color: "var(--text-secondary)",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },

  /* Current group highlight */
  currentGroupBanner: {
    padding: "0 1.25rem 0.5rem",
  },
  currentGroupBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.75rem 1rem",
    borderRadius: "14px",
    background: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)",
    border: "1.5px solid rgba(16,185,129,0.35)",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  currentGroupLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    minWidth: 0,
  },
  currentGroupBadge: {
    width: "32px",
    height: "32px",
    borderRadius: "9px",
    background: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  currentGroupTag: {
    fontSize: "0.68rem",
    fontWeight: 800,
    color: "var(--primary)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  currentGroupName: {
    fontSize: "0.92rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  orDivider: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0.65rem 0 0",
    fontSize: "0.72rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: 600,
  },

  /* Tabs */
  tabBar: {
    display: "flex",
    gap: "0.5rem",
    padding: "0.5rem 1.25rem",
  },
  tabBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.45rem",
    padding: "0.6rem 0.75rem",
    borderRadius: "12px",
    background: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
    color: "var(--text-secondary)",
    fontSize: "0.82rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  tabBtnActive: {
    background: "var(--primary)",
    color: "#fff",
    borderColor: "var(--primary)",
    boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
  },
  tabBadge: {
    fontSize: "0.7rem",
    padding: "0.1rem 0.4rem",
    borderRadius: "10px",
    background: "rgba(0,0,0,0.12)",
    fontWeight: 700,
  },

  /* List container */
  listContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "0.5rem 1.25rem 1.25rem",
  },
  itemList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.45rem",
  },
  itemRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.65rem 0.85rem",
    borderRadius: "12px",
    background: "transparent",
    border: "1px solid transparent",
    cursor: "pointer",
    transition: "all 0.15s ease",
    textDecoration: "none",
  },
  itemRowActive: {
    background: "rgba(16,185,129,0.08)",
    borderColor: "rgba(16,185,129,0.25)",
  },
  itemLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    minWidth: 0,
    flex: 1,
  },
  groupAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.95rem",
    flexShrink: 0,
  },
  friendAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.95rem",
    flexShrink: 0,
  },
  itemName: {
    fontSize: "0.88rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  itemSub: {
    fontSize: "0.74rem",
    color: "var(--text-secondary)",
    marginTop: "0.1rem",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  actionBtnRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.45rem",
    padding: "0.65rem",
    marginTop: "0.5rem",
    borderRadius: "12px",
    border: "1.5px dashed var(--border-light)",
    color: "var(--text-secondary)",
    fontSize: "0.82rem",
    fontWeight: 600,
    textDecoration: "none",
    background: "transparent",
    transition: "all 0.15s ease",
  },

  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
    textAlign: "center",
    gap: "0.5rem",
  },
  emptyText: {
    fontSize: "0.82rem",
    color: "var(--text-muted)",
    maxWidth: "240px",
  },
};
