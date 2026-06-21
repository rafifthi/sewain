export type FeeType = "flat" | "percent";

export type PropertyFeeRule = {
  type: FeeType;
  value: number;
};

export type TokenConfig = {
  nominals: number[];
  fee: PropertyFeeRule;
  propertyFees: Record<string, PropertyFeeRule>;
};

export const defaultTokenConfig: TokenConfig = {
  nominals: [20000, 50000, 100000, 200000, 500000],
  fee: { type: "flat", value: 3000 },
  propertyFees: {},
};

export function calcFee(nominal: number, rule: PropertyFeeRule | undefined): number {
  if (!rule) return 0;
  if (rule.type === "percent") return Math.round(nominal * rule.value / 100);
  return rule.value;
}

export function formatRp(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}
