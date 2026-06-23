"use client";

import { createContext, useContext } from "react";
import { Locale } from "@/lib/i18n";

type I18nState = { locale: Locale; setLocale: (locale: Locale) => void; t: (value: string) => string; v: (value: unknown) => string };
const I18nContext = createContext<I18nState>({ locale: "id", setLocale: () => {}, t: value => value, v: value => String(value ?? "") });
const useI18n = () => useContext(I18nContext);

export { I18nContext, useI18n };
export type { I18nState };
