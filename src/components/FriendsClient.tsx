"use client";

import React, { useState } from "react";
import { Users, Search, Plus, Check, Loader2, Sparkles, UserPlus } from "lucide-react";
import { searchUsers, addMembersToGroup } from "@/app/actions/groupActions";
import { FriendInfo, GroupInfo } from "@/app/actions/userActions";

interface FriendsClientProps {
  initialFriends: FriendInfo[];
  userGroups: GroupInfo[];
}

export default function FriendsClient({ initialFriends, userGroups }: FriendsClientProps) {
  const [friends, setFriends] = useState<FriendInfo[]>(initialFriends);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; username: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; name: string } | null>(null);
  const [targetGroupId, setTargetGroupId] = useState(userGroups[0]?.id || "");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;

    setSearching(true);
    setError(null);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setError("No users found with that username.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during search.");
    } finally {
      setSearching(false);
    }
  }

  async function handleAddFriendToGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFriend || !targetGroupId) return;

    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await addMembersToGroup(targetGroupId, [selectedFriend.id]);
      if (res.success) {
        const groupName = userGroups.find(g => g.id === targetGroupId)?.name || "Group";
        setSuccess(`Successfully added ${selectedFriend.name} to ${groupName}!`);
        
        // Update local friends list
        const alreadyFriend = friends.find(f => f.id === selectedFriend.id);
        if (alreadyFriend) {
          setFriends(friends.map(f => f.id === selectedFriend.id ? {
            ...f,
            sharedGroups: [...f.sharedGroups.filter(g => g !== groupName), groupName]
          } : f));
        } else {
          setFriends([
            ...friends,
            {
              id: selectedFriend.id,
              name: selectedFriend.name,
              username: searchQuery, // placeholder or fetch full profile if needed
              sharedGroups: [groupName]
            }
          ]);
        }
        
        setSelectedFriend(null);
        setSearchResults([]);
        setSearchQuery("");
      } else {
        setError(res.error || "Failed to add member to group.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while adding member.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h1 className="page-title" style={styles.title}>
          <Users size={24} color="var(--primary)" />
          Friends & Contacts
        </h1>
        <p style={styles.subtitle}>Manage people you split bills and settle debts with.</p>
      </div>

      <div style={styles.grid} className="responsive-grid-2-1">
        {/* Left Side: Friends List */}
        <div style={styles.mainColumn}>
          <div className="glass-card" style={styles.card}>
            <h3 style={styles.sectionHeader}>People you interact with</h3>
            
            {friends.length === 0 ? (
              <div style={styles.emptyState}>
                <Sparkles size={40} color="var(--text-muted)" style={{ marginBottom: "1rem" }} />
                <h4>No interactions yet</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Use the invite search on the right to add people to your shared groups.
                </p>
              </div>
            ) : (
              <div style={styles.friendsList}>
                {friends.map((friend) => (
                  <div key={friend.id} style={styles.friendItem}>
                    <div style={styles.friendInfoLeft}>
                      <span style={styles.avatar}>
                        {friend.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div style={styles.friendName}>{friend.name}</div>
                        <div style={styles.friendUsername}>@{friend.username || "user"}</div>
                      </div>
                    </div>
                    <div style={styles.friendGroups}>
                      {friend.sharedGroups.map((g, i) => (
                        <span key={i} className="badge" style={styles.groupBadge}>
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Add Friends Search */}
        <div style={styles.sideColumn}>
          <div className="glass-card" style={styles.card}>
            <h3 style={styles.sectionHeader}>Add Friends to Groups</h3>
            <p style={styles.cardDesc}>Search for registered users by username to add them to your groups.</p>

            <form onSubmit={handleSearch} style={styles.searchForm}>
              <input
                type="text"
                placeholder="Enter username..."
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              <button type="submit" className="btn btn-primary" style={styles.searchBtn} disabled={searching}>
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </form>

            {error && <div style={styles.errorText}>{error}</div>}
            {success && <div style={styles.successText}>{success}</div>}

            {/* Search Results */}
            {searchResults.length > 0 && !selectedFriend && (
              <div style={styles.resultsContainer}>
                <h4 style={styles.resultsHeader}>Search Results</h4>
                {searchResults.map((user) => (
                  <div key={user.id} style={styles.resultItem}>
                    <div>
                      <div style={styles.resultName}>{user.name}</div>
                      <div style={styles.resultUsername}>@{user.username}</div>
                    </div>
                    <button
                      onClick={() => setSelectedFriend({ id: user.id, name: user.name })}
                      className="btn btn-secondary"
                      style={styles.actionBtn}
                      title="Select"
                    >
                      <UserPlus size={16} color="var(--primary)" />
                      <span>Select</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Group Addition Form when user is selected */}
            {selectedFriend && (
              <form onSubmit={handleAddFriendToGroup} style={styles.addForm}>
                <div style={styles.selectedBanner}>
                  Selected: <strong>{selectedFriend.name}</strong>
                  <button type="button" onClick={() => setSelectedFriend(null)} style={styles.clearBtn}>Cancel</button>
                </div>

                {userGroups.length === 0 ? (
                  <p style={styles.noGroupsText}>
                    You must create a group first before you can add friends to it.
                  </p>
                ) : (
                  <>
                    <label style={styles.label}>Choose Group</label>
                    <select
                      className="form-input"
                      value={targetGroupId}
                      onChange={(e) => setTargetGroupId(e.target.value)}
                      style={{ marginBottom: "1rem" }}
                    >
                      {userGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>

                    <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={adding}>
                      {adding ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          <span>Add to Group</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "var(--text-primary)",
  },
  subtitle: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "1.5rem",
  },
  mainColumn: {
    display: "flex",
    flexDirection: "column",
  },
  sideColumn: {
    display: "flex",
    flexDirection: "column",
  },
  card: {
    padding: "1.25rem",
  },
  sectionHeader: {
    fontSize: "1rem",
    fontWeight: 700,
    marginBottom: "1rem",
    color: "var(--text-primary)",
  },
  cardDesc: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    marginBottom: "1rem",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "3rem 1rem",
    textAlign: "center",
  },
  friendsList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  friendItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.75rem",
    borderRadius: "10px",
    background: "rgba(0, 0, 0, 0.02)",
    border: "1px solid var(--border-light)",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  friendInfoLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "var(--primary)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.95rem",
  },
  friendName: {
    fontWeight: 600,
    fontSize: "0.9rem",
    color: "var(--text-primary)",
  },
  friendUsername: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  friendGroups: {
    display: "flex",
    gap: "0.35rem",
    flexWrap: "wrap",
  },
  groupBadge: {
    backgroundColor: "rgba(229, 169, 59, 0.1)",
    color: "var(--primary)",
    border: "1px solid rgba(229, 169, 59, 0.2)",
    fontSize: "0.7rem",
    padding: "0.15rem 0.45rem",
  },
  searchForm: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
  searchInput: {
    flex: 1,
  },
  searchBtn: {
    padding: "0.75rem",
    flexShrink: 0,
  },
  errorText: {
    color: "var(--owes)",
    fontSize: "0.8rem",
    marginBottom: "1rem",
  },
  successText: {
    color: "var(--owed)",
    fontSize: "0.8rem",
    marginBottom: "1rem",
  },
  resultsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    marginTop: "0.5rem",
  },
  resultsHeader: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: "0.25rem",
  },
  resultItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.5rem",
    borderBottom: "1px solid var(--border-light)",
  },
  resultName: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  resultUsername: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  actionBtn: {
    padding: "0.35rem 0.75rem",
    fontSize: "0.8rem",
    gap: "0.25rem",
  },
  addForm: {
    marginTop: "1rem",
  },
  selectedBanner: {
    backgroundColor: "rgba(229, 169, 59, 0.05)",
    border: "1px solid rgba(229, 169, 59, 0.15)",
    borderRadius: "8px",
    padding: "0.5rem 0.75rem",
    fontSize: "0.8rem",
    color: "var(--text-primary)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  clearBtn: {
    background: "transparent",
    border: "none",
    color: "var(--owes)",
    fontSize: "0.75rem",
    cursor: "pointer",
  },
  label: {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: "0.25rem",
  },
  noGroupsText: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    textAlign: "center",
    padding: "1rem 0",
  },
};
