"use client";

import { useCallback, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { GlobalFilterContext, type GlobalFilter, type GlobalFilterContextValue } from "./GlobalFilterContext";

interface Props {
  children: React.ReactNode;
}

export function GlobalFilterProvider({ children }: Props) {
  const pathname = usePathname();

  const [labels, setLabels] = useState<{ division?: string; community?: string; plan?: string }>({});

  // Read filter from URL on client only (avoids SSR suspense freeze)
  const [filter, setFilter] = useState<GlobalFilter>({
    divisionId: null,
    communityId: null,
    planModelId: null,
  });

  // Sync filter state from URL on mount and navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilter({
      divisionId: params.get("div"),
      communityId: params.get("comm"),
      planModelId: params.get("plan"),
    });
  }, [pathname]);

  const updateUrl = useCallback(
    (updates: Partial<Record<"div" | "comm" | "plan", string | null>>) => {
      const params = new URLSearchParams(window.location.search);
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === "") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      const query = params.toString();
      const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
      window.history.replaceState(null, "", newUrl);
      setFilter({
        divisionId: params.get("div"),
        communityId: params.get("comm"),
        planModelId: params.get("plan"),
      });
    },
    []
  );

  const setDivision = useCallback(
    (id: string | null) => {
      updateUrl({ div: id, comm: null, plan: null });
      setLabels((prev) => ({ ...prev, community: undefined, plan: undefined }));
    },
    [updateUrl]
  );

  const setCommunity = useCallback(
    (id: string | null) => {
      updateUrl({ comm: id, plan: null });
      setLabels((prev) => ({ ...prev, plan: undefined }));
    },
    [updateUrl]
  );

  const setPlan = useCallback(
    (id: string | null) => {
      updateUrl({ plan: id });
    },
    [updateUrl]
  );

  const clearFilter = useCallback(() => {
    updateUrl({ div: null, comm: null, plan: null });
    setLabels({});
  }, [updateUrl]);

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
