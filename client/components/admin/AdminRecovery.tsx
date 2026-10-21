"use client";

import type {
  AdminRecoverySummaryResponse,
  AdminRecoveryPreviewResponse,
  AdminRecoveryAccount,
} from "@poudy/api/api.zod";
import { useCallback, useEffect, useState } from "react";

import { AdminButton, AdminSummary, ADMIN_FIELD } from "./AdminControls";
import { AdminDialog } from "./AdminDialog";
import { AdminListState } from "./AdminListState";
import { AdminPagination } from "./AdminPagination";
import { AdminShell } from "./AdminShell";
import { AdminTable, CELL_CLASS } from "./AdminTable";
import { formatDateTime } from "./labels";
import { useAdminPage } from "./useAdminPage";

import { restoreMember } from "@/lib/api/admin";
import { findRecovery, recoverySummary, recoveryPreview } from "@/lib/api/admin-operations";
import { providerName } from "@/lib/domain/social-provider";

const STATUS: Readonly<Record<string, string>> = {
  AVAILABLE: "복구 가능",
  EXPIRING: "곧 삭제",
  EXPIRED: "기한 경과",
  RESTORED: "복구됨",
};
export function AdminRecovery() {
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");
  const [summary, setSummary] = useState<AdminRecoverySummaryResponse | null>(null);
  const [preview, setPreview] = useState<AdminRecoveryPreviewResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    (page: number) =>
      findRecovery(
        page,
        new URLSearchParams({
          ...(search ? { email: search } : {}),
          ...(provider ? { provider } : {}),
          ...(status ? { status } : {}),
        }),
      ),
    [search, provider, status],
  );
  const page = useAdminPage(load);
  const { reload, handleFailure } = page;
  const refresh = useCallback(() => {
    reload();
    recoverySummary().then(setSummary).catch(handleFailure);
  }, [reload, handleFailure]);
  useEffect(() => {
    recoverySummary().then(setSummary).catch(page.handleFailure);
  }, [page.handleFailure]);
  const open = async (account: AdminRecoveryAccount) => {
    setError("");
    setBusy(true);
    try {
      setPreview(await recoveryPreview(account.userId));
    } catch {
      setError("복구 정보를 불러오지 못했어요. 새로고침 후 다시 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  };
  const restore = async () => {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      await restoreMember(preview.account.userId);
      setPreview(null);
      refresh();
    } catch {
      setError("복구 결과를 확인하지 못했어요. 창을 닫고 새로고침해 주세요.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminShell title="회원 복구" actions={<AdminButton onClick={refresh}>새로고침</AdminButton>}>
      {summary && (
        <>
          <AdminSummary
            items={[
              { label: "복구 가능", value: summary.available, description: "보관 기간 내 탈퇴 회원" },
              { label: "7일 안에 삭제", value: summary.expiring, description: "복구 요청이 있으면 먼저 처리" },
              { label: "이번 달 복구", value: summary.restored, description: "관리자 복구" },
              { label: "이번 달 영구 삭제", value: summary.purged, description: "보관 기간 지남" },
            ]}
          />
          <p className="mt-2 text-admin-caption text-admin-text-muted">
            복구·삭제 집계 시작 · {formatDateTime(summary.trackingStartedAt)}
          </p>
        </>
      )}
      <form
        className="my-5 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(email.trim());
          page.setPage(1);
        }}
      >
        <input
          aria-label="이메일 전체를 입력해 찾기"
          type="email"
          data-private
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 전체를 입력해 찾기"
          className={`${ADMIN_FIELD} min-w-0 flex-1`}
        />
        <AdminButton type="submit">찾기</AdminButton>
        <select
          aria-label="로그인 방법"
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            page.setPage(1);
          }}
          className={ADMIN_FIELD}
        >
          <option value="">로그인 방법 · 전체</option>
          <option value="GOOGLE">Google</option>
          <option value="KAKAO">카카오</option>
        </select>
        <select
          aria-label="복구 상태"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            page.setPage(1);
          }}
          className={ADMIN_FIELD}
        >
          <option value="">상태 · 전체</option>
          {Object.entries(STATUS).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
      </form>
      {error && (
        <p role="alert" className="my-3 text-admin-danger">
          {error}
        </p>
      )}
      <div className="min-h-96 flex-1 rounded-admin-xl border border-admin-border bg-admin-elevated">
        <div className="flex justify-between border-b border-admin-border p-5">
          <h2 className="font-semibold">전체 {page.data?.pagination.totalElements ?? 0}건</h2>
          <span className="text-admin-text-muted">삭제 예정 빠른 순</span>
        </div>
        <AdminTable
          label="회원 복구 목록"
          columns={["계정", "로그인 방법", "탈퇴일", "삭제 예정 / 복구일", "상태", "작업"]}
        >
          <AdminListState
            colSpan={6}
            failed={page.failed}
            loading={!page.data}
            empty={page.data?.items.length === 0}
            emptyMessage="조건에 맞는 탈퇴·복구 회원이 없어요."
          />
          {page.data?.items.map((a) => (
            <tr key={`${a.userId}:${a.withdrawnAt}`}>
              <td className={`${CELL_CLASS} font-semibold`}>{a.maskedEmail}</td>
              <td className={CELL_CLASS}>{providerName(a.provider)}</td>
              <td className={CELL_CLASS}>{formatDateTime(a.withdrawnAt)}</td>
              <td className={CELL_CLASS}>
                {a.restoredAt ? `${formatDateTime(a.restoredAt)} 복구` : formatDateTime(a.purgeEligibleAt)}
              </td>
              <td className={CELL_CLASS}>
                <span
                  className={
                    a.status === "EXPIRING"
                      ? "rounded-full bg-admin-warning-soft px-2 py-1 text-admin-warning"
                      : a.status === "RESTORED"
                        ? "rounded-full bg-admin-success-soft px-2 py-1 text-admin-success"
                        : "rounded-full bg-admin-selected px-2 py-1"
                  }
                >
                  {STATUS[a.status] ?? a.status}
                </span>
              </td>
              <td className={CELL_CLASS}>
                {a.status !== "RESTORED" && (
                  <AdminButton disabled={busy || !a.canRestore} onClick={() => void open(a)}>
                    {a.canRestore ? "복구" : a.requestedAt ? "기한 경과" : "복구 요청 없음"}
                  </AdminButton>
                )}
              </td>
            </tr>
          ))}
        </AdminTable>
        {page.data && <AdminPagination pagination={page.data.pagination} onChange={page.setPage} />}
      </div>
      {preview && (
        <AdminDialog
          title="이 계정을 복구할까요?"
          onClose={() => {
            if (!busy) setPreview(null);
          }}
        >
          <p className="text-admin-text-secondary">
            복구하면 사용자가 같은 계정으로 바로 로그인할 수 있고, 탈퇴 전 기록이 그대로 돌아와요. 사용자에게 따로
            알림은 가지 않아요.
          </p>
          <div className="my-5 rounded-admin-lg bg-admin-surface p-4">
            <p className="font-bold">{preview.account.maskedEmail}</p>
            <p className="mt-1 text-admin-caption text-admin-text-muted">
              {providerName(preview.account.provider)} · {formatDateTime(preview.account.withdrawnAt)} 탈퇴 ·{" "}
              {formatDateTime(preview.account.purgeEligibleAt)} 삭제 예정
            </p>
          </div>
          <h3 className="font-semibold">돌아오는 정보</h3>
          <ul className="my-3 list-inside list-disc space-y-2">
            <li>
              선반 제품 {preview.shelf}개와 평가 {preview.ratings}개
            </li>
            <li>위시리스트 제품 {preview.wishlist}개</li>
            {preview.profileStored && <li>보관 중인 프로필 정보</li>}
            <li>나만의 필터 성분 {preview.filters}개</li>
          </ul>
          <h3 className="mt-5 font-semibold">복구 근거</h3>
          <p className="mt-2 rounded-admin-lg border border-admin-border p-3">
            기존 계정 복구 요청 ·{" "}
            {preview.account.requestedAt ? formatDateTime(preview.account.requestedAt) : "요청 없음"}
          </p>
          <p className="mt-2 text-admin-caption text-admin-text-muted">
            복구 기록에 처리자·시각·해당 탈퇴 회차의 요청이 남아요.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-admin-danger">
              {error}
            </p>
          )}
          <footer className="mt-7 flex justify-end gap-2 border-t border-admin-border pt-5">
            <AdminButton disabled={busy} onClick={() => setPreview(null)}>
              취소
            </AdminButton>
            <AdminButton primary busy={busy} disabled={!preview.account.canRestore} onClick={() => void restore()}>
              복구하기
            </AdminButton>
          </footer>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
