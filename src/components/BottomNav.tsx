"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, User, PieChart, CircleUser } from "lucide-react";

interface BottomNavProps {
  displayName: string;
}

const navItems = [
  { href: "/dashboard",  label: "Groups",   icon: Users },
  { href: "/friends",    label: "Friends",  icon: User },
  { href: "/spending",   label: "Spending", icon: PieChart },
  { href: "/profile",    label: "Me",       icon: CircleUser },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function BottomNav(_props: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className="bottom-nav-link"
            style={active ? { color: "var(--primary)", fontWeight: 700 } : { color: "var(--text-secondary)" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "44px",
                height: "28px",
                borderRadius: "14px",
                backgroundColor: active ? "var(--primary-glow)" : "transparent",
                transition: "background-color 0.2s ease",
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
            </div>
            <span style={{ fontSize: "0.72rem", letterSpacing: "-0.01em" }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
