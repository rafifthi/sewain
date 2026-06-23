"use client";

import { createContext, useContext } from "react";
import { TokenConfig, defaultTokenConfig } from "@/lib/utility-token-config";
import { Row } from "@/lib/data";

type TokenCtx = { config: TokenConfig; setConfig: (c: TokenConfig) => void; properties: Row[] };
const TokenConfigContext = createContext<TokenCtx>({ config: defaultTokenConfig, setConfig: () => {}, properties: [] });
const useTokenConfig = () => useContext(TokenConfigContext);

export { TokenConfigContext, useTokenConfig };
export type { TokenCtx };
