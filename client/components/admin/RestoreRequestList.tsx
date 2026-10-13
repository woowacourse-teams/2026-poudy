"use client";

import { useState } from "react";

import { AdminListState } from "./AdminListState";
import { AdminPagination } from "./AdminPagination";
import { AdminTable, CELL_CLASS } from "./AdminTable";
import { formatDateTime } from "./labels";
import { useAdminPage } from "./useAdminPage";

import { findRestoreRequests, restoreMember } from "@/lib/api/admin";
import { providerName } from "@/lib/domain/social-provider";

const COLUMNS = ["이메일", "로그인 방식", "탈퇴 시각", "요청 시각", ""];

export function RestoreRequestList() {
  const { data, failed, setPage, reload, handleFailure } = useAdminPage(findRestoreRequests);
  const [restoring, setRestoring] = useState<number | null>(null);

  const restore = (memberId: number, email: string) => {
    if (!window.confirm(`${email} 계정을 복구할까요? 복구하면 다시 로그인할 수 있어요.`)) return;

    setRestoring(memberId);
    restoreMember(memberId)
      .then(reload)
      .catch(handleFailure)
      .finally(() => setRestoring(null));
  };

  return (
    <section aria-label="계정 복구 요청" className="flex flex-1 flex-col">
      <div className="flex-1">
        <AdminListState
          failed={failed}
          loading={!data}
          empty={data?.items.length === 0}
          emptyMessage="계정 복구 요청이 없어요."
        />
        {data && data.items.length > 0 && (
          <AdminTable label="계정 복구 요청 목록" columns={COLUMNS}>
            {data.items.map((request) => (
              <tr key={request.memberId}>
                <td className={`${CELL_CLASS} font-bold break-all`}>{request.email}</td>
                <td className={`${CELL_CLASS} whitespace-nowrap`}>{providerName(request.provider)}</td>
                <td className={`${CELL_CLASS} whitespace-nowrap text-text-secondary`}>
                  {formatDateTime(request.withdrawnAt)}
                </td>
                <td className={`${CELL_CLASS} whitespace-nowrap text-text-secondary`}>
                  {formatDateTime(request.requestedAt)}
                </td>
                <td className={`${CELL_CLASS} text-right`}>
                  <button
                    type="button"
                    disabled={restoring === request.memberId}
                    onClick={() => restore(request.memberId, request.email)}
                    className="h-9 rounded-button bg-action px-4 text-[14px] font-bold whitespace-nowrap text-action-text disabled:opacity-40"
                  >
                    복구하기
                  </button>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>
      {data && <AdminPagination pagination={data.pagination} onChange={setPage} />}
    </section>
  );
}
