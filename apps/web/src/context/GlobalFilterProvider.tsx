"use client";

import { useCallback, useState } from "react";
import { GlobalFilterContext, type GlobalFilter, type GlobalFilterContextValue } from "./GlobalFilterContext";

interface Props {
  children: React.ReactNode;
}

export function GlobalFilterProvider({ children }: Props) {
  const [labels, setLabels] = useState<{ division?: string; community?: string; user?: string }>({});

  const [filter, setFilter] = useState<GlobalFilter>({
    divisionId: null,
    communityId: null,
    userId: null,
  });

  const setDivision = useCallback((id: string | null) => {
    setFilter({ divisionId: id, communityId: null, userId: null });
    setLabels((prev) => ({ ...prev, community: undefined, user: undefined }));
  }, []);

  const setCommunity = useCallback((id: string | null) => {
    setFilter((prev) => ({ ...prev, communityId: id, userId: null }));
    setLabels((prev) => ({ ...prev, user: undefined }));
  }, []);

  const setUser = useCallback((id: string | null) => {
    setFilter((prev) => ({ ...prev, userId: id }));
  }, []);

  const clearFilter = useCallback(() => {
    setFilter({ divisionId: null, communityId: null, userId: null });
    setLabels({});
  }, []);

  const value: GlobalFilterContextValue = {
    filter,
    setDivision,
    setCommunity,
    setUser,
    clearFilter,
    labels,
    setLabels,
  };

  return (
    <GlobalFilterContext.Provider value={value}>
      {children}
    </GlobalFilterContext.Provider>
  );
}
