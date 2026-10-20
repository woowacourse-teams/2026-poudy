import {
  AdminInquiryPageResponse,
  AdminInquiryDetailResponse,
  AdminInquiryNeighborsResponse,
  AdminInquirySummaryResponse,
  AdminRecoveryPageResponse,
  AdminRecoveryPreviewResponse,
  AdminRecoverySummaryResponse,
  type AdminInquiryTarget,
  type FeedbackStatus,
} from "@poudy/api/api.zod";

import { apiGet, apiPost, apiPatchVoid } from "./client";
export const findInquiries = (page: number, query: URLSearchParams) => {
  const params = new URLSearchParams(query);
  params.set("page", String(page));
  return apiGet("/api/admin/inquiries", AdminInquiryPageResponse, { query: params, withSession: true });
};
export const inquirySummary = () =>
  apiGet("/api/admin/inquiries/summary", AdminInquirySummaryResponse, { withSession: true });
export const inquiryPath = (target: AdminInquiryTarget) => `/api/admin/inquiries/${target.kind}/${target.id}`;
export const findInquiry = (target: AdminInquiryTarget) =>
  apiGet(inquiryPath(target), AdminInquiryDetailResponse, { withSession: true });
export const setInquiryStatus = (targets: readonly AdminInquiryTarget[], status: FeedbackStatus) =>
  apiPatchVoid("/api/admin/inquiries/status", { targets, status });
export const setInquiryAssignee = (targets: readonly AdminInquiryTarget[], assigned: boolean) =>
  apiPatchVoid("/api/admin/inquiries/assignee", { targets, assigned });
export const addInquiryMemo = (target: AdminInquiryTarget, content: string) =>
  apiPost(`${inquiryPath(target)}/memos`, { content }, { withSession: true });
export const findRecovery = (page: number, query: URLSearchParams) => {
  const params = new URLSearchParams(query);
  params.set("page", String(page));
  return apiGet("/api/admin/users/withdrawn", AdminRecoveryPageResponse, { query: params, withSession: true });
};
export const recoverySummary = () =>
  apiGet("/api/admin/users/withdrawn/summary", AdminRecoverySummaryResponse, { withSession: true });
export const recoveryPreview = (userId: number) =>
  apiGet(`/api/admin/users/${userId}/restore-preview`, AdminRecoveryPreviewResponse, { withSession: true });

export const inquiryNeighbors = (target: AdminInquiryTarget, query: string) =>
  apiGet(`${inquiryPath(target)}/neighbors`, AdminInquiryNeighborsResponse, {
    query: new URLSearchParams(query),
    withSession: true,
  });
