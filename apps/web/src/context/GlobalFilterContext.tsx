"use client";

import { createContext, useContext } from "react";

export interface GlobalFilter {
  divisionId: string | null;
  communityId: string | null;
  userId: string | null;
}

export interface GlobalFilterContextValue {
  filter: GlobalFilter;
  setDivision: (id: string | null) => void;
  setCommunity: (id: string | null) => void;
  setUser: (id: string | null) => void;
  clearFilter: () => void;
  labels: { division?: string; community?: string; user?: string };
  setLabels: (labels: { division?: string; community?: string; user?: string }) => void;
}

export const GlobalFilterContext = createContext<GlobalFilterContextValue | null>(null);

export function useGlobalFilter() {
  const ctx = useContext(GlobalFilterContext);
  if (!ctx) throw new Error("useGlobalFilter must be used within GlobalFilterProvider");
  return ctx;
}
