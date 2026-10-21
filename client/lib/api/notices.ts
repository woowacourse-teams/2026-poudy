import {
  AdminNoticeSummaryResponse,
  NoticeResponse,
  NoticePageResponse,
  NoticeBannersResponse,
  NoticeImageUploadResponse,
  type AdminNoticeEditRequest,
} from "@poudy/api/api.zod";

import { apiGet, apiPost, apiPostFor, apiPostForm, apiPutFor, apiDelete, publicApiUrl } from "./client";

export const findNotices = (page: number) =>
  apiGet("/api/notices", NoticePageResponse, { query: new URLSearchParams({ page: String(page) }) });
export const findNotice = (id: string) => apiGet(`/api/notices/${id}`, NoticeResponse);
export const findNoticeBanners = () => apiGet("/api/notices/banners", NoticeBannersResponse);
export const recordNoticeView = (id: string) => apiPost(`/api/notices/${id}/views`);
export const findAdminNotices = (page: number, filter: URLSearchParams) =>
  apiGet("/api/admin/notices", NoticePageResponse, {
    query: new URLSearchParams({ page: String(page), ...Object.fromEntries(filter) }),
    withSession: true,
  });
export const findAdminNotice = (id: string) =>
  apiGet(`/api/admin/notices/${id}`, NoticeResponse, { withSession: true });
export const noticeSummary = () =>
  apiGet("/api/admin/notices/summary", AdminNoticeSummaryResponse, { withSession: true });
export const saveNotice = (id: string | undefined, body: AdminNoticeEditRequest) =>
  id
    ? apiPutFor(`/api/admin/notices/${id}`, NoticeResponse, body)
    : apiPostFor("/api/admin/notices", NoticeResponse, body);
export const deleteNotice = (id: string) => apiDelete(`/api/admin/notices/${id}`);
export const noticeImageUrl = (id: string, noticeId?: string) =>
  publicApiUrl(noticeId ? `/api/notices/${noticeId}/images/${id}` : `/api/admin/notices/images/${id}`);
export const uploadNoticeImages = (files: readonly File[]) => {
  const form = new FormData();
  files.forEach((file) => form.append("images", file));
  return apiPostForm("/api/admin/notices/images", NoticeImageUploadResponse, { form, withSession: true });
};
