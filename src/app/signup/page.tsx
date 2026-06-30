"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/app/actions/authActions";
import { Wallet, UserPlus, AlertCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await signUp(formData);

    if (result.success) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError(result.error || "Failed to create account.");
      setLoading(false);
    }
  }

  return (
    <div style={styles.pageContainer}>
      <div style={styles.brandContainer}>
        <div style={styles.logoBadge}>
          <Wallet size={28} color="#e5a93b" />
        </div>
        <span style={styles.brandName}>SplitEasy</span>
      </div>

      <div className="glass-card animate-fade-in" style={styles.signupCard}>
        <div style={styles.header}>
          <h2 style={styles.title}>Create Account</h2>
          <p style={styles.subtitle}>Get started splitting bills easily for free</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="name" className="form-label">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. John Doe"
              className="form-input"
              autoComplete="name"
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              placeholder="e.g. johndoe"
              className="form-input"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="password" className="form-label">
              Password (min. 6 characters)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="form-input"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1rem" }}
          >
            <UserPlus size={18} />
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div style={styles.footer}>
          <span>Already have an account? </span>
          <Link href="/login" style={styles.link}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "1.5rem",
  },
  brandContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "2rem",
  },
  logoBadge: {
    background: "rgba(229, 169, 59, 0.15)",
    padding: "0.5rem",
    borderRadius: "12px",
    border: "1px solid rgba(229, 169, 59, 0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: "1.75rem",
    fontWeight: 700,
    fontFamily: "var(--font-brand)",
    letterSpacing: "-0.03em",
    color: "var(--text-primary)",
  },
  signupCard: {
    width: "100%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  header: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
  },
  subtitle: {
    fontSize: "0.9rem",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    border: "1px solid rgba(244, 63, 94, 0.2)",
    color: "#f43f5e",
    padding: "0.75rem 1rem",
    borderRadius: "10px",
    fontSize: "0.875rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  footer: {
    textAlign: "center",
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginTop: "0.5rem",
  },
  link: {
    color: "var(--primary)",
    fontWeight: 600,
  },
};
