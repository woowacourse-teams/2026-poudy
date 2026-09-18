import { type ReactNode, Suspense } from "react";

type StreamBoundaryProps = {
  /** 거짓이면 경계 없이 그려, 이 자리의 데이터가 올 때까지 응답을 보내지 않는다. */
  readonly stream: boolean;
  readonly fallback: ReactNode;
  readonly children: ReactNode;
};

/**
 * 스트리밍할 때만 Suspense 경계를 건다.
 *
 * 목록의 뒤쪽 장(`?page=N`)은 거의 크롤러가 찾아온다. 스트리밍하면 본문이 뼈대 뒤에 숨은
 * 조각으로 와서 스크립트를 돌려야 제자리에 들어가므로, 이런 요청은 다 그린 HTML 한 벌로 보낸다.
 */
export function StreamBoundary({ stream, fallback, children }: StreamBoundaryProps) {
  if (!stream) return children;
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
