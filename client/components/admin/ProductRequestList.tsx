"use client";

import { useState } from "react";

import { AdminListState } from "./AdminListState";
import { AdminPagination } from "./AdminPagination";
import { AdminTable, CELL_CLASS } from "./AdminTable";
import { formatDateTime } from "./labels";
import { RequestStatusSelect } from "./RequestStatusSelect";
import { useAdminPage } from "./useAdminPage";

import { type AdminRequestStatus, changeProductRequestStatus, findProductRequests } from "@/lib/api/admin";

const COLUMNS = ["요청 시각", "제품명", "브랜드", "처리 상태"];

export function ProductRequestList() {
  const { data, failed, setPage, reload, handleFailure } = useAdminPage(findProductRequests);
  const [changing, setChanging] = useState<string | null>(null);

  const change = (requestId: string, status: AdminRequestStatus) => {
    setChanging(requestId);
    changeProductRequestStatus(requestId, status)
      .then(reload)
      .catch(handleFailure)
      .finally(() => setChanging(null));
  };

  return (
    <section aria-label="제품 등록 요청" className="flex flex-1 flex-col">
      <div className="flex-1">
        <AdminListState
          failed={failed}
          loading={!data}
          empty={data?.items.length === 0}
          emptyMessage="받은 제품 등록 요청이 없어요."
        />
        {data && data.items.length > 0 && (
          <AdminTable label="제품 등록 요청 목록" columns={COLUMNS}>
            {data.items.map((request) => (
              <tr key={request.requestId}>
                <td className={`${CELL_CLASS} whitespace-nowrap text-text-secondary`}>
                  {formatDateTime(request.requestedAt)}
                </td>
                <td className={`${CELL_CLASS} font-bold`}>{request.productName}</td>
                <td className={CELL_CLASS}>{request.brandName}</td>
                <td className={CELL_CLASS}>
                  <RequestStatusSelect
                    value={request.status}
                    disabled={changing === request.requestId}
                    onChange={(status) => change(request.requestId, status)}
                  />
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
