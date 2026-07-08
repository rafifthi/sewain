"use client";

import { useState } from "react";
import { Bold, Check, ChevronLeft, Italic, List, MessageSquareText, Pencil, Plus, ShieldCheck, Tag, Trash2, X } from "lucide-react";
import { useI18n } from "@/components/context";
import { findEvent, eventLabel, eventTiming, eventDescription, renderPreview, ORG_CONSTANTS, slugifyToken, variableLabel, type MessageTemplate, type MessageEvent, type TemplateOption, type VariableDef } from "@/lib/message-templates";
import { PageHead } from "./shared";

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*[^*\n]+\*|_[^_\n]+_|\{\{\s*[a-z0-9_]+\s*\}\})/gi;
  let last = 0;
  let index = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("*")) nodes.push(<strong key={`${keyPrefix}-${index}`}>{token.slice(1, -1)}</strong>);
    else if (token.startsWith("_")) nodes.push(<em key={`${keyPrefix}-${index}`}>{token.slice(1, -1)}</em>);
    else nodes.push(<span className="wa-token" key={`${keyPrefix}-${index}`}>{token}</span>);
    last = match.index + token.length;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function MessageBubbleText({ text }: { text: string }) {
  return <>{text.split("\n").map((line, idx) => {
    if (line.trim() === "") return <span className="wa-line-gap" key={idx} />;
    if (line.startsWith("- ")) return <span className="wa-list-item" key={idx}>{renderInline(line.slice(2), `l${idx}`)}</span>;
    return <span className="wa-line" key={idx}>{renderInline(line, `p${idx}`)}</span>;
  })}</>;
}

function bodySnippet(body: string) {
  const firstLine = body.split("\n").find(line => line.trim() !== "") || "";
  const plain = firstLine.replace(/[*_]/g, "").replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_m, token: string) => `[${token}]`);
  return plain.length > 90 ? `${plain.slice(0, 90)}…` : plain;
}

