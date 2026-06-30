"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/app/actions/authActions";
import { Wallet, LogIn, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await signIn(formData);

    if (result.success) {
      router.push(callbackUrl);
      router.refresh();
    } else {
      setError(result.error || "Failed to sign in.");
      setLoading(false);
    }
  }

  return (
    <div className="glass-card animate-fade-in" style={styles.loginCard}>
      <div style={styles.header}>
        <h2 style={styles.title}>Welcome Back</h2>
        <p style={styles.subtitle}>Sign in to manage your group splits and debts</p>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
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
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="form-input"
            autoComplete="current-password"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ width: "100%", marginTop: "1rem" }}
        >
          <LogIn size={18} />
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div style={styles.footer}>
        <span>New to SplitEasy? </span>
        <Link href="/signup" style={styles.link}>
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={styles.pageContainer}>
      <div style={styles.brandContainer}>
        <div style={styles.logoBadge}>
          <Wallet size={28} color="#10b981" />
        </div>
        <span style={styles.brandName}>SplitEasy</span>
      </div>
      
      <Suspense fallback={
        <div className="glass-card" style={{ ...styles.loginCard, justifyContent: "center", alignItems: "center", padding: "3rem" }}>
          <span>Loading form...</span>
        </div>
      }>
        <LoginForm />
      </Suspense>
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
    background: "rgba(16, 185, 129, 0.15)",
    padding: "0.5rem",
    borderRadius: "12px",
    border: "1px solid rgba(16, 185, 129, 0.25)",
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
  loginCard: {
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
