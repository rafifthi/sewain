"use client";

import { useState, useEffect } from "react";
import { Bot, Check, ChevronDown, CreditCard, MessageSquareText, Pencil, Plus, ShieldCheck, Trash2, X, Zap } from "lucide-react";
import { Row } from "@/lib/data";
import { useI18n, useTokenConfig, useAccess } from "@/components/context";
import { message, type Locale } from "@/lib/i18n";
import { formatRp } from "@/lib/utility-token-config";
import { Member, MemberStatus, Role, PermissionAction, ModuleId, PERMISSION_ACTIONS, PERMISSION_MODULES, initials, emptyPermissions } from "@/lib/access-control";
import { PageHead, type PageId } from "./shared";

type BotSettings = { greetingMessage: string; autoTranslate: boolean; marketingContent: string };
const defaultBotSettings: BotSettings = { greetingMessage: "Halo! Selamat datang di layanan Sewain. Ada yang bisa dibantu?", autoTranslate: false, marketingContent: "Halo! Anda belum terdaftar sebagai penyewa kami. Tertarik dengan unit yang tersedia? Kunjungi sewain.id atau hubungi kami untuk info lebih lanjut." };
const BOT_SETTINGS_KEY = "sewain:bot-settings";

function slug(value: unknown) {
  return String(value).toLowerCase().replace(/\s+/g, "-");
}

function Field({ label, value, full, type = "text", multiline, options, autoComplete }: { label: string; value: string; full?: boolean; type?: React.HTMLInputTypeAttribute; multiline?: boolean; options?: string[]; autoComplete?: string }) {
  const { t, v } = useI18n();
  const id = `field-${slug(label)}`;
  return <div className={`form-field ${full ? "full" : ""}`}>
    <label htmlFor={id}>{t(label)}</label>
    {options ? <select id={id} defaultValue={value}>{options.map(opt => <option key={opt} value={opt}>{t(opt)}</option>)}</select> : multiline ? <textarea id={id} rows={3} defaultValue={value} /> : <input id={id} type={type} defaultValue={value} autoComplete={autoComplete} />}
  </div>;
}

type IntegrationConfig = { botUrl: string; apiKey: string };

function MemberDialog({ member, roles, onClose, onSave }: { member?: Member; roles: Role[]; onClose: () => void; onSave: (m: Member) => void }) {
  const { locale, t, v } = useI18n();
  const [name, setName] = useState(member?.name || "");
  const [email, setEmail] = useState(member?.email || "");
  const [roleId, setRoleId] = useState(member?.roleId || roles[0]?.id || "");
  const [status, setStatus] = useState<MemberStatus>(member?.status || "invited");
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!name.trim() || !email.trim()) return; onSave({ id: member?.id || `m-${Date.now()}`, name: name.trim(), email: email.trim(), roleId, status }); };
  return <div className="backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}><form className="dialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="member-dialog-title">
    <div className="dialog-head"><div><h2 id="member-dialog-title">{member ? (locale === "en" ? "Edit member" : "Edit anggota") : (locale === "en" ? "Invite member" : "Undang anggota")}</h2><p>{locale === "en" ? "Assign a role to control what this member can access." : "Tetapkan peran untuk mengatur akses anggota ini."}</p></div><button type="button" className="icon-button" aria-label={t("Tutup")} onClick={onClose}><X /></button></div>
    <div className="dialog-body"><div className="form-grid">
      <div className="form-field full"><label htmlFor="member-name">{t("Nama lengkap")}</label><input id="member-name" value={name} autoComplete="name" onChange={e => setName(e.target.value)} required /></div>
      <div className="form-field full"><label htmlFor="member-email">Email</label><input id="member-email" type="email" value={email} autoComplete="email" onChange={e => setEmail(e.target.value)} required /></div>
      <div className="form-field"><label htmlFor="member-role">{locale === "en" ? "Role" : "Peran"}</label><select id="member-role" value={roleId} onChange={e => setRoleId(e.target.value)}>{roles.map(r => <option key={r.id} value={r.id}>{v(r.name)}</option>)}</select></div>
      <div className="form-field"><label htmlFor="member-status">{t("Status")}</label><select id="member-status" value={status} onChange={e => setStatus(e.target.value as MemberStatus)}>{(["active", "invited", "inactive"] as MemberStatus[]).map(s => <option key={s} value={s}>{t(memberStatusLabel[s])}</option>)}</select></div>
    </div></div>
    <div className="dialog-actions"><button type="button" className="button" onClick={onClose}>{t("Batal")}</button><button type="submit" className="button primary">{member ? t("Simpan perubahan") : (locale === "en" ? "Send invite" : "Kirim undangan")}</button></div>
  </form></div>;
}