function MessageTemplateEditor({ template, event, onBack, onSave, onDelete }: { template: MessageTemplate; event?: MessageEvent; onBack: () => void; onSave: (template: MessageTemplate) => void; onDelete?: () => void }) {
  const { locale } = useI18n();
  const L = (id: string, en: string) => (locale === "en" ? en : id);
  const isCustom = !template.eventId;
  const [active, setActive] = useState(template.active);
  const [name, setName] = useState(template.custom?.name || "");
  const [body, setBody] = useState(template.body);
  const [customValues, setCustomValues] = useState<VariableDef[]>(template.custom?.values || []);
  const [valLabel, setValLabel] = useState("");
  const [valSample, setValSample] = useState("");
  const [interactive, setInteractive] = useState(Boolean(template.interactive));
  const [question, setQuestion] = useState(template.interactive?.question || "");
  const [options, setOptions] = useState<TemplateOption[]>(template.interactive?.options || []);
  const [branches, setBranches] = useState<Record<string, string>>(template.interactive?.branches || {});
  const [optionInput, setOptionInput] = useState("");
  const [showVars, setShowVars] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const availableVars: VariableDef[] = isCustom ? customValues : (event?.variables ?? []);
  const values: Record<string, string> = {};
  for (const constant of ORG_CONSTANTS) values[constant.token] = constant.example;
  for (const variable of availableVars) values[variable.token] = variable.example || `[${variable.token}]`;

  const insertAtCursor = (snippet: string) => {
    const area = document.getElementById("template-body") as HTMLTextAreaElement | null;
    if (!area) { setBody(current => current + snippet); return; }
    const start = area.selectionStart;
    const end = area.selectionEnd;
    setBody(current => `${current.slice(0, start)}${snippet}${current.slice(end)}`);
    requestAnimationFrame(() => { area.focus(); const caret = start + snippet.length; area.setSelectionRange(caret, caret); });
  };
  const wrapSelection = (before: string, after = before) => {
    const area = document.getElementById("template-body") as HTMLTextAreaElement | null;
    if (!area) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = body.slice(start, end) || (locale === "en" ? "text" : "teks");
    setBody(`${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`);
    requestAnimationFrame(() => area.focus());
  };
  const insertVariable = (token: string) => { insertAtCursor(`{{${token}}}`); setShowVars(false); };

  const addOption = (raw = optionInput) => {
    const label = raw.trim();
    if (!label || options.some(option => option.label === label)) { setOptionInput(""); return; }
    setOptions(current => [...current, { label, reply: label }]);
    setBranches(current => ({ ...current, [label]: current[label] || "" }));
    setOptionInput("");
  };
  const removeOption = (label: string) => {
    setOptions(current => current.filter(option => option.label !== label));
    setBranches(current => { const next = { ...current }; delete next[label]; return next; });
    if (preview === label) setPreview(null);
  };
  const setBranch = (label: string, text: string) => setBranches(current => ({ ...current, [label]: text }));

  const addValue = () => {
    const label = valLabel.trim();
    const token = slugifyToken(label);
    if (!token || customValues.some(value => value.token === token) || ORG_CONSTANTS.some(constant => constant.token === token)) { setValLabel(""); setValSample(""); return; }
    setCustomValues(current => [...current, { token, label, labelEn: label, example: valSample.trim() || label }]);
    setValLabel("");
    setValSample("");
  };
  const removeValue = (token: string) => setCustomValues(current => current.filter(value => value.token !== token));

  const save = () => onSave({
    ...template,
    active,
    body,
    custom: isCustom ? { name: name.trim() || L("Template tanpa nama", "Untitled template"), values: customValues } : undefined,
    interactive: interactive && options.length > 0 ? { question, options, branches } : undefined,
  });


  return <div className="template-editor">
    <button type="button" className="button template-back" onClick={onBack}><ChevronLeft />{L("Kembali ke daftar", "Back to list")}</button>
    <div className="template-editor-head">
      <div>
        <span className="eyebrow">{isCustom ? L("Template kustom", "Custom template") : L("Template pesan", "Message template")} · WhatsApp</span>
        <h1>{isCustom ? (name.trim() || L("Template tanpa nama", "Untitled template")) : eventLabel(event!, locale)}</h1>
        <p>{isCustom ? L("Dikirim manual ke penyewa. Anda menentukan nilainya sendiri.", "Sent manually to tenants. You define its values yourself.") : `${eventDescription(event!, locale)} · ${eventTiming(event!, locale)}`}</p>
      </div>
      <div className="template-editor-head-actions">
        {onDelete && <button type="button" className="button template-delete" onClick={onDelete}><Trash2 />{L("Hapus", "Delete")}</button>}
        <label className="switch-inline"><span>{active ? L("Aktif", "Active") : L("Nonaktif", "Inactive")}</span><span className="switch"><input type="checkbox" checked={active} onChange={() => setActive(value => !value)} /><span className="switch-track"><span className="switch-thumb" /></span></span></label>
        <button type="button" className="button" onClick={onBack}>{L("Batal", "Cancel")}</button>
        <button type="button" className="button primary" onClick={save}>{L("Simpan", "Save")}</button>
      </div>
    </div>

    <div className="template-editor-layout">
      <div className="template-editor-form">
        {isCustom
          ? <div className="template-locked-note"><Tag /><span>{L("Template kustom dikirim manual. Tambahkan nilai khusus di bawah untuk dipakai dalam pesan.", "Custom templates are sent manually. Add custom values below to use them in the message.")}</span></div>
          : <div className="template-locked-note"><ShieldCheck /><span>{L("Logika & pemicu dikelola sistem. Anda hanya mengubah isi pesan & status aktif.", "The trigger and logic are managed by the system. You only change the message body and active status.")}</span></div>}

        {isCustom && <section className="form-section">
          <div className="form-section-head"><strong>{L("Detail template", "Template details")}</strong></div>
          <div className="form-field full"><label htmlFor="template-name">{L("Nama template", "Template name")}</label><input id="template-name" value={name} onChange={field => setName(field.target.value)} placeholder={L("Mis. Promo akhir tahun", "e.g. Year-end promo")} /></div>
        </section>}

        <section className="form-section">
          <div className="form-section-head"><strong>{L("Isi pesan", "Message body")}</strong></div>
          <div className="rich-editor">
            <div className="rich-toolbar" aria-label={L("Format teks", "Text formatting")}>
              <button type="button" onClick={() => wrapSelection("*")} aria-label="Bold"><Bold /></button>
              <button type="button" onClick={() => wrapSelection("_")} aria-label="Italic"><Italic /></button>
              <button type="button" onClick={() => wrapSelection("\n- ", "")} aria-label="List"><List /></button>
              <div className="variable-picker">
                <button type="button" className="variable-picker-trigger" onClick={() => setShowVars(value => !value)} aria-expanded={showVars}><Tag />{L("Sisipkan variabel", "Insert variable")}</button>
                {showVars && <div className="variable-menu" role="menu">
                  <div className="variable-menu-group">{isCustom ? L("Nilai template", "Template values") : L("Variabel peristiwa", "Event variables")}</div>
                  {availableVars.length > 0 ? availableVars.map(variable => <button type="button" key={variable.token} role="menuitem" onClick={() => insertVariable(variable.token)}><code>{`{{${variable.token}}}`}</code><span>{variableLabel(variable, locale)}</span></button>) : <div className="variable-menu-empty">{L("Belum ada nilai.", "No values yet.")}</div>}
                  <div className="variable-menu-group">{L("Konstanta organisasi", "Organization constants")}</div>
                  {ORG_CONSTANTS.map(variable => <button type="button" key={variable.token} role="menuitem" onClick={() => insertVariable(variable.token)}><code>{`{{${variable.token}}}`}</code><span>{variableLabel(variable, locale)}</span></button>)}
                </div>}
              </div>
            </div>
            <textarea id="template-body" rows={8} value={body} onChange={field => setBody(field.target.value)} placeholder={L("Tulis pesan WhatsApp…", "Write the WhatsApp message…")} />
          </div>
          <div className="variable-hints">{availableVars.slice(0, 6).map(variable => <button type="button" key={variable.token} onClick={() => insertVariable(variable.token)}>+ {variableLabel(variable, locale)}</button>)}</div>
        </section>

        {isCustom && <section className="form-section">
          <div className="form-section-head"><strong>{L("Nilai kustom", "Custom values")}</strong></div>
          <p className="field-help">{L("Tentukan nilai yang bisa Anda sisipkan ke pesan sebagai variabel. Anda mengisi nilainya saat mengirim.", "Define values you can insert into the message as variables. You fill them in when sending.")}</p>
          <div className="custom-value-list">
            {customValues.map(value => <div className="custom-value-row" key={value.token}>
              <code>{`{{${value.token}}}`}</code>
              <span className="custom-value-meta"><strong>{value.label}</strong><small>{value.example}</small></span>
              <button type="button" className="icon-button" aria-label={`${L("Hapus", "Remove")} ${value.label}`} onClick={() => removeValue(value.token)}><X /></button>
            </div>)}
            {customValues.length === 0 && <p className="inline-empty">{L("Belum ada nilai kustom.", "No custom values yet.")}</p>}
          </div>
          <div className="custom-value-add">
            <input value={valLabel} onChange={field => setValLabel(field.target.value)} onKeyDown={field => { if (field.key === "Enter") { field.preventDefault(); addValue(); } }} placeholder={L("Nama nilai (mis. Nama promo)", "Value name (e.g. Promo name)")} />
            <input value={valSample} onChange={field => setValSample(field.target.value)} onKeyDown={field => { if (field.key === "Enter") { field.preventDefault(); addValue(); } }} placeholder={L("Contoh nilai (mis. Diskon 20%)", "Sample value (e.g. 20% off)")} />
            <button type="button" className="button" onClick={addValue}><Plus />{L("Tambah", "Add")}</button>
          </div>
        </section>}

        <section className="form-section">
          <div className="form-section-head">
            <strong>{L("Balasan interaktif", "Interactive reply")}</strong>
            <label className="switch-inline"><span>{interactive ? L("Aktif", "On") : L("Nonaktif", "Off")}</span><span className="switch"><input type="checkbox" checked={interactive} onChange={() => setInteractive(value => !value)} /><span className="switch-track"><span className="switch-thumb" /></span></span></label>
          </div>
          {interactive ? <div className="interactive-builder">
            <div className="form-field full"><label htmlFor="template-question">{L("Pertanyaan", "Question")}</label><input id="template-question" value={question} onChange={field => setQuestion(field.target.value)} placeholder={L("Mis. Apakah unit bisa diakses?", "e.g. Is the unit accessible?")} /></div>
            <div className="form-field full"><label htmlFor="template-option">{L("Pilihan tombol", "Reply buttons")}</label>
              <div className="tag-input">{options.map(option => <span className="property-tag" key={option.label}>{option.label}<button type="button" aria-label={`${L("Hapus", "Remove")} ${option.label}`} onClick={() => removeOption(option.label)}><X /></button></span>)}
                <input id="template-option" value={optionInput} onChange={field => setOptionInput(field.target.value)} onKeyDown={field => { if (field.key === "Enter" || field.key === ",") { field.preventDefault(); addOption(); } }} onBlur={() => addOption()} placeholder={L("Ketik pilihan, tekan Enter", "Type an option, press Enter")} />
              </div>
            </div>
            <div className="branch-list">{options.map(option => <div className="branch-item" key={option.label}>
              <label htmlFor={`branch-${option.label}`}>{L("Jika penyewa memilih", "If the tenant selects")} <strong>{`"${option.label}"`}</strong> {L("→ kirim", "→ send")}</label>
              <textarea id={`branch-${option.label}`} rows={3} value={branches[option.label] || ""} onChange={field => setBranch(option.label, field.target.value)} placeholder={L("Pesan balasan untuk pilihan ini…", "Reply message for this option…")} />
            </div>)}{options.length === 0 && <p className="inline-empty">{L("Tambahkan pilihan tombol untuk membuat cabang pesan.", "Add reply buttons to create message branches.")}</p>}</div>
          </div> : <p className="inline-empty">{L("Aktifkan untuk menambahkan tombol pilihan & percabangan pesan (if/else).", "Turn on to add reply buttons and message branching (if/else).")}</p>}
        </section>
      </div>

      <aside className="template-preview-column">
        <div className="template-preview-label">{L("Pratinjau WhatsApp", "WhatsApp preview")}</div>
        <div className="wa-preview">
          <div className="wa-header"><span className="wa-avatar">{values.org_name?.split(" ").map(part => part[0]).slice(0, 2).join("") || "PT"}</span><div className="wa-header-copy"><strong>{values.org_name || "Sewain"}</strong><small>{L("daring", "online")}</small></div></div>
          <div className="wa-thread">
            <div className="wa-bubble in"><MessageBubbleText text={renderPreview(body, values)} /><span className="wa-meta">09.00</span></div>
            {interactive && options.length > 0 && !preview && <div className="wa-quick-replies">{options.map(option => <button type="button" key={option.label} className="wa-quick-reply" onClick={() => setPreview(option.label)}>{option.label}</button>)}</div>}
            {preview && <>
              <div className="wa-bubble out">{options.find(option => option.label === preview)?.reply || preview}<span className="wa-meta">09.01 <Check /></span></div>
              {branches[preview] ? <div className="wa-bubble in"><MessageBubbleText text={renderPreview(branches[preview], values)} /><span className="wa-meta">09.01</span></div> : <div className="wa-bubble in wa-bubble-empty">{L("Belum ada pesan balasan untuk pilihan ini.", "No reply message for this option yet.")}<span className="wa-meta">09.01</span></div>}
              <button type="button" className="wa-reset" onClick={() => setPreview(null)}>{L("Ulangi pratinjau", "Reset preview")}</button>
            </>}
          </div>
        </div>
      </aside>
    </div>
  </div>;
}

