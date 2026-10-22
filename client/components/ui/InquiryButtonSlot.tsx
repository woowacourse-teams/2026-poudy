"use client";

import { usePathname } from "next/navigation";

import { isBottomActionBarPath, isBottomNavigationPath, matchesPathSegment } from "./bottom-navigation-path";
import { InquiryButton, type InquiryButtonLift } from "./InquiryButton";

/**
 * 문의하기 화면에서는 감춘다. 이미 그 화면에 있는데 같은 곳으로 가는 버튼을 둘 이유가 없다.
 * 제품 정보 정정 화면에서는 보여 준다. 그 화면은 정정만 받으므로 다른 문의로 갈 길이 필요하다.
 */
/* 문의하기 안쪽 경로인지 알아야 하는 곳이 늘면 여기서 함께 판단한다. */
export const isInquiryPath = (pathname: string): boolean => matchesPathSegment(pathname, "/inquiry");

const liftFor = (pathname: string): InquiryButtonLift => {
  if (isBottomNavigationPath(pathname)) return "bottom-navigation";
  if (isBottomActionBarPath(pathname)) return "bottom-action-bar";
  return "none";
};

export function InquiryButtonSlot() {
  const pathname = usePathname();

  /* 문의하기 화면에서는 감춘다. 이미 그 안에 있는데 들어가는 버튼을 둘 이유가 없다. */
  if (
    isInquiryPath(pathname) ||
    matchesPathSegment(pathname, "/login") ||
    matchesPathSegment(pathname, "/signup") ||
    matchesPathSegment(pathname, "/admin")
  )
    return null;

  return <InquiryButton lift={liftFor(pathname)} />;
}
