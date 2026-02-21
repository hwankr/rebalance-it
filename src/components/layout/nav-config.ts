import {
  LayoutDashboard,
  RefreshCw,
  History,
  Settings,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItemConfig {
  href: string;
  label: string;
  icon: LucideIcon;
  /** true = show in mobile BottomNav (max 4-5 recommended) */
  showInMobile: boolean;
}

export const navItems: NavItemConfig[] = [
  { href: "/portfolio", label: "포트폴리오", icon: LayoutDashboard, showInMobile: true },
  { href: "/rebalance", label: "리밸런싱", icon: RefreshCw, showInMobile: true },
  { href: "/history", label: "기록", icon: History, showInMobile: true },
  { href: "/notes", label: "투자 노트", icon: BookOpen, showInMobile: false },
  { href: "/settings", label: "설정", icon: Settings, showInMobile: true },
];
