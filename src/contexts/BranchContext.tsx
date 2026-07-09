import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type BranchCode = "rotterdam" | "heerhugowaard";
export type BranchFilter = "all" | BranchCode;

export const BRANCH_LABELS: Record<BranchCode, string> = {
  rotterdam: "Rotterdam",
  heerhugowaard: "Heerhugowaard",
};

export const BRANCH_SHORT: Record<BranchCode, string> = {
  rotterdam: "RTD",
  heerhugowaard: "HHW",
};

// Distinct semantic colors per branch (kept subtle so they don't clash with existing badges)
export const BRANCH_COLOR_CLASSES: Record<BranchCode, string> = {
  rotterdam: "bg-sky-100 text-sky-800 border border-sky-200",
  heerhugowaard: "bg-amber-100 text-amber-800 border border-amber-200",
};

interface BranchContextValue {
  /** Actieve filter-keuze: 'all' | branch */
  branchFilter: BranchFilter;
  setBranchFilter: (b: BranchFilter) => void;
  /** Vestiging van de ingelogde gebruiker (uit profiles.branch) */
  userBranch: BranchCode | null;
  /** Mag deze gebruiker wisselen tussen vestigingen? (admin/owner) */
  canSwitchBranch: boolean;
  /** True zolang userBranch nog geladen wordt */
  isLoading: boolean;
}

const BranchContext = createContext<BranchContextValue | undefined>(undefined);

const STORAGE_KEY = "branchFilter";

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [userBranch, setUserBranch] = useState<BranchCode | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [branchFilter, setBranchFilterState] = useState<BranchFilter>(() => {
    if (typeof window === "undefined") return "all";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "rotterdam" || stored === "heerhugowaard" || stored === "all") return stored;
    return "all";
  });

  // Laad de vestiging van de gebruiker uit profiles
  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user?.id) {
      setUserBranch(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    supabase
      .from("profiles")
      .select("branch")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const b = (data as any)?.branch;
        const normalized: BranchCode = b === "heerhugowaard" ? "heerhugowaard" : "rotterdam";
        setUserBranch(normalized);
        setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  // Voor niet-admin: forceer filter op eigen vestiging
  const canSwitchBranch = isAdmin;

  const effectiveFilter: BranchFilter = useMemo(() => {
    if (!canSwitchBranch && userBranch) return userBranch;
    return branchFilter;
  }, [canSwitchBranch, userBranch, branchFilter]);

  const setBranchFilter = (b: BranchFilter) => {
    if (!canSwitchBranch) return; // niet-admin mag niet wisselen
    setBranchFilterState(b);
    try {
      window.localStorage.setItem(STORAGE_KEY, b);
    } catch {
      /* ignore */
    }
  };

  const value: BranchContextValue = {
    branchFilter: effectiveFilter,
    setBranchFilter,
    userBranch,
    canSwitchBranch,
    isLoading: authLoading || profileLoading,
  };

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
};

export const useCurrentBranch = (): BranchContextValue => {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    // Safe defaults — voorkomt crash als provider (nog) niet gemount is
    return {
      branchFilter: "all",
      setBranchFilter: () => {},
      userBranch: null,
      canSwitchBranch: false,
      isLoading: false,
    };
  }
  return ctx;
};

/**
 * Filter een lijst voertuigen/records op de actieve branch-selectie.
 * Records zonder branch worden alleen getoond in 'all'.
 */
export function filterByBranch<T extends { branch?: string | null }>(
  items: T[],
  branchFilter: BranchFilter,
): T[] {
  if (branchFilter === "all") return items;
  return items.filter((it) => (it.branch ?? "rotterdam") === branchFilter);
}