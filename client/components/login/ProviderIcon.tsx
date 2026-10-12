import type { OAuthProvider } from "@poudy/api/api.zod";

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

export function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
      />
      <path fill="#FBBC05" d="M6.4 13.91a6 6 0 0 1 0-3.82V7.5H3.06a10 10 0 0 0 0 9l3.34-2.59Z" />
      <path
        fill="#EA4335"
        d="M12 5.97c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.5l3.34 2.59C7.19 7.73 9.4 5.97 12 5.97Z"
      />
    </svg>
  );
}

type ProviderBadgeProps = {
  readonly provider: OAuthProvider;
  readonly size: "small" | "large";
};

const BADGE_SIZES = { small: "size-4", large: "size-7" } as const;
const BADGE_ICON_SIZES = { small: "[&_svg]:size-2.5", large: "[&_svg]:size-4" } as const;

/** 가입한 소셜 계정을 동그란 표식으로 보여 준다. 이름은 옆 글자가 전한다. */
export function ProviderBadge({ provider, size }: ProviderBadgeProps) {
  const shape = `flex shrink-0 items-center justify-center rounded-full ${BADGE_SIZES[size]} ${BADGE_ICON_SIZES[size]}`;

  if (provider === "KAKAO") {
    return (
      <span aria-hidden="true" className={`${shape} bg-[#fee500] text-[#191919]`}>
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
