import { Icon } from "./icons/Icon";

import { FooterLink } from "@/components/legal/FooterLink";
import { OPERATOR } from "@/components/legal/operator";
import { INSTAGRAM_URL } from "@/lib/seo/site";

/** 화면 맨 아래의 약관 링크와 연락처. 홈과 큐레이션 상세가 함께 쓴다. */
export function SiteFooter() {
  return (
    /*
      아이콘 묶음과 글자 묶음, 두 덩어리로 나누고 그 사이를 푸터 위 여백과 같게 둔다.
      줄마다 폭이 넓고 좁고 넓으면 푸터 윤곽이 가운데에서 움푹 들어가 보이므로,
      위에서 아래로 갈수록 넓어지게 세운다.
    */
    <footer className="flex flex-col items-center gap-9 bg-surface-subtle px-4 py-9 text-center text-[11px] text-text-secondary">
      {/*
        푸터 글자가 11px 이라 아이콘이 작으면 함께 묻힌다. 회색 원 위에 흰 그림을 얹어
        덩어리로 세운다. 누르는 자리는 36px 그대로라 손가락에 넉넉하다.
      */}
      <ul className="flex items-center gap-6">
        <li>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${OPERATOR.serviceName} 인스타그램 (새 창)`}
            className="footer-icon flex size-9 items-center justify-center rounded-full bg-[#C4C4C4] text-white"
          >
            <Icon name="instagram" size={20} />
          </a>
        </li>
        <li>
          <a
            href={`mailto:${OPERATOR.officer.email}`}
            aria-label={`${OPERATOR.serviceName} 에 메일 보내기`}
            className="footer-icon flex size-9 items-center justify-center rounded-full bg-[#C4C4C4] text-white"
          >
            <Icon name="mail" size={20} />
          </a>
        </li>
      </ul>

      {/*
        글자 두 줄은 한 덩어리로 묶는다. 서로 가까이 붙여 두어야 아이콘과 글자가
        두 묶음으로 갈리고, 그 사이가 푸터 위 여백과 같은 간격으로 벌어진다.
      */}
      <div className="flex flex-col items-center gap-2">
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

        {/* 푸터 글자는 11px 하나로 맞춘다. 이 줄만 작으면 마무리 인사가 흐릿하게 물러나 보인다. */}
        <p>
          당신의 피부를 생각하는 {OPERATOR.name} <span aria-hidden="true">💗</span>
        </p>
      </div>
    </footer>
  );
}
