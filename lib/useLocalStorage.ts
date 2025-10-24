"use client";

import { useEffect, useState } from "react";
import { z } from "zod";

export function useLocalStorageState<T>(key: string, schema: z.ZodType<T>, initial: T) {
  const [state, setState] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        const safe = schema.safeParse(parsed);
        if (safe.success) {
          setState(safe.data);
        } else {
          setState(initial);
        }
      } else {
        setState(initial);
      }
    } catch {
      setState(initial);
    } finally {
      setLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [key, loaded, state]);

  return [state, setState, loaded] as const;
}

