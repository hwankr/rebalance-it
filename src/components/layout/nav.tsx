"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  showBadge?: boolean;
}

export function NavItem({ href, label, icon: Icon, showBadge }: NavItemProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 relative",
        isActive
          ? "bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white shadow-md"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 transition-transform duration-200",
          isActive && "scale-110"
        )}
      />
      {label}
      {showBadge && (
        <span className="ml-auto h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
      )}
    </Link>
  );
}
