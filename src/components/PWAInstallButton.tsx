"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const [showBanner, setShowBanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // 1. Check if already running in standalone mode (already installed)
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches ||
      !!(window.navigator as Navigator & { standalone?: boolean }).standalone;

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);

    // Defer state updates to avoid synchronous cascading renders warning
    const timer = setTimeout(() => {
      setIsInstalled(isStandalone);
      if (isStandalone) return;
      setIsIOS(isIOSDevice);
      if (isIOSDevice) {
        setIsInstallable(true);
      }
    }, 0);

    // 3. Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => console.log("Service Worker registered successfully:", reg.scope))
        .catch((err) => console.error("Service Worker registration failed:", err));
    }

    // 4. Capture native install prompt (Android / Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Detect successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log("PWA was installed successfully!");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (isInstallable && !isInstalled && isMobile) {
      const dismissed = localStorage.getItem("pwa-prompt-dismissed");
      if (dismissed !== "true") {
        setShowBanner(true);
      }
    }
  }, [isInstallable, isInstalled, isMobile]);

  const dismissBanner = () => {
    localStorage.setItem("pwa-prompt-dismissed", "true");
    setShowBanner(false);
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      // Show iOS manual instructions
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    // Trigger Android / Chrome installation prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // Clear prompt state
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleInstallClickAndDismiss = async () => {
    dismissBanner();
    await handleInstallClick();
  };

  // Do not show anything if the app is already installed
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Header Install Button (Icon-only on mobile, text on desktop) */}
      {isInstallable && (
        <button
          onClick={handleInstallClick}
          style={isMobile ? styles.installBtnMobile : styles.installBtn}
          className="btn btn-secondary"
          title="Download Application"
        >
          <Download size={15} color="var(--primary)" />
          {!isMobile && <span style={styles.btnText}>Download</span>}
        </button>
      )}

      {/* Mobile Slide-up Auto-Prompt Banner */}
      {showBanner && (
        <div style={styles.mobileBanner} className="animate-fade-in">
          <div style={styles.bannerLeft}>
            <div style={styles.bannerIconBadge}>
              <Smartphone size={20} color="var(--primary)" />
            </div>
            <div style={styles.bannerTextContainer}>
              <div style={styles.bannerTitle}>Install SplitEasy</div>
              <div style={styles.bannerDesc}>Add to your home screen for quick offline splitting.</div>
            </div>
          </div>
          <div style={styles.bannerActions}>
            <button onClick={handleInstallClickAndDismiss} className="btn btn-primary" style={styles.bannerBtnInstall}>
              Install
            </button>
            <button onClick={dismissBanner} style={styles.bannerBtnClose} title="Dismiss">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* iOS Manual Install Modal */}
      {showIOSModal && (
        <div style={styles.modalOverlay} onClick={() => setShowIOSModal(false)}>
          <div 
            style={styles.modalCard} 
            className="glass-card animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <Smartphone size={20} color="var(--primary)" />
                Install on iOS
              </h3>
              <button style={styles.closeBtn} onClick={() => setShowIOSModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <p style={styles.modalDesc}>
              Follow these simple steps in Safari to install SplitEasy on your iPhone or iPad:
            </p>

            <div style={styles.stepList}>
              <div style={styles.stepItem}>
                <div style={styles.stepNumber}>1</div>
                <div style={styles.stepText}>
                  Tap the **Share** button <span style={styles.highlightBadge}>Share Icon <Share size={14} style={{ display: "inline", verticalAlign: "middle" }} /></span> in the bottom navigation bar of Safari.
                </div>
              </div>
              
              <div style={styles.stepItem}>
                <div style={styles.stepNumber}>2</div>
                <div style={styles.stepText}>
                  Scroll down the action sheet menu and select **&quot;Add to Home Screen&quot;**.
                </div>
              </div>

              <div style={styles.stepItem}>
                <div style={styles.stepNumber}>3</div>
                <div style={styles.stepText}>
                  Tap **&quot;Add&quot;** in the top-right corner to complete the install.
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowIOSModal(false)}
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "1rem" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  installBtn: {
    padding: "0.4rem 0.8rem",
    fontSize: "0.85rem",
    gap: "0.4rem",
    borderColor: "rgba(229, 169, 59, 0.3)",
    background: "rgba(229, 169, 59, 0.05)",
  },
  installBtnMobile: {
    padding: "0.4rem",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderColor: "rgba(229, 169, 59, 0.3)",
    background: "rgba(229, 169, 59, 0.05)",
    cursor: "pointer",
  },
  btnText: {
    // Hidden on small screens, shown on desktop via responsive rules if needed
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    padding: "1.5rem",
  },
  modalCard: {
    width: "100%",
    maxWidth: "400px",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: "1.2rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "0.25rem",
  },
  modalDesc: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  stepList: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  stepItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
  },
  stepNumber: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "rgba(229, 169, 59, 0.15)",
    border: "1px solid rgba(229, 169, 59, 0.3)",
    color: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.85rem",
    flexShrink: 0,
  },
  stepText: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    lineHeight: 1.4,
  },
  highlightBadge: {
    backgroundColor: "var(--surface-hover)",
    border: "1px solid var(--border-light)",
    padding: "0.1rem 0.35rem",
    borderRadius: "4px",
    fontSize: "0.8rem",
    whiteSpace: "nowrap",
  },
  mobileBanner: {
    position: "fixed",
    bottom: "80px",
    left: "1rem",
    right: "1rem",
    backgroundColor: "var(--surface)",
    border: "1px solid var(--border-light)",
    borderRadius: "16px",
    padding: "1rem",
    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    zIndex: 9999,
  },
  bannerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  bannerIconBadge: {
    background: "rgba(229, 169, 59, 0.1)",
    padding: "0.5rem",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bannerTextContainer: {
    display: "flex",
    flexDirection: "column",
  },
  bannerTitle: {
    fontWeight: 700,
    fontSize: "0.95rem",
    color: "var(--text-primary)",
  },
  bannerDesc: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginTop: "0.15rem",
    lineHeight: 1.3,
  },
  bannerActions: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexShrink: 0,
  },
  bannerBtnInstall: {
    padding: "0.45rem 1rem",
    fontSize: "0.85rem",
  },
  bannerBtnClose: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "0.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
