import {
  AdminFeedbackPageResponse,
  AdminFeedbackResponse,
  AdminProductRequestPageResponse,
  AdminProductRequestResponse,
  AdminRestoreRequestPageResponse,
  AdminSessionResponse,
  type AdminFeedbackStatusUpdateRequest,
} from "@poudy/api/api.zod";

import { ApiError, apiGet, apiPatch, apiPost } from "./client";

export type AdminRequestStatus = AdminFeedbackStatusUpdateRequest["status"];

const PAGE_SIZE = 20;

const pageQuery = (page: number): URLSearchParams =>
  new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });

export const adminLogin = (username: string, password: string): Promise<void> =>
  apiPost("/api/admin/login", { username, password }, { withSession: true });

export const findAdminSession = (): Promise<AdminSessionResponse> =>
  apiGet("/api/admin/me", AdminSessionResponse, { withSession: true });

export const adminLogout = (): Promise<void> => apiPost("/api/admin/logout", undefined, { withSession: true });

export const findFeedbacks = (page: number): Promise<AdminFeedbackPageResponse> =>
  apiGet("/api/admin/feedbacks", AdminFeedbackPageResponse, { query: pageQuery(page), withSession: true });

export const changeFeedbackStatus = (feedbackId: string, status: AdminRequestStatus): Promise<AdminFeedbackResponse> =>
  apiPatch(`/api/admin/feedbacks/${feedbackId}/status`, AdminFeedbackResponse, { status });

export const findProductRequests = (page: number): Promise<AdminProductRequestPageResponse> =>
  apiGet("/api/admin/product-requests", AdminProductRequestPageResponse, { query: pageQuery(page), withSession: true });

export const changeProductRequestStatus = (
  requestId: string,
  status: AdminRequestStatus,
): Promise<AdminProductRequestResponse> =>
  apiPatch(`/api/admin/product-requests/${requestId}/status`, AdminProductRequestResponse, { status });

export const findRestoreRequests = (page: number): Promise<AdminRestoreRequestPageResponse> =>
  apiGet("/api/admin/members/restore-requests", AdminRestoreRequestPageResponse, {
    query: pageQuery(page),
    withSession: true,
  });

export const restoreMember = (memberId: number): Promise<void> =>
  apiPost(`/api/admin/members/${memberId}/restore`, undefined, { withSession: true });

export const isAdminSignedOut = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 401 || error.status === 403);
