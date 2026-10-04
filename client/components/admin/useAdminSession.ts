"use client";

import { useEffect, useState } from "react";

import { findAdminSession, isAdminSignedOut } from "@/lib/api/admin";

export type AdminSession = "checking" | "signedIn" | "signedOut" | "unknown";

export function useAdminSession(): AdminSession {
  const [session, setSession] = useState<AdminSession>("checking");

  useEffect(() => {
    let cancelled = false;

    findAdminSession()
      .then(() => {
        if (!cancelled) setSession("signedIn");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isAdminSignedOut(error)) {
          setSession("signedOut");
          return;
        }
        setSession("unknown");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return session;
}