export function MessageTemplatesPage({ templates, setTemplates, notify }: { templates: MessageTemplate[]; setTemplates: (value: MessageTemplate[]) => void; notify: (value: string) => void }) {
  const { locale } = useI18n();
  const L = (id: string, en: string) => (locale === "en" ? en : id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MessageTemplate | null>(null);
  const editing = draft ?? templates.find(template => template.id === editingId);

  const closeEditor = () => { setDraft(null); setEditingId(null); };

  if (editing) {
    const event = editing.eventId ? findEvent(editing.eventId) : undefined;
    const isCustom = !editing.eventId;
    return <MessageTemplateEditor template={editing} event={event} onBack={closeEditor} onSave={updated => {
      setTemplates(templates.some(template => template.id === updated.id) ? templates.map(template => template.id === updated.id ? updated : template) : [updated, ...templates]);
      closeEditor();
      notify(L("Template pesan disimpan.", "Message template saved."));
    }} onDelete={isCustom ? () => {
      setTemplates(templates.filter(template => template.id !== editing.id));
      closeEditor();
      notify(L("Template dihapus.", "Template deleted."));
    } : undefined} />;
  }

  const toggleActive = (id: string) => {
    let next = false;
    setTemplates(templates.map(template => {
      if (template.id !== id) return template;
      next = !template.active;
      return { ...template, active: next };
    }));
    notify(next ? L("Template diaktifkan.", "Template activated.") : L("Template dinonaktifkan.", "Template deactivated."));
  };

  const createCustom = () => setDraft({ id: `custom-${Date.now()}`, active: true, body: "", custom: { name: "", values: [] } });

  return <>
    <PageHead page="messages" action={createCustom} />
    <section className="panel template-intro">
      <span className="template-intro-icon"><MessageSquareText /></span>
      <div>
        <strong>{L("Pesan otomatis berdasarkan peristiwa", "Event-driven automated messages")}</strong>
        <p>{L("Template sistem terikat ke peristiwa yang membawa datanya sendiri (penyewa, jatuh tempo, tautan pembayaran). Untuk kebutuhan lain, buat template kustom dengan nilai Anda sendiri.", "System templates are bound to events that carry their own data (tenant, due date, payment link). For anything else, create a custom template with your own values.")}</p>
      </div>
    </section>
    <section className="panel template-list-panel">
      <div className="template-list">
        {templates.map(template => {
          const event = template.eventId ? findEvent(template.eventId) : undefined;
          if (template.eventId && !event) return null;
          const title = event ? eventLabel(event, locale) : (template.custom?.name || L("Template tanpa nama", "Untitled template"));
          const timing = event ? eventTiming(event, locale) : L("Manual", "Manual");
          return <article className={`template-row ${template.active ? "" : "is-inactive"}`} key={template.id}>
            <button type="button" className="template-row-main" onClick={() => setEditingId(template.id)}>
              <span className="template-row-icon"><MessageSquareText /></span>
              <span className="template-row-copy">
                <span className="template-row-title"><strong>{title}</strong>{!event && <span className="template-badge template-badge-custom">{L("Kustom", "Custom")}</span>}{template.interactive && <span className="template-badge">{L("Interaktif", "Interactive")}</span>}</span>
                <small>{timing} · WhatsApp</small>
                <span className="template-row-snippet">{bodySnippet(template.body)}</span>
              </span>
            </button>
            <div className="template-row-actions">
              <label className="switch" title={L("Aktif", "Active")}>
                <input type="checkbox" checked={template.active} onChange={() => toggleActive(template.id)} aria-label={`${title} — ${L("Aktif", "Active")}`} />
                <span className="switch-track"><span className="switch-thumb" /></span>
              </label>
              <button type="button" className="button template-edit-button" onClick={() => setEditingId(template.id)}><Pencil />{L("Ubah", "Edit")}</button>
            </div>
          </article>;
        })}
      </div>
    </section>
  </>;
}
