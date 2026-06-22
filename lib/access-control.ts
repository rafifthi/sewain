// Role & permission model for the Settings access-control module.
// Frontend-first prototype: seeds below are persisted to localStorage by the app.

export type PermissionAction = "view" | "create" | "edit" | "delete";
export const PERMISSION_ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete"];

// Access-controlled modules. Ids mirror the app's PageId values (minus dashboard,
// which is always viewable). Labels reuse the existing nav / pageMeta wording.
export type ModuleId =
  | "properties" | "tenants" | "reservations" | "invoices" | "tokens"
  | "contracts" | "messages" | "tickets" | "documents" | "settings";

export const PERMISSION_MODULES: { id: ModuleId; label: string }[] = [
  { id: "properties", label: "Properti" },
  { id: "tenants", label: "Penyewa" },
  { id: "reservations", label: "Reservasi" },
  { id: "invoices", label: "Tagihan" },
  { id: "tokens", label: "Token PLN" },
  { id: "contracts", label: "Kontrak" },
  { id: "messages", label: "Template Pesan" },
  { id: "tickets", label: "Pemeliharaan" },
  { id: "documents", label: "Dokumen" },
  { id: "settings", label: "Pengaturan" },
];

export type ActionFlags = Record<PermissionAction, boolean>;
export type RolePermissions = Record<ModuleId, ActionFlags>;
export type Role = { id: string; name: string; description: string; system: boolean; permissions: RolePermissions };

export type MemberStatus = "active" | "invited" | "inactive";
export type Member = { id: string; name: string; email: string; roleId: string; status: MemberStatus };

const flags = (view = false, create = false, edit = false, del = false): ActionFlags => ({ view, create, edit, delete: del });

// Build a permission set; `fn` returns the flags for each module (defaults to all-false).
function makePermissions(fn?: (module: ModuleId) => ActionFlags): RolePermissions {
  const result = {} as RolePermissions;
  for (const { id } of PERMISSION_MODULES) result[id] = fn ? fn(id) : flags();
  return result;
}

export const emptyPermissions = (): RolePermissions => makePermissions();
export const allPermissions = (): RolePermissions => makePermissions(() => flags(true, true, true, true));

export function can(role: Role | undefined, module: ModuleId, action: PermissionAction): boolean {
  return Boolean(role?.permissions?.[module]?.[action]);
}

// Initials for an avatar, e.g. "Andi Triono" -> "AT". Mirrors the inline pattern used in the app.
export const initials = (name: string): string =>
  name.split(" ").map(part => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

const OPERATIONAL: ModuleId[] = ["properties", "tenants", "reservations", "invoices", "tokens", "contracts", "messages", "tickets", "documents"];

export const SEED_ROLES: Role[] = [
  {
    id: "owner",
    name: "Pemilik",
    description: "Akses penuh ke seluruh modul dan pengaturan.",
    system: true,
    permissions: allPermissions(),
  },
  {
    id: "admin",
    name: "Admin",
    description: "Mengelola operasional harian; pengaturan terbatas.",
    system: true,
    permissions: makePermissions(module =>
      module === "settings" ? flags(true, false, true, false) : flags(true, true, true, true)
    ),
  },
  {
    id: "staff",
    name: "Staf",
    description: "Menjalankan tugas operasional tanpa akses pengaturan.",
    system: true,
    permissions: makePermissions(module => {
      if (module === "tickets") return flags(true, true, true, false);
      if (module === "invoices" || module === "reservations") return flags(true, false, true, false);
      if (module === "settings" || module === "documents" || module === "messages") return flags();
      return flags(true); // view-only for the rest
    }),
  },
];

export const SEED_MEMBERS: Member[] = [
  { id: "m-andi", name: "Andi Triono", email: "andi@sewain.id", roleId: "owner", status: "active" },
  { id: "m-rina", name: "Rina Novita", email: "rina@sewain.id", roleId: "admin", status: "active" },
];
