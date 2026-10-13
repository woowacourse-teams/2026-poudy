"use client";

import { useState } from "react";

import { AdminListState } from "./AdminListState";
import { AdminPagination } from "./AdminPagination";
import { AdminTable, CELL_CLASS } from "./AdminTable";
import { FEEDBACK_TYPE_LABELS, formatDateTime } from "./labels";
import { RequestStatusSelect } from "./RequestStatusSelect";
import { useAdminPage } from "./useAdminPage";

import { type AdminRequestStatus, changeFeedbackStatus, findFeedbacks } from "@/lib/api/admin";

const COLUMNS = ["받은 시각", "종류", "내용", "이미지", "처리 상태"];

export function FeedbackList() {
  const { data, failed, setPage, reload, handleFailure } = useAdminPage(findFeedbacks);
  const [changing, setChanging] = useState<string | null>(null);

  const change = (feedbackId: string, status: AdminRequestStatus) => {
    setChanging(feedbackId);
    changeFeedbackStatus(feedbackId, status)
      .then(reload)
      .catch(handleFailure)
      .finally(() => setChanging(null));
  };

  return (
    <section aria-label="피드백" className="flex flex-1 flex-col">
      <div className="flex-1">
        <AdminListState
          failed={failed}
          loading={!data}
          empty={data?.items.length === 0}
          emptyMessage="받은 피드백이 없어요."
        />
        {data && data.items.length > 0 && (
          <AdminTable label="피드백 목록" columns={COLUMNS}>
            {data.items.map((feedback) => (
              <tr key={feedback.feedbackId}>
                <td className={`${CELL_CLASS} whitespace-nowrap text-text-secondary`}>
                  {formatDateTime(feedback.receivedAt)}
                </td>
                <td className={`${CELL_CLASS} whitespace-nowrap`}>{FEEDBACK_TYPE_LABELS[feedback.type]}</td>
                <td className={CELL_CLASS}>
                  {feedback.productName && <p className="font-bold">{feedback.productName}</p>}
                  {feedback.path && <p className="break-all text-text-secondary">{feedback.path}</p>}
                  <p className="mt-1 whitespace-pre-wrap">{feedback.content}</p>
                </td>
                <td className={`${CELL_CLASS} whitespace-nowrap text-text-secondary`}>{feedback.images.length}장</td>
                <td className={CELL_CLASS}>
                  <RequestStatusSelect
                    value={feedback.status}
                    disabled={changing === feedback.feedbackId}
                    onChange={(status) => change(feedback.feedbackId, status)}
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
