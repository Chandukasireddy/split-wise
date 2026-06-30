"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Activity } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/friends",   label: "Friends",   icon: Users },
  { href: "/activities",label: "Activity",  icon: Activity },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.9rem",
              fontWeight: active ? 700 : 500,
              color: active ? "var(--primary)" : "var(--text-secondary)",
              padding: "0.5rem 0.85rem",
              borderRadius: "8px",
              textDecoration: "none",
              background: active ? "rgba(16, 185, 129, 0.08)" : "transparent",
              borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <Icon size={17} />
            <span>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