const memberStatusLabel: Record<MemberStatus, string> = { active: "Aktif", invited: "Diundang", inactive: "Nonaktif" };

function MembersPanel({ notify }: { notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const { roles, members, currentUserId, setMembers, setCurrentUserId, can } = useAccess();
  const [dialog, setDialog] = useState<{ member?: Member } | null>(null);
  const canManage = can("settings", "edit");
  const roleName = (id: string) => roles.find(r => r.id === id)?.name || "—";
  const updateMember = (id: string, patch: Partial<Member>) => setMembers(members.map(m => m.id === id ? { ...m, ...patch } : m));
  const removeMember = (m: Member) => {
    if (m.roleId === "owner" && members.filter(x => x.roleId === "owner").length === 1) { notify(locale === "en" ? "Cannot remove the last owner." : "Tidak bisa menghapus pemilik terakhir."); return; }
    if (!window.confirm(locale === "en" ? `Remove ${m.name}?` : `Hapus ${m.name}?`)) return;
    const next = members.filter(x => x.id !== m.id);
    setMembers(next);
    if (currentUserId === m.id && next[0]) setCurrentUserId(next[0].id);
    notify(locale === "en" ? "Member removed." : "Anggota dihapus.");
  };
  const saveMember = (member: Member) => {
    setMembers(members.some(m => m.id === member.id) ? members.map(m => m.id === member.id ? member : m) : [...members, member]);
    setDialog(null);
    notify(locale === "en" ? "Member saved." : "Anggota disimpan.");
  };
  return <div className="access-panel">
    <div className="panel-head"><div><h2>{locale === "en" ? "Members" : "Anggota"}</h2><p>{members.length} {locale === "en" ? "members" : "anggota"}</p></div>{canManage && <button className="button primary" onClick={() => setDialog({})}><Plus />{locale === "en" ? "Invite member" : "Undang anggota"}</button>}</div>
    <div className="table-wrap"><table>
      <thead><tr><th>{t("Nama")}</th><th>Email</th><th>{locale === "en" ? "Role" : "Peran"}</th><th>{t("Status")}</th><th>{t("Aksi")}</th></tr></thead>
      <tbody>{members.map(m => <tr key={m.id}>
        <td><span className="tenant-name"><span className="avatar small">{initials(m.name)}</span><strong>{v(m.name)}</strong></span></td>
        <td>{v(m.email)}</td>
        <td>{canManage ? <select value={m.roleId} aria-label={`${locale === "en" ? "Role for" : "Peran untuk"} ${m.name}`} onChange={e => updateMember(m.id, { roleId: e.target.value })}>{roles.map(r => <option key={r.id} value={r.id}>{v(r.name)}</option>)}</select> : v(roleName(m.roleId))}</td>
        <td>{canManage ? <select value={m.status} aria-label={`Status ${m.name}`} onChange={e => updateMember(m.id, { status: e.target.value as MemberStatus })}>{(["active", "invited", "inactive"] as MemberStatus[]).map(s => <option key={s} value={s}>{t(memberStatusLabel[s])}</option>)}</select> : <Status>{memberStatusLabel[m.status]}</Status>}</td>
        <td><div className="actions">{canManage ? <><button className="icon-button" aria-label={`${t("Edit")} ${m.name}`} onClick={() => setDialog({ member: m })}><Pencil /></button><button className="icon-button" aria-label={`${t("Hapus")} ${m.name}`} onClick={() => removeMember(m)}><Trash2 /></button></> : <span className="cell-sub">{t("Hanya lihat")}</span>}</div></td>
      </tr>)}</tbody>
    </table></div>
    {dialog && <MemberDialog member={dialog.member} roles={roles} onClose={() => setDialog(null)} onSave={saveMember} />}
  </div>;
}

function Status({ children }: { children: React.ReactNode }) {
  const { v } = useI18n();
  const value = String(children);
  const state = /tidak aktif|tidak|nonaktif|belum ada sewa/i.test(value) ? "" :
    /aktif|lunas|dihuni|selesai|terkirim|ditandatangani|terverifikasi/i.test(value) ? "success" :
    /terlambat|perawatan|perlu perhatian/i.test(value) ? "danger" :
    /\bbooking\b/i.test(value) ? "info" :
    /jatuh|dipesan|kontrak|menunggu|ditugaskan|akan kosong|draf|diproses|dikonfirmasi|token siap/i.test(value) ? "warning" : "";
  return <span className={`badge ${state} ${slug(value)}`}>{v(value)}</span>;
}

const actionLabel: Record<PermissionAction, string> = { view: "Lihat", create: "Tambah", edit: "Ubah", delete: "Hapus" };

function RolesPanel({ notify }: { notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const { roles, members, currentRole, setRoles, can } = useAccess();
  const [selectedId, setSelectedId] = useState(roles[0]?.id || "");
  const canManage = can("settings", "edit");
  const isActingOwner = currentRole?.id === "owner";
  const selected = roles.find(r => r.id === selectedId) || roles[0];
  const memberCount = (roleId: string) => members.filter(m => m.roleId === roleId).length;
  const ownerLocked = selected?.id === "owner";
  const systemLocked = Boolean(selected?.system) && !isActingOwner;
  const editable = canManage && !ownerLocked && !systemLocked;
  const update = (next: Role) => setRoles(roles.map(r => r.id === next.id ? next : r));
  const toggle = (module: ModuleId, action: PermissionAction) => {
    if (!selected || !editable) return;
    const current = selected.permissions[module];
    const value = !current[action];
    const updatedModule = { ...current, [action]: value };
    if (action === "view" && !value) { updatedModule.create = false; updatedModule.edit = false; updatedModule.delete = false; }
    if (action !== "view" && value) updatedModule.view = true;
    update({ ...selected, permissions: { ...selected.permissions, [module]: updatedModule } });
  };
  const createRole = () => {
    const id = `role-${Date.now()}`;
    setRoles([...roles, { id, name: locale === "en" ? "New role" : "Peran baru", description: "", system: false, permissions: emptyPermissions() }]);
    setSelectedId(id);
    notify(locale === "en" ? "Role created." : "Peran dibuat.");
  };
  const deleteRole = () => {
    if (!selected || selected.system) return;
    if (memberCount(selected.id)) { notify(locale === "en" ? "Reassign members before deleting this role." : "Pindahkan anggota sebelum menghapus peran ini."); return; }
    if (!window.confirm(locale === "en" ? `Delete role "${selected.name}"?` : `Hapus peran "${selected.name}"?`)) return;
    const next = roles.filter(r => r.id !== selected.id);
    setRoles(next);
    setSelectedId(next[0]?.id || "");
    notify(locale === "en" ? "Role deleted." : "Peran dihapus.");
  };
  return <div className="access-panel roles-layout">
    <div className="role-list">
      <div className="panel-head"><h2>{locale === "en" ? "Roles" : "Peran"}</h2>{canManage && <button className="button" onClick={createRole}><Plus />{locale === "en" ? "Create role" : "Buat peran"}</button>}</div>
      {roles.map(r => <button key={r.id} className={`role-card ${selectedId === r.id ? "active" : ""}`} onClick={() => setSelectedId(r.id)}>
        <span className="role-card-head"><ShieldCheck /><strong>{v(r.name)}</strong>{r.system && <span className="role-badge">{locale === "en" ? "System" : "Sistem"}</span>}</span>
        <span className="cell-sub">{r.description ? v(r.description) : (locale === "en" ? "Custom role" : "Peran khusus")}</span>
        <span className="cell-sub">{memberCount(r.id)} {locale === "en" ? "members" : "anggota"}</span>
      </button>)}
    </div>
    {selected && <div className="role-detail">
      <div className="form-grid">
        <div className="form-field"><label htmlFor="role-name">{locale === "en" ? "Role name" : "Nama peran"}</label><input id="role-name" value={v(selected.name)} disabled={!editable} onChange={e => update({ ...selected, name: e.target.value })} /></div>
        <div className="form-field"><label htmlFor="role-desc">{locale === "en" ? "Description" : "Deskripsi"}</label><input id="role-desc" value={v(selected.description)} disabled={!editable} onChange={e => update({ ...selected, description: e.target.value })} /></div>
      </div>
      {ownerLocked && <p className="subtext">{locale === "en" ? "The Owner role always has full access and cannot be edited." : "Peran Pemilik selalu memiliki akses penuh dan tidak dapat diubah."}</p>}
      {systemLocked && !ownerLocked && <p className="subtext">{locale === "en" ? "Only an Owner can change built-in roles." : "Hanya Pemilik yang dapat mengubah peran bawaan."}</p>}
      <div className="table-wrap"><table className="permission-matrix">
        <thead><tr><th>{locale === "en" ? "Module" : "Modul"}</th>{PERMISSION_ACTIONS.map(a => <th key={a}>{t(actionLabel[a])}</th>)}</tr></thead>
        <tbody>{PERMISSION_MODULES.map(mod => <tr key={mod.id}><td>{t(mod.label)}</td>{PERMISSION_ACTIONS.map(a => { const checked = ownerLocked ? true : selected.permissions[mod.id][a]; return <td key={a}><input type="checkbox" aria-label={`${t(mod.label)} ${t(actionLabel[a])}`} checked={checked} disabled={!editable} onChange={() => toggle(mod.id, a)} /></td>; })}</tr>)}</tbody>
      </table></div>
      {!selected.system && canManage && <div className="actions" style={{ marginTop: 16 }}><button className="button danger" onClick={deleteRole}><Trash2 />{locale === "en" ? "Delete role" : "Hapus peran"}</button></div>}
    </div>}
  </div>;
}

export function SettingsPage({ notify, integrationConfig, setIntegrationConfig }: { notify: (s: string) => void; integrationConfig: IntegrationConfig; setIntegrationConfig: (config: IntegrationConfig) => void }) {
  const { locale, t, v } = useI18n();
  const { config: tokenConfig, setConfig: setTokenConfig } = useTokenConfig();
  const [tab, setTab] = useState("Organisasi");
  const [nominalInput, setNominalInput] = useState("");
  const [botSettings, setBotSettings] = useState<BotSettings>(defaultBotSettings);
  const [botPanel, setBotPanel] = useState(false);
  const [botSaving, setBotSaving] = useState(false);

  // Load bot settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(BOT_SETTINGS_KEY);
    if (saved) try { setBotSettings(prev => ({ ...prev, ...JSON.parse(saved) })); } catch {}
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(BOT_SETTINGS_KEY, JSON.stringify(botSettings));
  }, [botSettings]);

  const addNominal = () => {
    const n = Number(nominalInput);
    if (n > 0 && !tokenConfig.nominals.includes(n)) setTokenConfig({ ...tokenConfig, nominals: [...tokenConfig.nominals, n] });
    setNominalInput("");
  };
  const testTelegram = async () => {
    try {
      const response = await fetch(`${integrationConfig.botUrl}/api/health`);
      if (!response.ok) throw new Error("Telegram bot health check failed");
      notify(locale === "en" ? "Telegram bot connected." : "Telegram bot terhubung.");
    } catch {
      notify(locale === "en" ? "Telegram bot connection failed." : "Koneksi Telegram bot gagal.");
    }
  };
  const saveBotSettings = async () => {
    setBotSaving(true);
    try {
      const res = await fetch(`${integrationConfig.botUrl}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": integrationConfig.apiKey },
        body: JSON.stringify({
          greeting_message: botSettings.greetingMessage,
          auto_translate: String(botSettings.autoTranslate),
          marketing_content: botSettings.marketingContent,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      notify(locale === "en" ? "Bot settings saved." : "Pengaturan bot tersimpan.");
    } catch {
      notify(locale === "en" ? "Failed to save bot settings. Check bot URL and API key." : "Gagal menyimpan. Periksa URL bot dan API key.");
    }
    setBotSaving(false);
  };
  const loadBotSettings = async () => {
    try {
      const res = await fetch(`${integrationConfig.botUrl}/api/config`, {
        headers: { "x-api-key": integrationConfig.apiKey },
      });
      if (!res.ok) throw new Error("Load failed");
      const data = await res.json();
      if (data.ok && data.config) {
        setBotSettings({
          greetingMessage: data.config.greeting_message || defaultBotSettings.greetingMessage,
          autoTranslate: data.config.auto_translate === "true",
          marketingContent: data.config.marketing_content || defaultBotSettings.marketingContent,
        });
        notify(locale === "en" ? "Bot settings loaded." : "Pengaturan bot dimuat.");
      }
    } catch {
      notify(locale === "en" ? "Failed to load bot settings." : "Gagal memuat pengaturan bot.");
    }
  };
  const configTab = ["Organisasi", "Penagihan", "Token PLN", "Integrasi"].includes(tab);
  return <><PageHead page="settings" /><section className="panel"><div className="tabs">{["Organisasi", "Penagihan", "Token PLN", "Integrasi", "Pengguna", "Peran"].map(item => <button key={item} onClick={() => setTab(item)} className={`tab ${tab === item ? "active" : ""}`}>{t(item)}</button>)}</div><div className="dialog-body" style={{ maxWidth: configTab ? 720 : "100%" }}>
    {tab === "Organisasi" && <div className="form-grid"><Field label="Nama organisasi" value="PT Makmur Sejahtera" autoComplete="organization" /><Field label="Zona waktu" value="Asia/Jakarta" options={["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]} /><Field full multiline label="Alamat" value="Jl. Melati No. 45, Depok, Jawa Barat" autoComplete="street-address" /></div>}
    {tab === "Penagihan" && <div className="form-grid"><Field label="Tanggal pembuatan tagihan" value="1" type="number" /><Field label="Jatuh tempo standar" value="Tanggal 5" options={["Tanggal 1", "Tanggal 5", "Tanggal 10", "Tanggal 15"]} /><Field label="Pengingat pertama" value="3 hari sebelum" options={["1 hari sebelum", "3 hari sebelum", "7 hari sebelum"]} /><Field label="Pengingat terlambat" value="Setiap 3 hari" options={["Setiap hari", "Setiap 3 hari", "Setiap 7 hari"]} /></div>}
    {tab === "Token PLN" && <div className="form-grid">
      <div className="form-field full">
        <label>{locale === "en" ? "Available denominations" : "Nominal yang tersedia"}</label>
        <div className="tag-input">
          {[...tokenConfig.nominals].sort((a, b) => a - b).map(n => (
            <span className="property-tag" key={n}>{v(formatRp(n))}<button type="button" aria-label={`Hapus ${formatRp(n)}`} onClick={() => setTokenConfig({ ...tokenConfig, nominals: tokenConfig.nominals.filter(x => x !== n) })}><X /></button></span>
          ))}
          <input type="number" min="1000" step="1000" value={nominalInput} onChange={e => setNominalInput(e.target.value)} placeholder={locale === "en" ? "Amount, press Enter" : "Nominal, tekan Enter"} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNominal(); } }} />
        </div>
      </div>
      <div className="form-field full">
        <label>{locale === "en" ? "Platform fee" : "Biaya platform"}</label>
        <p className="subtext">{locale === "en" ? 'Manage the global platform fee from the Token PLN page using the "Manage fee" button.' : 'Kelola biaya platform global dari halaman Token PLN menggunakan tombol "Kelola biaya".'}</p>
      </div>
    </div>}
    {tab === "Integrasi" && <div><div className="activity"><span className="activity-icon"><Bot /></span><span><strong>Telegram Bot @theDaedalus_bot</strong><span className="cell-sub">Kirim notifikasi ke penyewa via Telegram</span></span><span className={`badge ${integrationConfig.apiKey ? "success" : ""}`}>{integrationConfig.apiKey ? "Terhubung" : "Belum terkonfigurasi"}</span></div><div className="form-grid"><div className="form-field full"><label htmlFor="telegram-bot-url">Bot API URL</label><input id="telegram-bot-url" type="text" value={integrationConfig.botUrl} onChange={event => setIntegrationConfig({ ...integrationConfig, botUrl: event.target.value })} /></div><div className="form-field full"><label htmlFor="telegram-api-key">API Key</label><input id="telegram-api-key" type="password" value={integrationConfig.apiKey} onChange={event => setIntegrationConfig({ ...integrationConfig, apiKey: event.target.value })} /></div></div><div className="actions integration-actions"><button type="button" className="button" onClick={testTelegram}>Uji Koneksi</button></div>
      <section className={`bot-settings-panel ${botPanel ? "open" : ""}`}>
        <button type="button" className="bot-settings-trigger" onClick={() => setBotPanel(open => !open)} aria-expanded={botPanel} aria-controls="bot-settings-content">
          <span className="bot-settings-icon"><MessageSquareText /></span>
          <span className="bot-settings-copy"><strong>{locale === "en" ? "Bot settings" : "Pengaturan bot"}</strong><span>{locale === "en" ? "Greeting, translation, and fallback messages" : "Pesan sambutan, terjemahan, dan fallback"}</span></span>
          <span className={`bot-settings-state ${botSettings.autoTranslate ? "success" : ""}`}>{botSettings.autoTranslate ? (locale === "en" ? "Auto" : "Otomatis") : (locale === "en" ? "Manual" : "Manual")}</span>
          <ChevronDown className="bot-settings-chevron" aria-hidden="true" />
        </button>
        <div id="bot-settings-content" className="bot-settings-content" aria-hidden={!botPanel}>
          <fieldset className="bot-settings-inner form-grid" disabled={!botPanel}>
            <div className="form-field full">
              <label htmlFor="greeting-message">{locale === "en" ? "Greeting message" : "Pesan sambutan"}</label>
              <p className="subtext">{locale === "en" ? "Sent automatically when a tenant messages the bot for the first time." : "Dikirim otomatis saat penyewa chat bot untuk pertama kali."}</p>
              <textarea id="greeting-message" rows={4} value={botSettings.greetingMessage} onChange={e => setBotSettings(s => ({ ...s, greetingMessage: e.target.value }))} />
            </div>
            <div className="bot-toggle-row full">
              <span><strong>{locale === "en" ? "Auto-translate" : "Terjemahan otomatis"}</strong><span>{locale === "en" ? "Detect tenant language and respond in the same language." : "Deteksi bahasa penyewa dan jawab dengan bahasa yang sama."}</span></span>
              <label className="switch" htmlFor="auto-translate">
                <input id="auto-translate" type="checkbox" checked={botSettings.autoTranslate} onChange={e => setBotSettings(s => ({ ...s, autoTranslate: e.target.checked }))} />
                <span className="switch-track"><span className="switch-thumb" /></span>
              </label>
            </div>
            <div className="form-field full">
              <label htmlFor="marketing-content">{locale === "en" ? "Marketing content (unmatched users)" : "Konten marketing (pengguna tak dikenal)"}</label>
              <p className="subtext">{locale === "en" ? "Sent when a WhatsApp or Telegram user doesn't match any tenant record." : "Dikirim saat pengguna WA/TG tidak cocok dengan data penyewa mana pun."}</p>
              <textarea id="marketing-content" rows={4} value={botSettings.marketingContent} onChange={e => setBotSettings(s => ({ ...s, marketingContent: e.target.value }))} />
            </div>
            <div className="actions full">
              <button type="button" className="button primary" disabled={botSaving} onClick={saveBotSettings}>{botSaving ? (locale === "en" ? "Saving..." : "Menyimpan...") : <><Check />{locale === "en" ? "Save to Bot" : "Simpan ke Bot"}</>}</button>
              <button type="button" className="button" onClick={loadBotSettings}>{locale === "en" ? "Load from Bot" : "Muat dari Bot"}</button>
            </div>
          </fieldset>
        </div>
      </section>
      <hr /><div className="activity"><span className="activity-icon"><MessageSquareText /></span><span><strong>WhatsApp · {t("Mode simulasi")}</strong><span className="cell-sub">{t("Pesan dicatat tanpa dikirim ke nomor asli")}</span></span><button className="button" onClick={() => notify(locale === "en" ? "WhatsApp test succeeded in simulation mode." : "Tes WhatsApp berhasil dalam mode simulasi.")}>{t("Tes")}</button></div><div className="activity"><span className="activity-icon"><CreditCard /></span><span><strong>Payment gateway · {t("Mode simulasi")}</strong><span className="cell-sub">{t("Tautan pembayaran menggunakan data lokal")}</span></span><button className="button" onClick={() => notify(locale === "en" ? "Payment gateway test succeeded." : "Tes payment gateway berhasil.")}>{t("Tes")}</button></div><div className="activity"><span className="activity-icon"><Zap /></span><span><strong>Token PLN · {t("Mode simulasi")}</strong><span className="cell-sub">{t("Integrasi dengan API token")}</span></span><button className="button" onClick={() => notify(locale === "en" ? "Token integration test succeeded." : "Tes integrasi token berhasil.")}>{t("Tes")}</button></div></div>}
    {tab === "Pengguna" && <MembersPanel notify={notify} />}
    {tab === "Peran" && <RolesPanel notify={notify} />}
    {configTab && <div className="actions" style={{ marginTop: 20 }}><button className="button primary" onClick={() => notify(message(locale, "settings", { section: t(tab) }))}>{t("Simpan perubahan")}</button></div>}
  </div></section></>;
}
