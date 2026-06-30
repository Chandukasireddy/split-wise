import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { 
  Wallet, 
  ArrowRight, 
  Sparkles, 
  Users, 
  PieChart as ChartIcon, 
  FileSpreadsheet, 
  Coins
} from "lucide-react";

export default async function LandingPage() {
  const session = await getCurrentUser();
  const isLoggedIn = !!session;

  return (
    <div style={styles.pageWrapper}>
      {/* Header / Nav */}
      <header style={styles.header}>
        <div className="container" style={styles.headerContainer}>
          <div style={styles.logoRow}>
            <div style={styles.logoBadge}>
              <Wallet size={22} color="#e5a93b" />
            </div>
            <span style={styles.logoText}>SplitEasy</span>
          </div>

          <div style={styles.headerActions}>
            {isLoggedIn ? (
              <Link href="/dashboard" className="btn btn-primary" style={styles.headerBtn}>
                Go to Dashboard
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link href="/login" style={styles.loginLink}>
                  Sign In
                </Link>
                <Link href="/signup" className="btn btn-primary" style={styles.headerBtn}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div className="container" style={styles.heroContainer}>
          <div style={styles.badgePromo}>
            <Sparkles size={14} color="var(--primary)" />
            <span>100% Free Premium Splitwise Clone</span>
          </div>

          <h1 style={styles.heroTitle}>
            Splitting Expenses <br />
            <span style={styles.gradientText}>Made Effortless.</span>
          </h1>
          
          <p style={styles.heroDescription}>
            Share bills with roommates, divide travel costs, and settle checks. 
            Enjoy advanced metrics, simplified debt paths, multiple currencies, and data exports.
          </p>

          <div style={styles.ctaRow}>
            {isLoggedIn ? (
              <Link href="/dashboard" className="btn btn-primary" style={styles.ctaBtnPrimary}>
                Open Dashboard
                <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link href="/signup" className="btn btn-primary" style={styles.ctaBtnPrimary}>
                  Sign Up Free
                  <ArrowRight size={18} />
                </Link>
                <Link href="/login" className="btn btn-secondary" style={styles.ctaBtnSecondary}>
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={styles.featuresSection}>
        <div className="container">
          <div style={styles.featuresHeader}>
            <h2 style={styles.featuresTitle}>Premium Features, Unlocked for Everyone</h2>
            <p style={{ fontSize: "1rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Everything you need to keep your balances straight, without paid walls or limits.
            </p>
          </div>

          <div style={styles.featuresGrid}>
            {/* Feature 1 */}
            <div className="glass-card" style={styles.featureCard}>
              <div style={styles.featureIconBox}>
                <Coins size={22} color="var(--primary)" />
              </div>
              <h3 style={styles.featureCardTitle}>Flexible Splitting</h3>
              <p style={styles.featureCardDesc}>
                Divide costs equally, unequally by exact amounts, by percentage shares, or by custom ratios.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card" style={styles.featureCard}>
              <div style={styles.featureIconBox}>
                <Users size={22} color="var(--owed)" />
              </div>
              <h3 style={styles.featureCardTitle}>Debt Simplification</h3>
              <p style={styles.featureCardDesc}>
                Our smart matching algorithm automatically minimizes payment transactions between members.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card" style={styles.featureCard}>
              <div style={styles.featureIconBox}>
                <ChartIcon size={22} color="var(--secondary)" />
              </div>
              <h3 style={styles.featureCardTitle}>Spend Charts</h3>
              <p style={styles.featureCardDesc}>
                Understand where your money goes. Get interactive donut spending charts filtered by category.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card" style={styles.featureCard}>
              <div style={styles.featureIconBox}>
                <FileSpreadsheet size={22} color="#06b6d4" />
              </div>
              <h3 style={styles.featureCardTitle}>CSV Export</h3>
              <p style={styles.featureCardDesc}>
                Download complete group ledger records as raw spreadsheets in one click for budgeting audits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div className="container" style={styles.footerContainer}>
          <span style={styles.footerBrand}>SplitEasy © 2026</span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Self-hosted Relational Expense Manager
          </span>
        </div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    height: "72px",
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid rgba(0, 0, 0, )",
  },
  headerContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  logoBadge: {
    background: "rgba(229, 169, 59, 0.15)",
    padding: "0.4rem",
    borderRadius: "8px",
    border: "1px solid rgba(229, 169, 59, 0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontWeight: 800,
    fontSize: "1.35rem",
    fontFamily: "var(--font-brand)",
    letterSpacing: "-0.03em",
    color: "var(--text-primary)",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
  },
  loginLink: {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
  headerBtn: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
  },
  heroSection: {
    padding: "6rem 0 4rem 0",
    textAlign: "center",
  },
  heroContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: "800px",
  },
  badgePromo: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    background: "var(--primary-glow)",
    border: "1px solid rgba(229, 169, 59, 0.3)",
    color: "rgba(165, 180, 252, 0.9)",
    fontSize: "0.8rem",
    fontWeight: 600,
    padding: "0.4rem 0.85rem",
    borderRadius: "20px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "1.5rem",
  },
  heroTitle: {
    fontSize: "4.25rem",
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: "-0.03em",
    color: "#fff",
    fontFamily: "var(--font-brand)",
  },
  gradientText: {
    background: "linear-gradient(to right, #10b981, #a855f7, #ec4899)",
    },
  heroDescription: {
    fontSize: "1.15rem",
    color: "var(--text-secondary)",
    marginTop: "1.5rem",
    maxWidth: "600px",
    lineHeight: 1.6,
  },
  ctaRow: {
    display: "flex",
    gap: "1rem",
    marginTop: "2.5rem",
  },
  ctaBtnPrimary: {
    padding: "0.85rem 2rem",
    fontSize: "1.05rem",
    gap: "0.75rem",
  },
  ctaBtnSecondary: {
    padding: "0.85rem 2rem",
    fontSize: "1.05rem",
  },
  featuresSection: {
    padding: "4rem 0 8rem 0",
  },
  featuresHeader: {
    textAlign: "center",
    marginBottom: "3rem",
  },
  featuresTitle: {
    fontSize: "2rem",
    fontWeight: 700,
    fontFamily: "var(--font-brand)",
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "1.5rem",
  },
  featureCard: {
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  featureIconBox: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    background: "rgba(0, 0, 0, )",
    border: "1px solid var(--border-light)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  featureCardTitle: {
    fontSize: "1.2rem",
    fontWeight: 600,
    color: "#fff",
  },
  featureCardDesc: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
  },
  footer: {
    marginTop: "auto",
    height: "64px",
    display: "flex",
    alignItems: "center",
    borderTop: "1px solid rgba(0, 0, 0, )",
  },
  footerContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerBrand: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
};
