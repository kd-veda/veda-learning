"use client";

import { useCallback, useEffect, useState } from "react";
import { getDataProvider } from "@/lib/data/provider";
import type { Profile } from "@/lib/data/types";

/**
 * Loads (or creates, in guest/local mode) the current student profile.
 * A thin hook rather than a context provider — profile reads are cheap
 * against both providers, and this keeps each page independently testable.
 */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = getDataProvider();
      const p = await provider.getOrCreateGuestProfile();
      setProfile(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!profile) return;
      const provider = getDataProvider();
      const updated = await provider.updateProfile(profile.id, patch);
      setProfile(updated);
    },
    [profile]
  );

  return { profile, loading, error, refresh, updateProfile };
}
