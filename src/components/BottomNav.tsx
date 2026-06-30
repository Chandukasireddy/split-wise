"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Activity, User } from "lucide-react";

interface BottomNavProps {
  displayName: string;
}

const navItems = [
  { href: "/dashboard",  label: "Dashboard", icon: LayoutDashboard },
  { href: "/friends",    label: "Friends",   icon: Users },
  { href: "/activities", label: "Activity",  icon: Activity },
  { href: "/profile",    label: "Profile",   icon: User },
];

export default function BottomNav({ displayName: _displayName }: BottomNavProps) {
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
            style={active ? { color: "var(--primary)", fontWeight: 700 } : {}}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
