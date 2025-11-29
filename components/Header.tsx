"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { isSuperAdmin } from "@/lib/super-admin";
import LanguageSwitcher from "./LanguageSwitcher";

export function Header() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = (params.locale as string) || "de";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("header");
  const tCommon = useTranslations("common");

  // Scroll hide/show state
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Check if on home page
  const isHomePage = pathname === `/${locale}` || pathname === "/" || pathname === `/${locale}/`;

  // Check if on admin page
  const isAdminPage = pathname?.startsWith(`/${locale}/admin`);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll hide/show logic
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        // Scrolling down & past threshold
        setIsHidden(true);
      } else {
        // Scrolling up
        setIsHidden(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-glass-border bg-surface-1/95 backdrop-blur-xl",
        "transition-transform duration-300",
        isHidden ? "-translate-y-full" : "translate-y-0"
      )}
    >
      <div className="max-w-[1440px] mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left side: Back button + Logo */}
        <div className="flex items-center gap-3">
          {/* Back Button - only show if not on home page */}
          {!isHomePage && (
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-surface-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Logo / Name */}
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 text-text-primary hover:text-primary transition-colors"
          >
            <span className="text-xl">CH</span>
            <span className="text-lg font-bold tracking-tight">Swiss Guesser</span>
          </Link>

          {/* Page Title for Admin */}
          {isAdminPage && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-glass-border">
              <h1 className="text-lg font-semibold text-text-primary">Admin Dashboard</h1>
            </div>
          )}
        </div>

        {/* Right side: Language Switcher + User Info */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          {status === "loading" ? (
            <div className="w-8 h-8 rounded-full bg-surface-2 animate-pulse" />
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors",
                  "hover:bg-surface-2",
                  dropdownOpen && "bg-surface-2"
                )}
              >
                {/* Avatar */}
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || "User"}
                    className="w-8 h-8 rounded-full border border-glass-border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-background text-sm font-bold">
                    {initials}
                  </div>
                )}
                {/* Name (hidden on mobile) */}
                <span className="hidden sm:block text-sm text-text-secondary max-w-[120px] truncate">
                  {user.name}
                </span>
                {/* Dropdown Arrow */}
                <svg
                  className={cn(
                    "w-4 h-4 text-text-muted transition-transform",
                    dropdownOpen && "rotate-180"
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 py-1 bg-surface-2 border border-glass-border rounded-xl shadow-lg animate-fade-in">
                  {/* User Email */}
                  <div className="px-4 py-2 border-b border-glass-border">
                    <p className="text-xs text-text-muted truncate">{user.email}</p>
                  </div>

                  {/* Menu Items */}
                  <Link
                    href={`/${locale}/groups`}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {t("myGroups")}
                  </Link>

                  <Link
                    href={`/${locale}/train`}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {t("train")}
                  </Link>

                  {isSuperAdmin(user.email) && (
                    <Link
                      href={`/${locale}/admin`}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {tCommon("admin")}
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      signOut({ callbackUrl: `/${locale}` });
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-surface-3 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {t("logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="px-4 py-2 text-sm font-medium text-primary hover:text-primary-light transition-colors"
            >
              {t("login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
