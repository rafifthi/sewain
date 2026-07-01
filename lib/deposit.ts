import { rupiah } from "@/components/sewain-app";

export type DepositStatus = "active" | "partially_returned" | "fully_returned" | "deducted";

export type DeductionEntry = {
  amount: number;
  reason: string;
  date: string;
};

const DEPOSIT_KEY = "sewain:deposit-status";

export function getDepositStatus(contractId: string): DepositStatus {
  const map = readAll();
  return map[contractId]?.status || "active";
}

export function setDepositStatus(contractId: string, status: DepositStatus, amount?: number) {
  const map = readAll();
  map[contractId] = { ...map[contractId], status, contractId, ...(amount !== undefined ? { amount } : {}) };
  saveAll(map);
}

export function getDeductions(contractId: string): DeductionEntry[] {
  const map = readAll();
  return map[contractId]?.deductions || [];
}

export function addDeduction(contractId: string, deduction: DeductionEntry) {
  const map = readAll();
  const existing = map[contractId];
  const current = existing || { contractId, status: "active" as DepositStatus, deductions: [] };
  current.deductions = [...(current.deductions || []), deduction];
  if (current.status === "active") current.status = "partially_returned";
  map[contractId] = current;
  saveAll(map);
}

export function removeDeduction(contractId: string, index: number) {
  const map = readAll();
  const entry = map[contractId];
  if (!entry) return;
  entry.deductions = entry.deductions.filter((_, i) => i !== index);
  if (entry.deductions.length === 0 && entry.status === "partially_returned") {
    entry.status = "active";
  }
  map[contractId] = entry;
  saveAll(map);
}

export function getDepositMetrics(): { held: number; returnedThisMonth: number; deducted: number } {
  const map = readAll();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let held = 0;
  let returnedThisMonth = 0;
  let deducted = 0;

  for (const entry of Object.values(map)) {
    // Sum up deposit amounts for active/partial statuses
    if ((entry.status === "active" || entry.status === "partially_returned") && entry.amount) {
      held += entry.amount;
    }
    for (const d of entry.deductions || []) {
      deducted += d.amount;
      const dMonth = d.date.slice(0, 7);
      if (dMonth === thisMonth) returnedThisMonth += d.amount;
    }
  }

  return { held, returnedThisMonth, deducted };
}

export function formatDepositStatus(status: DepositStatus): string {
  const labels: Record<DepositStatus, string> = {
    active: "Aktif",
    partially_returned: "Sebagian Dikembalikan",
    fully_returned: "Sudah Dikembalikan",
    deducted: "Dipotong Semua",
  };
  return labels[status];
}

type DepositStore = Record<string, { contractId: string; status: DepositStatus; amount?: number; deductions: DeductionEntry[] }>;

function readAll(): DepositStore {
  try {
    return JSON.parse(localStorage.getItem(DEPOSIT_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAll(map: DepositStore) {
  localStorage.setItem(DEPOSIT_KEY, JSON.stringify(map));
}
