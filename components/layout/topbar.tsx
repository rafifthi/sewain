"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleDollarSign,
  FileType2,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import { useI18n, type AccessCtx } from "@/components/context";
import { initials } from "@/lib/access-control";
import type { Locale } from "@/lib/i18n";

type PageId = "dashboard" | "calendar" | "properties" | "tenants" | "reservations" | "invoices" | "tokens" | "contracts" | "messages" | "tickets" | "documents" | "settings";

type NotificationItem = {
  id: string;
  page: PageId;
  rowId: string;
  kind: "payment" | "reminder" | "maintenance" | "contract";
  title: string;
  description: string;
  time: string;
};

export interface TopbarProps {
  toggleSidebar: () => void;
  sidebarCollapsed: boolean;
  t: (value: string) => string;
  setMobileNav: (open: boolean) => void;
  page: PageId;
  go: (id: PageId) => void;
  access: AccessCtx;
  setActingAsOpen: Dispatch<SetStateAction<boolean>>;
  actingAsOpen: boolean;
  actingAsRef: RefObject<HTMLDivElement | null>;
  locale: Locale;
  notificationsRef: RefObject<HTMLDivElement | null>;
  notificationsOpen: boolean;
  setNotificationsOpen: Dispatch<SetStateAction<boolean>>;
  notificationItems: NotificationItem[];
  readNotifications: string[];
  rememberRead: (ids: string[]) => void;
  openNotification: (item: NotificationItem) => void;
}

export function Topbar({
  toggleSidebar,
  sidebarCollapsed,
  t,
  setMobileNav,
  page,
  go,
  access,
  setActingAsOpen,
  actingAsOpen,
  actingAsRef,
  locale,
  notificationsRef,
  notificationsOpen,
  setNotificationsOpen,
  notificationItems,
  readNotifications,
  rememberRead,
  openNotification,
}: TopbarProps) {
  useI18n();

  return <header className="topbar"><button className="collapse-button topbar-collapse" onClick={toggleSidebar} aria-label={t(sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar")} aria-pressed={sidebarCollapsed} title={t(sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar")}><span className="collapse-icon-stack" aria-hidden="true"><span className={sidebarCollapsed ? "is-visible" : "is-hidden"}><PanelLeftOpen /></span><span className={sidebarCollapsed ? "is-hidden" : "is-visible"}><PanelLeftClose /></span></span></button><button className="icon-button menu-button" aria-label={t("Buka navigasi")} onClick={() => setMobileNav(true)}><PanelLeftOpen /></button><div className="global-search"><Search /><input type="search" enterKeyHint="search" aria-label={t("Pencarian global")} placeholder={t("Cari properti, penyewa, atau tagihan...")} /><span className="kbd">⌘K</span></div><div className="top-actions"><button className={`icon-button hide-mobile ${page === "calendar" ? "active" : ""}`} aria-label={t("Jadwal")} onClick={() => go("calendar")}><CalendarDays /></button>{access.members.length > 1 && <div className="acting-as-anchor" ref={actingAsRef}><button className={`icon-button acting-as-trigger ${actingAsOpen ? "active" : ""}`} aria-label={t("Lihat sebagai")} aria-haspopup="dialog" aria-expanded={actingAsOpen} onClick={() => setActingAsOpen(o => !o)} title={t("Lihat sebagai") + ": " + (access.currentMember?.name || "")}><span className="acting-as-avatar">{initials(access.currentMember?.name || "?")}</span></button>{actingAsOpen && <div className="acting-as-popover" role="dialog" aria-label={t("Lihat sebagai")}><p className="acting-as-label">{t("Lihat sebagai")}</p>{access.members.map(member => { const role = access.roles.find(r => r.id === member.roleId); return <button key={member.id} className={`acting-as-option ${member.id === access.currentUserId ? "active" : ""}`} onClick={() => { access.setCurrentUserId(member.id); setActingAsOpen(false); }}><span className="acting-as-opt-avatar">{initials(member.name)}</span><span className="acting-as-opt-copy"><strong>{member.name}</strong><span>{role ? t(role.name) : ""}</span></span>{member.id === access.currentUserId && <Check size={14} />}</button>; })}</div>}</div>}<div className="notification-anchor" ref={notificationsRef}><button className={`icon-button notification-trigger ${notificationsOpen ? "active" : ""}`} aria-label={locale === "en" ? "Notifications" : "Notifikasi"} aria-haspopup="dialog" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(current => !current)}><Bell />{notificationItems.some(item => !readNotifications.includes(item.id)) && <span className="notification-dot" aria-hidden="true" />}</button>{notificationsOpen && <section className="notification-popover" role="dialog" aria-label={locale === "en" ? "Notifications" : "Notifikasi"}><div className="notification-head"><div><h2>{locale === "en" ? "Notifications" : "Notifikasi"}</h2><p>{locale === "en" ? "Your latest operational updates" : "Pembaruan operasional terbaru"}</p></div><button className="notification-read-all" onClick={() => rememberRead(notificationItems.map(item => item.id))}>{locale === "en" ? "Mark all read" : "Tandai dibaca"}</button></div><div className="notification-list">{notificationItems.map(item => { const unread = !readNotifications.includes(item.id); const Icon = item.kind === "payment" ? CircleDollarSign : item.kind === "reminder" ? CalendarClock : item.kind === "maintenance" ? MessageSquareText : FileType2; return <button className={`notification-item ${unread ? "unread" : ""}`} key={item.id} onClick={() => openNotification(item)}><span className={`notification-icon ${item.kind}`}><Icon /></span><span className="notification-copy"><span className="notification-title">{locale === "en" ? ({ payment: "Payment received", reminder: "Invoice due today", maintenance: "New complaint from WhatsApp bot", contract: "Contract awaiting signature" } as const)[item.kind] : item.title}</span><span className="notification-description">{item.description}</span><time>{item.time}</time></span>{unread && <span className="unread-dot" aria-label={locale === "en" ? "Unread" : "Belum dibaca"} />}</button>; })}</div><button className="notification-footer" onClick={() => { setNotificationsOpen(false); go("dashboard"); }}>{locale === "en" ? "Open activity overview" : "Buka ringkasan aktivitas"}<ChevronLeft /></button></section>}</div></div></header>;
}
