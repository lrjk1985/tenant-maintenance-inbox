import {
  ClipboardList,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/app/actions";
import { isAdminStaff } from "@/lib/staff";
import type { StaffUser } from "@/lib/types";

type ActivePage = "admin" | "chat" | "tickets" | "history";

const navItems = [
  { key: "chat", href: "/", label: "Chat", icon: MessageCircle },
  { key: "tickets", href: "/tickets", label: "Tickets", icon: ClipboardList },
  { key: "history", href: "/history", label: "History", icon: ShieldCheck },
] as const;

export function AppNavigation({ active, user }: { active: ActivePage; user: StaffUser | null }) {
  const accountName = user?.full_name ?? user?.email ?? "Staff account";
  const accountDetail = user?.email && user.full_name ? user.email : user?.role ?? "Signed in";
  const visibleNavItems = isAdminStaff(user?.role)
    ? [...navItems, { key: "admin", href: "/admin", label: "Admin", icon: Settings } as const]
    : navItems;

  return (
    <>
      <aside className="hidden w-56 flex-col border-r border-[#d8ddd3] bg-[#fbfcf8] px-4 py-5 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#0f7b5f] text-white shadow-sm">
            <Wrench size={22} aria-hidden />
          </div>
          <p className="text-sm font-semibold leading-tight text-[#17201c]">
            Tenant Maintenance Requests
          </p>
        </div>
        <div className="mt-4 rounded-md border border-[#d8ddd3] bg-white px-3 py-2">
          <p className="break-words text-sm font-semibold text-[#26362e] [overflow-wrap:anywhere]">
            {accountName}
          </p>
          <p className="mt-0.5 break-words text-xs text-[#718078] [overflow-wrap:anywhere]">
            {accountDetail}
          </p>
        </div>
        <form action={signOutAction} className="mt-4">
          <button
            className="flex h-10 w-full items-center gap-3 rounded-md border border-[#d8ddd3] bg-white px-3 text-sm font-medium text-[#64746c] transition hover:bg-[#ebefe8] hover:text-[#17201c]"
            title="Sign out"
            type="submit"
          >
            <LogOut size={18} aria-hidden />
            <span>Sign out</span>
          </button>
        </form>
        <nav className="mt-8 flex flex-1 flex-col gap-2">
          {visibleNavItems.map((item) => (
            <NavPill
              active={active === item.key}
              href={item.href}
              icon={<item.icon size={20} aria-hidden />}
              key={item.key}
              label={item.label}
            />
          ))}
        </nav>
      </aside>

      <nav
        className={`fixed inset-x-0 bottom-0 z-30 grid border-t border-[#d8ddd3] bg-[#fbfcf8]/95 px-2 py-2 shadow-[0_-8px_24px_rgba(23,32,28,0.08)] backdrop-blur lg:hidden ${
          isAdminStaff(user?.role) ? "grid-cols-5" : "grid-cols-4"
        }`}
      >
        {visibleNavItems.map((item) => (
          <MobileNavItem
            active={active === item.key}
            href={item.href}
            icon={<item.icon size={20} aria-hidden />}
            key={item.key}
            label={item.label}
          />
        ))}
        <form action={signOutAction}>
          <button
            className="flex h-12 w-full flex-col items-center justify-center gap-1 rounded-md text-xs font-medium text-[#64746c] transition hover:bg-[#ebefe8] hover:text-[#17201c]"
            title="Sign out"
            type="submit"
          >
            <LogOut size={20} aria-hidden />
            <span>Sign out</span>
          </button>
        </form>
      </nav>
    </>
  );
}

function NavPill({
  active,
  href,
  icon,
  label,
}: {
  active?: boolean;
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
        active
          ? "bg-[#e1f2ea] text-[#0f7b5f]"
          : "text-[#64746c] hover:bg-[#ebefe8] hover:text-[#17201c]"
      }`}
      href={href}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MobileNavItem({
  active,
  href,
  icon,
  label,
}: {
  active?: boolean;
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      className={`flex h-12 flex-col items-center justify-center gap-1 rounded-md text-xs font-medium transition ${
        active
          ? "bg-[#e1f2ea] text-[#0f7b5f]"
          : "text-[#64746c] hover:bg-[#ebefe8] hover:text-[#17201c]"
      }`}
      href={href}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
