"use client";

import { useCallback, useState } from "react";
import { GlobalFilterContext, type GlobalFilter, type GlobalFilterContextValue } from "./GlobalFilterContext";

interface Props {
  children: React.ReactNode;
}

export function GlobalFilterProvider({ children }: Props) {
  const [labels, setLabels] = useState<{ division?: string; community?: string; plan?: string }>({});

  const [filter, setFilter] = useState<GlobalFilter>({
    divisionId: null,
    communityId: null,
    planModelId: null,
  });

  const setDivision = useCallback((id: string | null) => {
    setFilter({ divisionId: id, communityId: null, planModelId: null });
    setLabels((prev) => ({ ...prev, community: undefined, plan: undefined }));
  }, []);

  const setCommunity = useCallback((id: string | null) => {
    setFilter((prev) => ({ ...prev, communityId: id, planModelId: null }));
    setLabels((prev) => ({ ...prev, plan: undefined }));
  }, []);

  const setPlan = useCallback((id: string | null) => {
    setFilter((prev) => ({ ...prev, planModelId: id }));
  }, []);

  const clearFilter = useCallback(() => {
    setFilter({ divisionId: null, communityId: null, planModelId: null });
    setLabels({});
  }, []);

  const value: GlobalFilterContextValue = {
    filter,
    setDivision,
    setCommunity,
    setPlan,
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
