import { Icon } from "./icons/Icon";

import { FooterLink } from "@/components/legal/FooterLink";
import { OPERATOR } from "@/components/legal/operator";
import { INSTAGRAM_URL } from "@/lib/seo/site";

/** 화면 맨 아래의 약관 링크와 연락처. 홈과 큐레이션 상세가 함께 쓴다. */
export function SiteFooter() {
  return (
    <footer className="flex flex-col items-center gap-2 bg-surface-subtle px-4 py-9 text-center text-[11px] text-text-secondary">
      {/*
        밑줄을 빼면 누를 수 있는 자리라는 표시가 사라진다. 손이 닿았을 때 글자색을
        본문색까지 끌어올려 그 자리를 대신 알린다. 자주 누르는 자리가 아니라 색만
        바꾸고 움직이지는 않는다.

        가르는 자리는 가운데점 대신 세로선을 쓴다. 가운데점은 글자 사이에 떠 있어
        두 항목이 한 덩어리로 읽히는데, 세로선은 높이가 있어 경계가 또렷하다.
      */}
      <p className="flex items-center justify-center gap-2.5">
        <FooterLink href="/privacy">개인정보 처리방침</FooterLink>
        <span aria-hidden="true" className="h-2.5 w-px bg-border" />
        <FooterLink href="/terms">이용약관</FooterLink>
      </p>

      {/*
        푸터 글자가 11px 과 10px 이라 아이콘이 작으면 함께 묻힌다. 크기를 키워 또렷하게
        둔다. 누르는 자리는 36px 그대로라 손가락에 넉넉하다.

        옆의 약관 링크와 같은 자리이므로 손이 닿았을 때 색이 진해지는 것도 맞춘다.
        다만 이쪽은 누르는 자리가 36px 이라 누를 때 살짝 줄어드는 것까지 둔다.
        저장 버튼이 쓰는 값과 같다.
      */}
      <ul className="flex items-center gap-4">
        <li>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${OPERATOR.serviceName} 인스타그램 (새 창)`}
            className="footer-icon flex size-9 items-center justify-center"
          >
            <Icon name="instagram" size={26} />
          </a>
        </li>
        <li>
          <a
            href={`mailto:${OPERATOR.officer.email}`}
            aria-label={`${OPERATOR.serviceName} 에 메일 보내기`}
            className="footer-icon flex size-9 items-center justify-center"
          >
            <Icon name="mail" size={26} />
          </a>
        </li>
      </ul>

      <p className="text-[10px]">
        당신의 피부를 생각하는 {OPERATOR.name} <span aria-hidden="true">💗</span>
      </p>
    </footer>
  );
}
