"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { searchUsers, createGroup } from "@/app/actions/groupActions";
import { Users, Search, Plus, X, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

interface Member {
  id: string;
  name: string;
  username: string;
}

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [addedMembers, setAddedMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search users as the user types (debounced)
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      const timer = setTimeout(() => {
        setSearchResults([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    const startTimer = setTimeout(() => {
      setSearchLoading(true);
    }, 0);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchUsers(searchQuery);
      // Filter out users that are already added
      const filtered = results.filter(
        (r) => !addedMembers.some((am) => am.id === r.id)
      );
      setSearchResults(filtered);
      setSearchLoading(false);
    }, 300);

    return () => {
      clearTimeout(startTimer);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, addedMembers]);

  const addMember = (member: Member) => {
    setAddedMembers([...addedMembers, member]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeMember = (id: string) => {
    setAddedMembers(addedMembers.filter((m) => m.id !== id));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    const memberIds = addedMembers.map((m) => m.id);
    const result = await createGroup(name, description, memberIds, defaultCurrency);

    if (result.success && result.groupId) {
      router.push(`/groups/${result.groupId}`);
      router.refresh();
    } else {
      setError(result.error || "Failed to create group.");
      setLoading(false);
    }
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Back Button */}
      <Link href="/dashboard" style={styles.backLink}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div style={styles.header}>
        <h1 style={styles.title}>Create a New Group</h1>
        <p style={styles.subtitle}>Form a group to split house bills, travel expenses, or dinner checks.</p>
      </div>

      <div style={styles.formGrid} className="responsive-grid-1-1">
        {/* Left Side: Core Group Info */}
        <form onSubmit={handleSubmit} className="glass-card" style={styles.formCard}>
          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={styles.formGroup}>
            <label htmlFor="groupName" className="form-label">
              Group Name *
            </label>
            <input
              id="groupName"
              type="text"
              required
              placeholder="e.g. Apartment roommates"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="groupDesc" className="form-label">
              Description (Optional)
            </label>
            <textarea
              id="groupDesc"
              placeholder="e.g. Monthly rent, electricity and grocery logs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input"
              style={{ minHeight: "80px", resize: "vertical" }}
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="groupCurrency" className="form-label">
              Default Group Currency *
            </label>
            <select
              id="groupCurrency"
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="form-input"
              style={{ background: "#0f172a" }}
              disabled={loading}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1rem" }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating Group...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Create Group
              </>
            )}
          </button>
        </form>

        {/* Right Side: Members Selector */}
        <div className="glass-card" style={styles.membersCard}>
          <h2 style={styles.membersTitle}>
            <Users size={18} color="var(--primary)" />
            Group Members
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
            Add people by searching their username or display name.
          </p>

          {/* Search Box */}
          <div style={styles.searchContainer}>
            <div style={styles.searchInputWrapper}>
              <Search size={18} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search username (min. 2 characters)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: "2.5rem" }}
                disabled={loading}
              />
              {searchLoading && <Loader2 size={18} style={styles.searchLoader} className="animate-spin" />}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div style={styles.resultsDropdown}>
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => addMember(user)}
                    style={styles.resultItem}
                  >
                    <div style={styles.resultAvatar}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={styles.resultDetails}>
                      <span style={styles.resultName}>{user.name}</span>
                      <span style={styles.resultUsername}>@{user.username}</span>
                    </div>
                    <Plus size={16} color="var(--primary)" />
                  </button>
                ))}
              </div>
            )}

            {/* No Results Info */}
            {searchQuery.trim().length >= 2 && !searchLoading && searchResults.length === 0 && (
              <div style={styles.noResults}>No matching users found</div>
            )}
          </div>

          {/* Currently Added Members */}
          <div style={styles.memberList}>
            <h3 style={styles.memberListTitle}>Selected Members ({addedMembers.length + 1})</h3>
            
            {/* Creator (Auto Included) */}
            <div style={styles.memberItem}>
              <div style={styles.memberAvatarCreator}>You</div>
              <div style={styles.memberDetails}>
                <span style={styles.memberName}>Creator (You)</span>
                <span style={styles.memberUsername}>Current User</span>
              </div>
              <span style={styles.creatorBadge}>owner</span>
            </div>

            {/* Added Friends */}
            {addedMembers.map((member) => (
              <div key={member.id} style={styles.memberItem}>
                <div style={styles.memberAvatar}>
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div style={styles.memberDetails}>
                  <span style={styles.memberName}>{member.name}</span>
                  <span style={styles.memberUsername}>@{member.username}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeMember(member.id)}
                  style={styles.removeBtn}
                  title="Remove from group"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "960px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    width: "100%",
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    width: "fit-content",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 800,
    background: "linear-gradient(to right, #ffffff, #cbd5e1)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: "1.5rem",
  },
  formCard: {
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    height: "fit-content",
  },
  membersCard: {
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  errorBox: {
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    border: "1px solid rgba(244, 63, 94, 0.2)",
    color: "#f43f5e",
    padding: "0.75rem 1rem",
    borderRadius: "10px",
    fontSize: "0.875rem",
  },
  membersTitle: {
    fontSize: "1.25rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "0.25rem",
  },
  searchContainer: {
    position: "relative",
    marginBottom: "1.5rem",
  },
  searchInputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "1rem",
    color: "var(--text-muted)",
  },
  searchLoader: {
    position: "absolute",
    right: "1rem",
    color: "var(--primary)",
  },
  resultsDropdown: {
    position: "absolute",
    top: "105%",
    left: 0,
    right: 0,
    background: "rgb(15, 23, 42)",
    border: "1px solid var(--border-light)",
    borderRadius: "12px",
    zIndex: 10,
    maxHeight: "220px",
    overflowY: "auto",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
  },
  resultItem: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "0.75rem 1rem",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.2s ease",
  },
  resultAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    border: "1px solid rgba(99, 102, 241, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    color: "var(--primary)",
    marginRight: "0.75rem",
  },
  resultDetails: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  resultName: {
    fontSize: "0.9rem",
    color: "#fff",
    fontWeight: 500,
  },
  resultUsername: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
  },
  noResults: {
    padding: "0.75rem 1rem",
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    textAlign: "center",
    border: "1px dashed var(--border-light)",
    borderRadius: "8px",
    marginTop: "0.5rem",
  },
  memberList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    overflowY: "auto",
    maxHeight: "300px",
  },
  memberListTitle: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "0.25rem",
  },
  memberItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    padding: "0.6rem 0.85rem",
    borderRadius: "10px",
  },
  memberAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    backgroundColor: "var(--surface)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  memberAvatarCreator: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    border: "1px solid var(--border-focus)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: "0.8rem",
    color: "var(--primary)",
  },
  memberDetails: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  memberName: {
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "#fff",
  },
  memberUsername: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
  },
  creatorBadge: {
    fontSize: "0.7rem",
    color: "var(--primary)",
    background: "var(--primary-glow)",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    padding: "0.15rem 0.4rem",
    borderRadius: "12px",
    fontWeight: 600,
  },
  removeBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.25rem",
    borderRadius: "50%",
    transition: "color 0.2s, background 0.2s",
  },
};
// Add CSS keyframes for rotation in react inline style isn't clean, but standard class works!
