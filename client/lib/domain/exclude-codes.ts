import type { ExcludeCodeResponse } from "@poudy/api/api.zod";

import { type ExcludeCode, isExcludeCode } from "./filter";

export type KnownExcludeCodeResponse = ExcludeCodeResponse & { readonly code: ExcludeCode };

/** 서버가 성분군을 새로 정의해도 화면이 모르는 코드는 빠른 필터에 올리지 않는다. */
export const knownExcludeCodes = (excludeCodes: readonly ExcludeCodeResponse[]): readonly KnownExcludeCodeResponse[] =>
  excludeCodes.filter((code): code is KnownExcludeCodeResponse => isExcludeCode(code.code));

/** 디자인의 빠른 필터 문구. API 도 name 을 주지만 화면 문구를 고정하기 위해 여기서 정한다. */
export const EXCLUDE_CODE_LABELS: Record<ExcludeCode, string> = {
  FRAGRANCE_ALLERGENS: "향료/알레르기 성분 제외",
  DRYING_ALCOHOLS: "건조 알코올 제외",
  HARSH_PRESERVATIVES: "자극성 방부제 제외",
  SULFATES: "설페이트 성분 제외",
  CYCLIC_SILICONES: "실리콘 자극원 제외",
  SYNTHETIC_COLORANTS: "합성 색소 제외",
};
