"use client";

import { AdminNoticeEditRequest, type NoticeResponse, type AdminNoticeSummaryResponse } from "@poudy/api/api.zod";
import { Icon } from "@poudy/design-system/icon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AdminButton, AdminSummary, AdminSwitch, ADMIN_FIELD } from "./AdminControls";
import { AdminDialog } from "./AdminDialog";
import { AdminListState } from "./AdminListState";
import { AdminPagination } from "./AdminPagination";
import { AdminShell } from "./AdminShell";
import { AdminTable, CELL_CLASS } from "./AdminTable";
import { formatDateTime } from "./labels";
import { useAdminPage } from "./useAdminPage";

import { NoticeBannerLine } from "@/components/notices/NoticeBannerLine";
import { NoticeBody } from "@/components/notices/NoticeBody";
import { constraintOf } from "@/lib/api/constraint";
import { IMAGE_ACCEPT_ATTRIBUTE } from "@/lib/api/feedback";
import {
  findAdminNotices,
  findAdminNotice,
  noticeSummary,
  saveNotice,
  deleteNotice,
  uploadNoticeImages,
} from "@/lib/api/notices";
import { rejectionOf } from "@/lib/domain/attached-image";

export function AdminNotices() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [oldest, setOldest] = useState(false);
  const [summary, setSummary] = useState<AdminNoticeSummaryResponse | null>(null);
  const load = useCallback(
    (page: number) =>
      findAdminNotices(page, new URLSearchParams({ q, ...(status ? { status } : {}), oldest: String(oldest) })),
    [q, status, oldest],
  );
  const page = useAdminPage(load);
  useEffect(() => {
    noticeSummary().then(setSummary).catch(page.handleFailure);
  }, [page.handleFailure]);
  return (
    <AdminShell
      title="공지사항"
      actions={
        <Link
          href="/admin/notices/new"
          className="inline-flex min-h-11 items-center rounded-admin-lg bg-admin-action px-5 font-semibold text-admin-on-action"
        >
          새 공지 쓰기 →
        </Link>
      }
    >
      {summary && (
        <AdminSummary
          items={[
            { label: "공개 중", value: summary.published, description: `상단 띠 ${summary.bannerVisibleCount}건 노출` },
            { label: "비공개", value: summary.privateCount, description: "앱에 보이지 않는 공지" },
          ]}
        />
      )}
      <div className="my-5 flex gap-2">
        <input
          aria-label="공지 제목으로 찾기"
          type="search"
          placeholder="공지 제목으로 찾기"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            page.setPage(1);
          }}
          className={`${ADMIN_FIELD} min-w-0 flex-1`}
        />
        <select
          aria-label="공지 상태"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            page.setPage(1);
          }}
          className={ADMIN_FIELD}
        >
          <option value="">상태 · 전체</option>
          <option value="PUBLISHED">공개 중</option>
          <option value="PRIVATE">비공개</option>
        </select>
      </div>
      <div className="min-h-96 flex-1 rounded-admin-xl border border-admin-border bg-admin-elevated">
        <div className="flex items-center justify-between border-b border-admin-border px-5 py-4">
          <p className="font-semibold">전체 {page.data?.pagination.totalElements ?? 0}건</p>
          <select
            aria-label="공지 정렬"
            value={String(oldest)}
            onChange={(e) => {
              setOldest(e.target.value === "true");
              page.setPage(1);
            }}
            className="bg-admin-elevated text-admin-body text-admin-text-muted"
          >
            <option value="false">최신순</option>
            <option value="true">오래된 순</option>
          </select>
        </div>
        <AdminListState
          failed={page.failed}
          loading={!page.data}
          empty={page.data?.items.length === 0}
          emptyMessage="등록된 공지가 없어요."
        />
        {page.data && (
          <>
            <AdminTable
              label="공지사항 목록"
              columns={["상태", "제목", "상단 띠", "공개일", "조회", "작성자", "수정일"]}
            >
              {page.data.items.map((n) => (
                <tr key={n.id}>
                  <td className={CELL_CLASS}>
                    <span
                      className={
                        n.status === "PUBLISHED"
                          ? "rounded-full bg-admin-success-soft px-2 py-1 text-admin-success"
                          : "rounded-full bg-admin-selected px-2 py-1"
                      }
                    >
                      {n.status === "PUBLISHED" ? "● 공개 중" : "● 비공개"}
                    </span>
                  </td>
                  <td className={CELL_CLASS}>
                    <Link href={`/admin/notices/${n.id}`} className="font-semibold hover:underline">
                      {n.title}
                    </Link>
                  </td>
                  <td className={CELL_CLASS}>{n.bannerEnabled ? "켜짐" : "—"}</td>
                  <td className={CELL_CLASS}>{n.firstPublishedAt ? formatDateTime(n.firstPublishedAt) : "—"}</td>
                  <td className={CELL_CLASS}>{n.status === "PUBLISHED" ? n.viewCount.toLocaleString() : "—"}</td>
                  <td className={CELL_CLASS}>관리자</td>
                  <td className={CELL_CLASS}>{formatDateTime(n.updatedAt)}</td>
                </tr>
              ))}
            </AdminTable>
            <AdminPagination pagination={page.data.pagination} onChange={page.setPage} />
          </>
        )}
      </div>
    </AdminShell>
  );
}

