"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { GlobalFilterContext, type GlobalFilter, type GlobalFilterContextValue } from "./GlobalFilterContext";

interface Props {
  children: React.ReactNode;
}

export function GlobalFilterProvider({ children }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [labels, setLabels] = useState<{ division?: string; community?: string; plan?: string }>({});

  // Read current filter from URL
  const filter: GlobalFilter = {
    divisionId: searchParams.get("div"),
    communityId: searchParams.get("comm"),
    planModelId: searchParams.get("plan"),
  };

  const updateUrl = useCallback(
    (updates: Partial<Record<"div" | "comm" | "plan", string | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === "") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [router, searchParams, pathname]
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
