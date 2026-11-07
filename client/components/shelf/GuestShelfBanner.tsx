"use client";

import { Button } from "@poudy/design-system/button";
import { Icon } from "@poudy/design-system/icon";

type GuestShelfBannerProps = {
  /** 이 탭에 담아 둔 제품 수 */
  readonly count: number;
  readonly onLogin: () => void;
};

/**
 * 비로그인 파우치 위의 안내. 로그인하지 않고 나가면 담은 제품이 사라지고, 로그인해야 파우치에 남는다고 알린다.
 */
export function GuestShelfBanner({ count, onLogin }: GuestShelfBannerProps) {
  return (
    <div className="px-gutter pb-4">
      <div role="note" className="flex items-center gap-3 rounded-2xl bg-brand-soft p-4">
        <Icon name="alert-circle" size={20} className="shrink-0 text-brand-text" />
        <p className="min-w-0 flex-1 break-keep text-body-sm leading-normal text-text-primary">
          {`로그인하지 않고 나가면 담은\u00a0${count}개가\u00a0사라져요.`}
          <br />
          로그인해야 파우치에 남아요.
        </p>
        <Button size="sm" className="shrink-0" onClick={onLogin}>
          로그인
        </Button>
      </div>
    </div>
  );
}