const EMPTY: AdminNoticeEditRequest = {
  title: "",
  content: "",
  status: "PRIVATE",
  bannerEnabled: false,
  bannerText: "",
  imageIds: [],
};
const TITLE_LIMIT = constraintOf(AdminNoticeEditRequest.shape.title.maxLength, "공지 제목 최대 길이");
const CONTENT_LIMIT = constraintOf(AdminNoticeEditRequest.shape.content.maxLength, "공지 본문 최대 길이");
const BANNER_LIMIT = constraintOf(
  AdminNoticeEditRequest.shape.bannerText.unwrap().unwrap().maxLength,
  "공지 띠 최대 길이",
);
const length = (value: string) => Array.from(value).length;
export function AdminNoticeEditor({ id }: { readonly id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<AdminNoticeEditRequest>(EMPTY);
  const [original, setOriginal] = useState<NoticeResponse | null>(null);
  const [ready, setReady] = useState(!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewDate] = useState(() => new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }));
  useEffect(() => {
    if (!id) return;
    let active = true;
    findAdminNotice(id)
      .then((n) => {
        if (!active) return;
        setOriginal(n);
        setForm({
          title: n.title,
          content: n.content,
          status: n.status,
          bannerEnabled: n.bannerEnabled,
          bannerText: n.bannerText ?? "",
          imageIds: n.images.map((i) => i.imageId),
        });
        setReady(true);
      })
      .catch(() => {
        if (active) setError("공지를 불러오지 못했어요.");
      });
    return () => {
      active = false;
    };
  }, [id]);
  const field = <K extends keyof AdminNoticeEditRequest>(key: K, value: AdminNoticeEditRequest[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };
  const noticeId = id ?? original?.id;
  const submit = async (status: AdminNoticeEditRequest["status"]) => {
    setSaved(false);
    setError("");
    if (
      !form.title.trim() ||
      !form.content.trim() ||
      length(form.title) > TITLE_LIMIT ||
      length(form.content) > CONTENT_LIMIT ||
      (form.bannerEnabled && (!form.bannerText?.trim() || length(form.bannerText) > BANNER_LIMIT))
    ) {
      setError("제목·본문·띠 문구의 필수값과 글자 수를 확인해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const result = await saveNotice(noticeId, { ...form, status });
      setOriginal(result);
      setForm((f) => ({ ...f, status: result.status }));
      setSaved(true);
      if (!id) router.replace(`/admin/notices/${result.id}`);
    } catch {
      setError("저장 결과를 확인하지 못했어요. 입력 내용은 유지됩니다. 목록에서 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };
  const upload = async (files: readonly File[]) => {
    setError("");
    setSaved(false);
    if (form.imageIds.length + files.length > 5) {
      setError("이미지는 최대 5장까지 첨부할 수 있어요.");
      return;
    }
    const invalid = files.map(rejectionOf).find(Boolean);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    try {
      const result = await uploadNoticeImages(files);
      setForm((f) => ({ ...f, imageIds: [...f.imageIds, ...result.imageIds] }));
    } catch {
      setError("이미지를 올리지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };
  const move = (index: number, direction: number) => {
    const next = [...form.imageIds];
    const to = index + direction;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    field("imageIds", next);
  };
  const published = original?.status === "PUBLISHED";
  return (
    <AdminShell
      title={
        <>
          {published ? "공지 수정" : "공지 쓰기"}
          <span
            className={
              published
                ? "ml-3 text-admin-body font-semibold text-admin-success"
                : "ml-3 rounded-full bg-admin-selected px-2 py-1 text-admin-body font-semibold text-admin-text-secondary"
            }
          >
            ● {published ? "공개 중" : "비공개"}
          </span>
        </>
      }
      meta={
        original?.firstPublishedAt
          ? `${formatDateTime(original.firstPublishedAt)} 공개 · 조회 ${original.viewCount}`
          : undefined
      }
      description={
        published
          ? "앱에 보이는 중이에요. 저장하면 바로 반영돼요."
          : "저장해도 앱에는 보이지 않아요. 공개하기를 눌러야 보여요."
      }
    >
      {error && (
        <p role="alert" className="mb-4 text-admin-danger">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="mb-4 text-admin-success">
          저장했어요.
        </p>
      )}
      {ready ? (
        <div className="grid items-start gap-7 lg:grid-cols-8">
          <section className="space-y-6 rounded-admin-xl border border-admin-border bg-admin-elevated p-7 lg:col-span-5">
            <label className="block">
              <span className="mb-2 flex justify-between font-semibold">
                제목{" "}
                <span className="font-normal text-admin-text-muted">
                  {length(form.title)} / {TITLE_LIMIT}
                </span>
              </span>
              <input
                value={form.title}
                onChange={(e) => field("title", e.target.value)}
                className={`${ADMIN_FIELD} w-full`}
              />
            </label>
            <label className="block">
              <span className="mb-2 flex justify-between font-semibold">
                본문{" "}
                <span className="font-normal text-admin-text-muted">
                  {length(form.content)} / {CONTENT_LIMIT}
                </span>
              </span>
              <textarea
                value={form.content}
                rows={10}
                onChange={(e) => field("content", e.target.value)}
                className={`${ADMIN_FIELD} w-full resize-none py-3`}
              />
            </label>
            <div className="border-t border-admin-border pt-5">
              <label className="flex items-center justify-between font-semibold">
                상단 띠로 알리기
                <AdminSwitch
                  checked={form.bannerEnabled}
                  onChange={(value) => field("bannerEnabled", value)}
                  label="상단 띠로 알리기"
                />
              </label>
              <p className="mt-1 text-admin-caption text-admin-text-muted">
                공개된 공지의 문구가 앱 화면 맨 위에 보여요.
              </p>
              {form.bannerEnabled && (
                <label className="mt-4 block">
                  <span className="mb-2 flex justify-between">
                    띠 문구{" "}
                    <span>
                      {length(form.bannerText ?? "")} / {BANNER_LIMIT}
                    </span>
                  </span>
                  <input
                    value={form.bannerText ?? ""}
                    onChange={(e) => field("bannerText", e.target.value)}
                    className={`${ADMIN_FIELD} w-full`}
                  />
                </label>
              )}
              <p className="mt-3 rounded-admin-md bg-admin-subtle p-3 text-admin-caption text-admin-text-muted">
                띠가 켜진 공개 공지 중 최신 10개가 번갈아 보여요.
              </p>
            </div>
            <div className="border-t border-admin-border pt-5">
              <p className="font-semibold">첨부 이미지 · {form.imageIds.length}/5</p>
              <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-admin-lg border border-admin-border-strong px-4 font-semibold focus-within:ring-2 focus-within:ring-admin-brand">
                ＋ 사진 추가
                <input
                  aria-label="공지 첨부 이미지 추가"
                  type="file"
                  multiple
                  accept={IMAGE_ACCEPT_ATTRIBUTE}
                  disabled={busy}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (files.length) void upload(files);
                  }}
                  className="sr-only"
                />
              </label>
              <p className="mt-2 text-admin-caption text-admin-text-muted">
                JPG·PNG·HEIC, 장당 최대 5MB. 본문 아래에 표시돼요.
              </p>
              <ol className="mt-3 space-y-2">
                {form.imageIds.map((imageId, index) => (
                  <li key={imageId} className="flex flex-wrap items-center gap-2">
                    <span>이미지 {index + 1}</span>
                    <AdminButton
                      disabled={busy || index === 0}
                      onClick={() => move(index, -1)}
                      aria-label={`이미지 ${index + 1} 앞으로`}
                    >
                      ↑
                    </AdminButton>
                    <AdminButton
                      disabled={busy || index === form.imageIds.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label={`이미지 ${index + 1} 뒤로`}
                    >
                      ↓
                    </AdminButton>
                    <AdminButton
                      disabled={busy}
                      onClick={() =>
                        field(
                          "imageIds",
                          form.imageIds.filter((i) => i !== imageId),
                        )
                      }
                    >
                      제거
                    </AdminButton>
                  </li>
                ))}
              </ol>
            </div>
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-admin-border pt-5">
              {id && !published && (
                <AdminButton
                  disabled={busy}
                  onClick={() => setConfirmDelete(true)}
                  className="mr-auto text-admin-danger"
                >
                  삭제
                </AdminButton>
              )}
              <Link href="/admin/notices" className="px-3 py-2 underline">
                목록
              </Link>
              {published ? (
                <>
                  <AdminButton disabled={busy} onClick={() => void submit("PRIVATE")}>
                    비공개로 전환
                  </AdminButton>
                  <AdminButton primary busy={busy} onClick={() => void submit("PUBLISHED")}>
                    저장
                  </AdminButton>
                </>
              ) : (
                <>
                  <AdminButton busy={busy} onClick={() => void submit("PRIVATE")}>
                    저장
                  </AdminButton>
                  <AdminButton primary disabled={busy} onClick={() => void submit("PUBLISHED")}>
                    공개하기
                  </AdminButton>
                </>
              )}
            </footer>
          </section>
          <aside className="space-y-4 rounded-admin-xl border border-admin-border bg-admin-elevated p-5 lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">미리보기</h2>
              <span className="text-admin-caption text-admin-text-muted">실제 크기 · 앱 화면</span>
            </div>
            <p className="text-admin-caption font-semibold text-admin-text-muted">상단 띠 (앱 화면 맨 위)</p>
            <div className="min-h-100 overflow-hidden rounded-3xl border border-admin-border bg-background">
              <div aria-hidden="true" className="flex h-16 items-center justify-between px-5 text-16 font-semibold">
                <span>9:41</span>
                <svg viewBox="0 0 68 16" className="h-4 w-17" fill="currentColor">
                  <path d="M1 12h2v3H1zM5 9h2v6H5zM9 6h2v9H9zM13 3h2v12h-2z" />
                  <path
                    d="M23 5q8-7 16 0M26 8q5-4 10 0M29 11q2-2 4 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <circle cx="31" cy="14" r="1" />
                  <rect x="47" y="3" width="16" height="10" rx="2" fill="none" stroke="currentColor" />
                  <path d="M50 5h10v6H50zM65 6h2v4h-2z" />
                </svg>
              </div>
              {form.bannerEnabled && (
                <NoticeBannerLine text={form.bannerText || "띠 문구를 입력해 주세요"} current={1} total={1} />
              )}
              <div aria-hidden="true" className="flex h-14 items-center justify-between px-5">
                <span className="text-20 font-bold text-brand">poudy</span>
                <Icon name="search" className="size-6" />
              </div>
              <div aria-hidden="true" className="space-y-3 px-5 pb-5">
                <div className="h-28 rounded-xl bg-surface" />
                <div className="h-12 rounded-xl bg-surface" />
              </div>
            </div>
            <p className="text-admin-caption font-semibold text-admin-text-muted">공지 페이지 (/notices/[id])</p>
            <article className="min-h-160 overflow-hidden rounded-3xl border border-admin-border bg-background">
              <div className="flex h-14 items-center px-4">
                <Icon name="chevron-left" />
                <h2 className="flex-1 text-center text-bar font-bold">공지사항</h2>
                <span className="size-6" />
              </div>
              <div className="space-y-5 px-5 py-5">
                <div>
                  <h3 className="text-24 font-bold">{form.title || "제목을 입력해 주세요"}</h3>
                  <p className="mt-2 text-13 text-text-muted">
                    {original?.firstPublishedAt
                      ? new Date(original.firstPublishedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
                      : previewDate}
                  </p>
                </div>
                <NoticeBody content={form.content} imageIds={form.imageIds} />
              </div>
            </article>
          </aside>
        </div>
      ) : (
        <p role="status">불러오는 중이에요.</p>
      )}
      {confirmDelete && id && (
        <AdminDialog title="공지를 삭제할까요?" onClose={() => setConfirmDelete(false)}>
          <p>삭제한 공지는 되돌릴 수 없어요.</p>
          <div className="mt-6 flex justify-end gap-2">
            <AdminButton disabled={busy} onClick={() => setConfirmDelete(false)}>
              취소
            </AdminButton>
            <AdminButton
              primary
              busy={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await deleteNotice(id);
                  router.push("/admin/notices");
                } catch {
                  setError("삭제하지 못했어요. 공개 상태인지 확인해 주세요.");
                  setConfirmDelete(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              삭제하기
            </AdminButton>
          </div>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
