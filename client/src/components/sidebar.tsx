"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  FolderKanban,
  Award,
  CalendarDays,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/teams", label: "팀 관리", icon: Users },
  { href: "/members", label: "멤버 관리", icon: UserCircle },
  { href: "/projects", label: "프로젝트", icon: FolderKanban },
  { href: "/evaluations", label: "성과 평가", icon: Award },
  { href: "/schedule", label: "스케줄", icon: CalendarDays },
];

function NavContent({ pathname, onItemClick }: { pathname: string; onItemClick?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold text-white tracking-tight">TeamPulse</h1>
        <p className="text-xs text-slate-400 mt-1">부서 통합 관리</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/15 text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-slate-500">TeamPulse v1.0</div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-slate-900 min-h-screen fixed left-0 top-0 bottom-0 z-30">
        <NavContent pathname={pathname} />
      </aside>

      {/* Mobile trigger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b px-4 py-3 flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-slate-900 border-r-0">
            <SheetTitle className="sr-only">내비게이션</SheetTitle>
            <NavContent pathname={pathname} onItemClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-bold">TeamPulse</h1>
      </div>
    </>
  );
}
