import Link from "next/link";

import { Icon } from "./icons/Icon";

import { OPERATOR } from "@/components/legal/operator";
import { INSTAGRAM_URL } from "@/lib/seo/site";

/** 화면 맨 아래의 약관 링크와 연락처. 홈과 큐레이션 상세가 함께 쓴다. */
export function SiteFooter() {
  return (
    <footer className="flex flex-col items-center gap-2 bg-surface-subtle px-4 py-9 text-center text-[11px] text-text-secondary">
      <p className="flex items-center justify-center gap-2">
        <Link href="/privacy" className="underline">
          개인정보 처리방침
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms" className="underline">
          이용약관
        </Link>
      </p>

      <ul className="flex items-center gap-2">
        <li>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${OPERATOR.serviceName} 인스타그램 (새 창)`}
            className="flex size-9 items-center justify-center"
          >
            <Icon name="instagram" size={18} />
          </a>
        </li>
        <li>
          <a
            href={`mailto:${OPERATOR.officer.email}`}
            aria-label={`${OPERATOR.serviceName} 에 메일 보내기`}
            className="flex size-9 items-center justify-center"
          >
            <Icon name="mail" size={18} />
          </a>
        </li>
      </ul>

      <p className="text-[10px]">
        당신의 피부를 생각하는 {OPERATOR.name} <span aria-hidden="true">💗</span>
      </p>
    </footer>
  );
}
