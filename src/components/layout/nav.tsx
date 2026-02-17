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
        "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-200 relative",
        isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
      {showBadge && (
        <span className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
      )}
    </Link>
  );
}
