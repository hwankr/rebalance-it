"use client";

import { Menu, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/lib/supabase/auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { NavItem } from "./nav";
import { navItems } from "./sidebar";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">메뉴 열기</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="px-6 pt-4">
            <SheetTitle className="text-lg font-bold">
              Rebalance-it
            </SheetTitle>
          </SheetHeader>
          <Separator />
          <nav className="space-y-1 px-3 py-4">
            {navItems.map((item) => (
              <div key={item.href} onClick={() => setOpen(false)}>
                <NavItem {...item} />
              </div>
            ))}
          </nav>
          <div className="mt-auto px-3 py-4 border-t">
            <form action={signOut}>
              <Button variant="ghost" className="w-full justify-start gap-2" type="submit">
                <LogOut className="size-4" />
                로그아웃
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <Badge variant="outline" className="text-xs">
        미연결
      </Badge>
    </header>
  );
}
