import React from "react";

export default function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}>
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%",
        border: "3px solid rgba(16,185,129,0.2)",
        borderTopColor: "var(--primary)",
        animation: "spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
