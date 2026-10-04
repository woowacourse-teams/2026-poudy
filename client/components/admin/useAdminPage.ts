"use client";

import type { PaginationResponse } from "@poudy/api/api.zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { isAdminSignedOut } from "@/lib/api/admin";

type Page<T> = {
  readonly items: readonly T[];
  readonly pagination: PaginationResponse;
};

export type AdminPage<T> = {
  readonly data: Page<T> | null;
  readonly failed: boolean;
  readonly page: number;
  readonly setPage: (page: number) => void;
  readonly reload: () => void;
  readonly handleFailure: (error: unknown) => void;
};

export function useAdminPage<T>(load: (page: number) => Promise<Page<T>>): AdminPage<T> {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<T> | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);

  const handleFailure = useCallback(
    (error: unknown) => {
      if (isAdminSignedOut(error)) {
        router.replace("/admin/login");
        return;
      }
      setFailed(true);
    },
    [router],
  );

  useEffect(() => {
    load(page).then(setData).catch(handleFailure);
  }, [load, page, version, handleFailure]);

  const movePage = useCallback((next: number) => {
    setFailed(false);
    setPage(next);
  }, []);

  const reload = useCallback(() => {
    setFailed(false);
    setVersion((current) => current + 1);
  }, []);

  return { data, failed, page, setPage: movePage, reload, handleFailure };
}
