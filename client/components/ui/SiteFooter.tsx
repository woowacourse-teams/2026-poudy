"use client";

import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";

import { FooterLink } from "@/components/legal/FooterLink";
import { OPERATOR } from "@/components/legal/operator";
import { INSTAGRAM_URL } from "@/lib/seo/site";

/**
 * 푸터의 소셜 링크(명세 APP · 푸터 nyVjE). 회색 바탕 위의 흰 원(36)에 보조색 아이콘(20)을 얹는다.
 * hover · 눌림은 원을 한 단계 진한 면(fb-border)으로 바꾸고, 누를 때는 원째로 살짝 가라앉는다(press-scale).
 */
function SocialLink({
  href,
  label,
  icon,
  external,
}: {
  readonly href: string;
  readonly label: string;
  readonly icon: "instagram" | "mail";
  readonly external?: boolean;
}) {
  const { pressableProps } = usePressable();

  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      aria-label={label}
      {...pressableProps}
      className="pressable fb-border press-scale flex size-9 items-center justify-center rounded-full bg-background text-text-secondary"
    >
      <Icon name={icon} size={20} />
    </a>
  );
}

/**
 * 화면 맨 아래의 서비스 소개·공지·약관 링크와 연락처(명세 APP · 푸터 nyVjE). 홈과 큐레이션 상세, 서비스 소개가 함께 쓴다.
 *
 * 아이콘 묶음과 글자 묶음, 두 덩어리를 32 띄우고 위아래도 32 를 둔다. 글자는 모두 label(11) 보조색이다.
 * '공지사항' 링크는 명세에 아직 없지만 공지 기능이 더한 것이라 둔다.
 */
export function SiteFooter() {
  return (
    <footer className="flex flex-col items-center gap-8 bg-surface px-4 py-8 text-center text-label leading-snug text-text-secondary">
      <ul className="flex items-center gap-6">
        <li>
          <SocialLink
            href={INSTAGRAM_URL}
            external
            label={`${OPERATOR.serviceName} 인스타그램 (새 창)`}
            icon="instagram"
          />
        </li>
        <li>
          <SocialLink
            href={`mailto:${OPERATOR.officer.email}`}
            label={`${OPERATOR.serviceName} 에 메일 보내기`}
            icon="mail"
          />
        </li>
      </ul>

      {/* 글자 두 줄은 8 띄워 한 덩어리로 묶는다. 링크 사이는 8 이고 높이 10 세로선으로 가른다. */}
      <div className="flex flex-col items-center gap-2">
        <p className="flex flex-wrap items-center justify-center gap-2">
          <FooterLink href="/about">서비스 소개</FooterLink>
          <span aria-hidden="true" className="h-2.5 w-px bg-border" />
          <FooterLink href="/notices">공지사항</FooterLink>
          <span aria-hidden="true" className="h-2.5 w-px bg-border" />
          <FooterLink href="/privacy">개인정보 처리방침</FooterLink>
          <span aria-hidden="true" className="h-2.5 w-px bg-border" />
          <FooterLink href="/terms">이용약관</FooterLink>
        </p>
        <p>
          당신의 피부를 생각하는 {OPERATOR.name} <span aria-hidden="true">💗</span>
        </p>
      </div>
    </footer>
  );
}
