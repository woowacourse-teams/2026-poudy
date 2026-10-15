import type { OAuthProvider } from "@poudy/api/api.zod";
import Image from "next/image";

export function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 3C5.93 3 1 6.87 1 11.65c0 3.07 2.04 5.76 5.11 7.29l-1.3 4.09c-.1.31.25.56.51.37l4.82-3.2c.61.08 1.23.12 1.86.12 6.07 0 11-3.88 11-8.67S18.07 3 12 3Z"
      />
    </svg>
  );
}

/**
 * 구글 G 로고. 브랜드 가이드의 4색이라 토큰으로 바꿀 수 없어, 색을 코드에 적지 않고 SVG 파일로 둔다
 * (명세 색상 팔레트 '따로 관리하는 색').
 */
export function GoogleIcon() {
  return <Image src="/images/brands/google-g.svg" alt="" width={20} height={20} aria-hidden="true" />;
}

type ProviderBadgeProps = {
  readonly provider: OAuthProvider;
  readonly size: "small" | "large";
};

const BADGE_SIZES = { small: "size-4", large: "size-7" } as const;
const BADGE_ICON_SIZES = { small: "[&>*]:size-2.5", large: "[&>*]:size-4" } as const;

/** 가입한 소셜 계정을 동그란 표식으로 보여 준다. 이름은 옆 글자가 전한다. */
export function ProviderBadge({ provider, size }: ProviderBadgeProps) {
  const shape = `flex shrink-0 items-center justify-center rounded-full ${BADGE_SIZES[size]} ${BADGE_ICON_SIZES[size]}`;

  if (provider === "KAKAO") {
    return (
      <span aria-hidden="true" className={`${shape} bg-kakao-bg text-kakao-fg`}>
        <KakaoIcon />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={`${shape} border border-border bg-background`}>
      <GoogleIcon />
    </span>
  );
}
