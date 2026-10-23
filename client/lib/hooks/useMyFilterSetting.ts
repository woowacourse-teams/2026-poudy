"use client";

import { useState } from "react";

import type { ListSurface } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { MyFilterStatus } from "@/lib/hooks/useMyFilterStatus";
import { writeMyFilterOn } from "@/lib/storage/my-filter-setting";

type MyFilterSurface = "ingredient_search" | ListSurface;

/**
 * 나만의 필터 설정(켬·끔). 처음 값은 서버 컴포넌트가 쿠키에서 읽어 넘긴 값이다. 서버 HTML 과 첫 그리기가 같은 값을 본다.
 * 서버가 쿠키를 읽지 않는 정적 페이지는 클라이언트에서만 그리므로 readMyFilterOn 을 넘긴다.
 * 켜고 끄면 쿠키에 남기고 분석 이벤트를 보낸다. surface 는 어느 화면에서 바꿨는지, status 는 그때의 회원 상태다.
 */
export const useMyFilterSetting = (
  initialOn: boolean | (() => boolean),
  { surface, status }: { readonly surface: MyFilterSurface; readonly status: MyFilterStatus },
) => {
  const [on, setOn] = useState(initialOn);

  /** 켜고 끄면 쿠키에 남기고 my_filter_toggled 를 보낸다. 칩과 스위치는 필터에 성분이 있는 회원만 바꿀 수 있다. */
  const change = (next: boolean) => {
    writeMyFilterOn(next);
    setOn(next);
    track("my_filter_toggled", {
      action: next ? "on" : "off",
      surface,
      ingredient_count: status.status === "ready" ? status.count : 0,
    });
  };

  return { on, change };
};

/**
 * 이번 목록 요청에 나만의 필터를 적용할지. 설정이 켬이고 회원 세션이 있을 때다.
 * 회원 상태를 읽기 전에는 서버 컴포넌트가 세션 쿠키로 정한 값(serverApplied)을 써서, 서버가 그린 첫 장을 그대로 잇는다.
 * 목록이 401 을 받았으면(sessionLost) 이번 목록에만 적용하지 않고 설정은 그대로 둔다.
 */
export const myFilterRequested = ({
  on,
  status,
  serverApplied,
  sessionLost = false,
}: {
  readonly on: boolean;
  readonly status: MyFilterStatus;
  readonly serverApplied: boolean;
  readonly sessionLost?: boolean;
}): boolean => {
  if (!on || sessionLost) return false;
  if (status.status === "loading") return serverApplied;
  return status.status === "ready";
};
