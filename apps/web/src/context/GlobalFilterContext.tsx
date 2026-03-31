"use client";

import { createContext, useContext } from "react";

export interface GlobalFilter {
  divisionId: string | null;
  communityId: string | null;
  planModelId: string | null;
}

export interface GlobalFilterContextValue {
  filter: GlobalFilter;
  setDivision: (id: string | null) => void;
  setCommunity: (id: string | null) => void;
  setPlan: (id: string | null) => void;
  clearFilter: () => void;
  labels: { division?: string; community?: string; plan?: string };
  setLabels: (labels: { division?: string; community?: string; plan?: string }) => void;
}

export const GlobalFilterContext = createContext<GlobalFilterContextValue | null>(null);

export function useGlobalFilter() {
  const ctx = useContext(GlobalFilterContext);
  if (!ctx) throw new Error("useGlobalFilter must be used within GlobalFilterProvider");
  return ctx;
}
