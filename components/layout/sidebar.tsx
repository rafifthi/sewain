"use client";

import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  FileType2,
  Gauge,
  LogOut,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UsersRound,
  WalletCards,
  Wrench,
  Zap,
} from "lucide-react";
import { useI18n, type AccessCtx } from "@/components/context";
import { useAuth } from "@/components/context/auth-context";
import { initials } from "@/lib/access-control";
import type { Locale } from "@/lib/i18n";

type PageId = "dashboard" | "calendar" | "properties" | "tenants" | "reservations" | "invoices" | "tokens" | "contracts" | "messages" | "tickets" | "documents" | "settings";

const nav = [
  { id: "dashboard", label: "Ringkasan", icon: Gauge },
  { id: "calendar", label: "Kalender", icon: CalendarDays },
  { id: "properties", label: "Properti", icon: Building2 },
  { id: "tenants", label: "Penyewa", icon: UsersRound },
  { id: "reservations", label: "Reservasi", icon: WalletCards },
  { id: "invoices", label: "Tagihan", icon: CreditCard },
  { id: "tokens", label: "Token PLN", icon: Zap },
  { id: "contracts", label: "Kontrak", icon: FileType2 },
  { id: "messages", label: "Template Pesan", icon: MessageSquareText },
  { id: "tickets", label: "Pemeliharaan", icon: Wrench },
  { id: "documents", label: "Dokumen", icon: FileText },
  { id: "settings", label: "Pengaturan", icon: Settings },
] as const;

export interface SidebarProps {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  page: PageId;
  go: (id: PageId) => void;
  navAllowed: (id: string) => boolean;
  access: AccessCtx;
  t: (value: string) => string;
  mobileNav: boolean;
  setMobileNav: (open: boolean) => void;
}

export function Sidebar({
  sidebarCollapsed,
  toggleSidebar,
  locale,
  setLocale,
  page,
  go,
  navAllowed,
  access,
  t,
  mobileNav,
  setMobileNav,
}: SidebarProps) {
  useI18n();
  const router = useRouter();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    setMobileNav(false);
    router.replace("/login");
  }

  return <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
    <div className="brand"><span className="brand-mark"><img src="/logo.svg" alt="Sewain" width={24} height={24} style={{borderRadius: 6}} /></span><span className="brand-name">Sewain</span><button className="collapse-button" onClick={toggleSidebar} aria-label={t(sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar")} aria-pressed={sidebarCollapsed} title={t(sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar")} aria-hidden="true">{sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button></div>
    <nav className="nav" aria-label={t("Navigasi utama")}><div className="nav-label">{t("Operasional")}</div>{nav.slice(0, 10).filter(item => navAllowed(item.id)).map(item => <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => go(item.id as PageId)} aria-label={t(item.label)} title={sidebarCollapsed ? t(item.label) : undefined}><item.icon /><span className="nav-item-label">{t(item.label)}</span></button>)}<div className="nav-label">Workspace</div>{nav.slice(10).filter(item => navAllowed(item.id)).map(item => <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => go(item.id as PageId)} aria-label={t(item.label)} title={sidebarCollapsed ? t(item.label) : undefined}><item.icon /><span className="nav-item-label">{t(item.label)}</span></button>)}</nav>
    <div className="language-switcher"><span className="language-flag" aria-hidden="true">{locale === "id" ? "🇮🇩" : "🇬🇧"}</span><select id="locale" aria-label={t("Bahasa")} value={locale} onChange={event => setLocale(event.target.value as Locale)}><option value="id">Indonesia</option><option value="en">English</option></select></div>
    <div className="profile" title={sidebarCollapsed ? access.currentMember?.name : undefined}><span className="avatar">{initials(access.currentMember?.name || "?")}</span><div className="profile-copy"><strong>{access.currentMember?.name || "—"}</strong><span>{access.currentRole ? t(access.currentRole.name) : t("Tanpa peran")} · PT Makmur</span></div><button type="button" className="logout-button" onClick={handleLogout} aria-label={t("Keluar")} title={t("Keluar")}><LogOut /><span>{t("Keluar")}</span></button></div>
  </aside>;
}
