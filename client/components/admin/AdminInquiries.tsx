"use client";

import {
  FeedbackStatus,
  type AdminInquiryResponse,
  type AdminInquiryTarget,
  type AdminInquiryNeighborsResponse,
  type AdminInquiryDetailResponse,
  type AdminInquirySummaryResponse,
} from "@poudy/api/api.zod";
import { useCallback, useEffect, useState } from "react";

import { AdminButton, AdminSummary, ADMIN_FIELD } from "./AdminControls";
import { AdminDialog } from "./AdminDialog";
import { AdminListState } from "./AdminListState";
import { AdminPagination } from "./AdminPagination";
import { AdminShell } from "./AdminShell";
import { AdminTable, CELL_CLASS } from "./AdminTable";
import { formatDateTime, REQUEST_STATUSES } from "./labels";
import { useAdminPage } from "./useAdminPage";

import {
  findInquiries,
  inquirySummary,
  findInquiry,
  setInquiryStatus,
  setInquiryAssignee,
  addInquiryMemo,
  inquiryPath,
  inquiryNeighbors,
} from "@/lib/api/admin-operations";
import { publicApiUrl } from "@/lib/api/client";

const TYPES: Readonly<Record<string, string>> = {
  BUG_REPORT: "오류 신고",
  IMPROVEMENT: "개선 제안",
  OTHER: "기타 문의",
  PRODUCT_CORRECTION: "제품 정보 정정",
  PRODUCT_REGISTRATION: "제품 등록 요청",
};
const statusLabel = (value: string) => REQUEST_STATUSES.find((s) => s.value === value)?.label ?? value;
export function AdminInquiries() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [assigned, setAssigned] = useState("");
  const [days, setDays] = useState("30");
  const [oldest, setOldest] = useState(false);
  const [selected, setSelected] = useState<readonly AdminInquiryResponse[]>([]);
  const [detail, setDetail] = useState<AdminInquiryTarget | null>(null);
  const [summary, setSummary] = useState<AdminInquirySummaryResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const query = useCallback(
    () =>
      new URLSearchParams({
        q,
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(assigned ? { assigned } : {}),
        ...(days ? { from: new Date(Date.now() - Number(days) * 86400000).toISOString() } : {}),
        oldest: String(oldest),
      }),
    [q, status, type, assigned, days, oldest],
  );
  const load = useCallback((page: number) => findInquiries(page, query()), [query]);
  const page = useAdminPage(load);
  const { reload, handleFailure } = page;
  const refresh = useCallback(() => {
    setSelected([]);
    reload();
    inquirySummary().then(setSummary).catch(handleFailure);
  }, [reload, handleFailure]);
  useEffect(() => {
    inquirySummary().then(setSummary).catch(page.handleFailure);
  }, [page.handleFailure]);
  const changeFilter = (change: () => void) => {
    change();
    setSelected([]);
    page.setPage(1);
  };
  const bulk = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setSelected([]);
      refresh();
    } catch {
      setMessage("변경하지 못했어요. 목록을 새로고침하고 다시 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminShell
      title="문의 관리"
      description="사용자가 보낸 오류 신고와 개선 의견 등을 확인합니다."
      actions={<AdminButton onClick={refresh}>새로고침</AdminButton>}
    >
      {summary && (
        <AdminSummary
          items={[
            { label: "새 문의", value: summary.received, description: "미확인" },
            { label: "확인 중", value: summary.inProgress + summary.reviewPlanned, description: "확인 중 · 검토 예정" },
            { label: "처리 완료", value: summary.completed, description: "보관 중 완료 건" },
            { label: "오늘 접수", value: summary.today, description: "오늘 들어온 문의" },
          ]}
        />
      )}
      <div className="my-4 flex flex-wrap gap-2">
        <input
          type="search"
          aria-label="문의 검색"
          placeholder="내용, 제품명, 브랜드명, 접수 ID, 유입 경로 검색"
          value={q}
          onChange={(e) => changeFilter(() => setQ(e.target.value))}
          className={`${ADMIN_FIELD} min-w-0 flex-1`}
        />
        <select
          aria-label="상태 필터"
          value={status}
          onChange={(e) => changeFilter(() => setStatus(e.target.value))}
          className={ADMIN_FIELD}
        >
          <option value="">상태 · 전체</option>
          {REQUEST_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          aria-label="유형 필터"
          value={type}
          onChange={(e) => changeFilter(() => setType(e.target.value))}
          className={ADMIN_FIELD}
        >
          <option value="">유형 · 전체</option>
          {Object.entries(TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="담당자 필터"
          value={assigned}
          onChange={(e) => changeFilter(() => setAssigned(e.target.value))}
          className={ADMIN_FIELD}
        >
          <option value="">담당자 · 전체</option>
          <option value="false">미배정</option>
          <option value="true">관리자</option>
        </select>
        <select
          aria-label="조회 기간"
          value={days}
          onChange={(e) => changeFilter(() => setDays(e.target.value))}
          className={ADMIN_FIELD}
        >
          <option value="30">최근 30일</option>
          <option value="7">최근 7일</option>
          <option value="">전체 기간</option>
        </select>
      </div>
      {!!selected.length && (
        <div
          className="mb-4 flex flex-wrap items-center gap-3 rounded-admin-lg bg-admin-inverse p-3 text-admin-on-action"
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelected([]);
          }}
        >
          <span>{selected.length}개 선택됨 · Esc로 해제</span>
          <select
            aria-label="선택 문의 상태 변경"
            disabled={busy}
            value=""
            onChange={(e) => {
              const parsed = FeedbackStatus.safeParse(e.target.value);
              if (parsed.success) void bulk(() => setInquiryStatus(selected, parsed.data));
            }}
            className={`${ADMIN_FIELD} ml-auto`}
          >
            <option value="">상태 변경</option>
            {REQUEST_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <AdminButton disabled={busy} onClick={() => void bulk(() => setInquiryAssignee(selected, true))}>
            담당자 지정
          </AdminButton>
          <AdminButton disabled={busy} onClick={() => void bulk(() => setInquiryAssignee(selected, false))}>
            미배정으로 변경
          </AdminButton>
          <button type="button" onClick={() => setSelected([])}>
            선택 해제
          </button>
        </div>
      )}
      {message && (
        <p role="alert" className="mb-3 text-admin-danger">
          {message}
        </p>
      )}
      <div className="min-h-96 flex-1 rounded-admin-xl border border-admin-border bg-admin-elevated">
        <div className="flex justify-between border-b border-admin-border p-4">
          <h2 className="font-semibold">문의 {page.data?.pagination.totalElements ?? 0}건</h2>
          <button type="button" onClick={() => changeFilter(() => setOldest((s) => !s))}>
            {oldest ? "오래된 순" : "최신순"} ↕
          </button>
        </div>
        <AdminTable
          label="문의 목록"
          columns={[
            <input
              key="selection"
              type="checkbox"
              aria-label="현재 페이지 전체 선택"
              checked={(page.data?.items.length ?? 0) > 0 && selected.length === page.data?.items.length}
              ref={(element) => {
                if (element)
                  element.indeterminate = selected.length > 0 && selected.length < (page.data?.items.length ?? 0);
              }}
              onChange={(e) => setSelected(e.target.checked ? (page.data?.items ?? []) : [])}
            />,
            "상태",
            "유형",
            "문의 내용",
            "유입 경로",
            "담당자",
            "접수일",
          ]}
        >
          <AdminListState
            colSpan={7}
            failed={page.failed}
            loading={!page.data}
            empty={page.data?.items.length === 0}
            emptyMessage="조건에 맞는 문의가 없어요."
          />
          {page.data?.items.map((item) => (
            <tr
              key={`${item.kind}:${item.id}`}
              className={selected.some((i) => i.kind === item.kind && i.id === item.id) ? "bg-admin-selected" : ""}
            >
              <td className={CELL_CLASS}>
                <input
                  type="checkbox"
                  aria-label={`${item.content} 선택`}
                  checked={selected.some((i) => i.kind === item.kind && i.id === item.id)}
                  onChange={(e) =>
                    setSelected((current) =>
                      e.target.checked
                        ? [...current, item]
                        : current.filter((i) => i.kind !== item.kind || i.id !== item.id),
                    )
                  }
                />
              </td>
              <td className={`${CELL_CLASS} whitespace-nowrap`}>{statusLabel(item.status)}</td>
              <td className={`${CELL_CLASS} whitespace-nowrap`}>{TYPES[item.type] ?? item.type}</td>
              <td className={CELL_CLASS}>
                <button type="button" onClick={() => setDetail(item)} className="text-left hover:underline">
                  {item.brandName && `${item.brandName} · `}
                  {item.content}
                </button>
              </td>
              <td className={`${CELL_CLASS} break-all text-admin-text-muted`}>{item.path ?? "—"}</td>
              <td className={CELL_CLASS}>{item.assigned ? "관리자" : "미배정"}</td>
              <td className={`${CELL_CLASS} whitespace-nowrap`}>{formatDateTime(item.receivedAt)}</td>
            </tr>
          ))}
        </AdminTable>
        {page.data && (
          <AdminPagination
            pagination={page.data.pagination}
            onChange={(n) => {
              setSelected([]);
              page.setPage(n);
            }}
          />
        )}
      </div>
      {detail && (
        <InquiryDrawer
          key={`${detail.kind}:${detail.id}`}
          target={detail}
          filters={query().toString()}
          onChangeTarget={setDetail}
          onClose={() => setDetail(null)}
          onChanged={refresh}
        />
      )}
    </AdminShell>
  );
}
function InquiryDrawer({
  target,
  filters,
  onChangeTarget,
  onClose,
  onChanged,
}: {
  readonly target: AdminInquiryTarget;
  readonly filters: string;
  readonly onChangeTarget: (target: AdminInquiryTarget) => void;
  readonly onClose: () => void;
  readonly onChanged: () => void;
}) {
  const [data, setData] = useState<AdminInquiryDetailResponse | null>(null);
  const [error, setError] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [navigation, setNavigation] = useState<AdminInquiryNeighborsResponse | null>(null);
  useEffect(() => {
    let active = true;
    inquiryNeighbors(target, filters)
      .then((n) => {
        if (active) setNavigation(n);
      })
      .catch(() => {
        if (active) setNavigation(null);
      });
    findInquiry(target)
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError("문의 상세를 불러오지 못했어요.");
      });
    return () => {
      active = false;
    };
  }, [target, filters]);
  const update = async (action: () => Promise<void>, clearMemo = false) => {
    setBusy(true);
    setError("");
    try {
      await action();
      setData(await findInquiry(target));
      if (clearMemo) setMemo("");
      onChanged();
    } catch {
      setError("변경 결과를 확인하지 못했어요. 창을 닫고 새로고침해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminDialog title="문의 상세" drawer onClose={onClose}>
      <p className="mb-5 text-admin-text-muted">접수된 정보를 확인하고 내부 처리 상태를 관리합니다.</p>
      <div className="mb-5 flex gap-2">
        <AdminButton
          disabled={!navigation?.previous}
          onClick={() => {
            if (navigation?.previous) onChangeTarget(navigation.previous);
          }}
        >
          이전
        </AdminButton>
        <span className="self-center">
          {navigation?.position ?? 0}/{navigation?.total ?? 0} · 현재 검색 조건
        </span>
        <AdminButton
          disabled={!navigation?.next}
          onClick={() => {
            if (navigation?.next) onChangeTarget(navigation.next);
          }}
        >
          다음
        </AdminButton>
      </div>
      {error && (
        <p role="alert" className="mb-4 text-admin-danger">
          {error}
        </p>
      )}
      {data ? (
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <article className="space-y-4 rounded-admin-xl border border-admin-border p-5">
              <span className="rounded-admin-sm bg-admin-subtle px-2 py-1 text-admin-caption">
                {TYPES[data.inquiry.type] ?? data.inquiry.type}
              </span>
              {data.inquiry.productName && (
                <h3 className="text-admin-title font-bold">
                  {data.inquiry.brandName} {data.inquiry.productName}
                </h3>
              )}
              <p className="break-all text-admin-caption text-admin-text-muted">
                접수 ID · {target.id} · {formatDateTime(data.inquiry.receivedAt)}
              </p>
              <p className="whitespace-pre-wrap rounded-admin-md bg-admin-surface p-4">{data.inquiry.content}</p>
              <div className="flex gap-2">
                {data.images.map((i) => {
                  const src = publicApiUrl(`${inquiryPath(target)}/images/${i.imageId}`);
                  return (
                    <button type="button" key={i.imageId} onClick={() => setImage(src)} aria-label="첨부 이미지 확대">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="문의 첨부 이미지" className="size-20 rounded-admin-md object-cover" />
                    </button>
                  );
                })}
              </div>
              {data.inquiry.path && (
                <a
                  href={
                    data.inquiry.path.startsWith("/") && !data.inquiry.path.startsWith("//")
                      ? data.inquiry.path
                      : undefined
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block break-all text-admin-text-muted underline"
                >
                  {data.inquiry.path}
                </a>
              )}
            </article>
            <h3 className="text-admin-title font-bold">관리자 메모 · {data.memos.length}개</h3>
            {data.memos.map((m) => (
              <article key={m.id} className="rounded-admin-md border border-admin-border">
                <p className="border-b border-admin-border bg-admin-surface px-3 py-2 text-admin-caption text-admin-text-muted">
                  {m.authorName} · {formatDateTime(m.createdAt)}
                </p>
                <p className="whitespace-pre-wrap p-4">{m.content}</p>
              </article>
            ))}
            <label className="block">
              <span className="font-semibold">운영 메모</span>
              <textarea
                disabled={busy}
                rows={4}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={2000}
                placeholder="운영 메모를 입력하세요."
                className={`${ADMIN_FIELD} mt-2 w-full py-3`}
              />
            </label>
            <div className="flex items-center justify-between gap-2">
              <p className="text-admin-caption text-admin-text-muted">사용자에게 노출되지 않습니다.</p>
              <AdminButton
                primary
                busy={busy}
                disabled={!memo.trim() || Array.from(memo).length > 2000}
                onClick={() => void update(() => addInquiryMemo(target, memo), true)}
              >
                ＋ 메모 추가
              </AdminButton>
            </div>
          </div>
          <aside className="space-y-4 rounded-admin-xl bg-admin-subtle p-3">
            <section className="space-y-3 rounded-admin-lg border border-admin-border bg-admin-elevated p-4">
              <h3 className="text-admin-title font-bold">처리 정보</h3>
              <label className="block">
                처리 상태
                <select
                  aria-label="처리 상태"
                  disabled={busy}
                  value={data.inquiry.status}
                  onChange={(e) => {
                    const parsed = FeedbackStatus.safeParse(e.target.value);
                    if (parsed.success) void update(() => setInquiryStatus([target], parsed.data));
                  }}
                  className={`${ADMIN_FIELD} mt-2 w-full`}
                >
                  {REQUEST_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                담당자
                <select
                  aria-label="담당자"
                  disabled={busy}
                  value={String(data.inquiry.assigned)}
                  onChange={(e) => void update(() => setInquiryAssignee([target], e.target.value === "true"))}
                  className={`${ADMIN_FIELD} mt-2 w-full`}
                >
                  <option value="false">미배정</option>
                  <option value="true">관리자</option>
                </select>
              </label>
              <p className="text-admin-caption text-admin-text-muted">
                최근 수정 · {formatDateTime(data.inquiry.updatedAt)}
              </p>
            </section>
            <section className="space-y-4 rounded-admin-lg border border-admin-border bg-admin-elevated p-4">
              <h3 className="text-admin-title font-bold">처리 이력</h3>
              <p>
                문의가 정상 접수됐어요
                <br />
                <span className="text-admin-caption text-admin-text-muted">
                  시스템 · {formatDateTime(data.inquiry.receivedAt)}
                </span>
              </p>
              {data.events.map((e) => (
                <p key={e.id} className="text-admin-small-body">
                  {e.type === "STATUS_CHANGED"
                    ? `처리 상태 변경 · ${statusLabel(e.previousValue ?? "")} → ${statusLabel(e.currentValue ?? "")}`
                    : e.type === "ASSIGNEE_CHANGED"
                      ? `담당자 변경 · ${e.currentValue === "true" ? "관리자" : "미배정"}`
                      : `메모 추가 · ${e.memo ?? ""}`}
                  <br />
                  <span className="text-admin-caption text-admin-text-muted">
                    {e.actor} · {formatDateTime(e.occurredAt)}
                  </span>
                </p>
              ))}
            </section>
          </aside>
        </div>
      ) : (
        !error && <p role="status">불러오는 중이에요.</p>
      )}
      {image && (
        <AdminDialog title="첨부 이미지" onClose={() => setImage(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="확대한 문의 첨부 이미지" className="h-auto w-full" />
        </AdminDialog>
      )}
    </AdminDialog>
  );
}
