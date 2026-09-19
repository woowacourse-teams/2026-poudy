import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";

import { SITE_NAME } from "@/lib/seo/site";

const APP_STORE_URL = "https://play.google.com/store/apps/details?id=com.poudy.app&pcampaignid=web_share";

/* 둘레의 빈 테두리까지 포함한 크기다. 코드 자체는 이보다 조금 작게 그려진다. */
const QR_SIZE = 132;

/**
 * 넓은 화면의 왼쪽 여백에 서는 안드로이드 앱 설치 안내.
 *
 * 앱은 Play 스토어에만 올라가 있다. iOS 에도 내게 되면 제목과 설명에 적어 둔 조건,
 * 링크의 이름, `APP_STORE_URL` 을 함께 손봐야 한다.
 *
 * 본문은 `--container-md`(448px) 로 폭이 묶여 가운데에 놓이므로, 화면이 넓어질수록
 * 양옆이 빈다. 그 자리에 앱을 알리는 자리를 둔다.
 *
 * `fixed` 로 뷰포트에 붙인다. 본문 흐름 안에 두면 448px 안으로 들어와 본문을 밀어낸다.
 * 스크롤을 따라 남으므로 목록을 한참 내려도 자리를 지킨다.
 *
 * 여백의 아래쪽에 세운다. 본문을 읽어 내려간 뒤에 눈에 들도록 시선이 먼저 닿는
 * 위쪽은 비워 둔다.
 *
 * 1024px 아래에서는 그리지 않는다. 그보다 좁으면 본문 옆에 남는 한쪽 여백이 288px 로
 * 줄어, 패널을 놓으면 본문 카드에 닿을 듯이 붙는다.
 */
export function AppQrPanel() {
  return (
    <aside
      aria-label={`${SITE_NAME} 안드로이드 앱 설치 안내`}
      /*
       * 왼쪽 여백의 가운데에 세운다. 본문은 뷰포트 가운데에 있으므로 그 절반(50%)에서
       * 본문 폭의 절반만큼 왼쪽으로 물러난 곳이 여백의 오른쪽 끝이고, 남은 폭의
       * 가운데가 패널의 자리다.
       *
       * 스크롤을 잠그면 html 에 막대 폭만큼 여백이 붙어 본문이 그만큼 왼쪽으로
       * 옮겨간다. `fixed` 인 이 패널은 따라가지 않으므로 본문과 같은 기준을 쓰도록
       * 오른쪽 끝을 막대 폭만큼 당긴다.
       */
      style={{
        right: "var(--scrollbar-width, 0px)",
        left: 0,
        width: "calc(50% - var(--container-md) / 2)",
      }}
      /*
       * 세로 가운데가 아니라 아래쪽에 둔다. 가운데에 두면 본문에서 먼저 읽는 위쪽과
       * 같은 높이에서 시선을 나눠 가져간다. 아래에 두면 본문을 훑어 내린 뒤에 눈에 든다.
       *
       * 화면 아래를 기준으로 삼되 하단 내비게이션 높이만큼은 띄운다. 내비게이션은 본문
       * 폭 안에만 있어 이 패널과 겹치지는 않지만, 같은 높이에서 끝나면 한 줄로 읽힌다.
       */
      className="fixed bottom-[calc(var(--bottom-navigation-height)+2rem)] z-20 hidden place-items-center px-6 lg:grid"
    >
      <div className="flex w-full max-w-60 flex-col items-center gap-3 text-center">
        <Image src="/logo.png" alt="" width={80} height={89} draggable={false} className="h-9 w-auto select-none" />

        {/*
          제목에서 안드로이드임을 먼저 밝힌다. 지금은 Play 스토어에만 올라가 있어, 조건을
          적지 않으면 iPhone 사용자가 찍어 본 뒤에야 받을 수 없다는 것을 알게 된다.
          시선이 먼저 닿는 자리에 두어 코드를 비추기 전에 읽히게 한다.
        */}
        <p className="text-[15px] font-bold text-text-primary">안드로이드 앱으로 더 편하게</p>

        {/*
          제목이 이미 안드로이드 앱이라고 밝혔으므로 여기서는 되풀이하지 않는다. 앞서
          서비스 이름까지 넣었더니 좁은 여백에서 석 줄로 늘어나 끝줄에 두 글자만 남았다.

          줄바꿈 자리를 직접 정한다. 그대로 두면 `비추면 Play` 까지 첫 줄에 들어가
          `Play 스토어` 가 두 줄에 걸쳐 끊긴다. 한 이름이 갈라지면 눈이 한 번 멈춘다.
          `text-balance` 같은 자동 규칙은 어디서 끊을지 보장하지 않아 쓰지 않는다.
        */}
        <p className="text-[13px] leading-relaxed text-text-secondary">
          {/*
            `<br />` 앞뒤의 줄바꿈은 JSX 가 지워 버려 글자가 `비추면Play` 로 붙는다.
            눈에는 줄이 갈라져 보이지만 낭독기와 번역기는 한 낱말로 받는다.
            공백을 명시해 문장이 그대로 이어지게 한다.
          */}
          휴대전화 카메라로 QR 코드를 비추면 <br />
          Play 스토어로 이동해요.
        </p>

        {/*
          QR 코드는 링크의 내용을 그림으로 옮긴 것이라 화면 낭독기에는 읽어 줄 것이 없다.
          코드를 읽지 못하는 사람도 같은 곳으로 갈 수 있도록 링크로 감싸고, 링크의 이름이
          어디로 가는지 알린다.
        */}
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Google Play 에서 ${SITE_NAME} 앱 받기 (새 창)`}
          className="rounded-2xl border border-border bg-background p-2"
        >
          <QRCodeSVG
            value={APP_STORE_URL}
            size={QR_SIZE}
            /*
             * 기본값인 L 은 복원 능력이 가장 낮다. 화면에서 바로 찍는 코드라 얼룩이나
             * 접힘은 없지만, 반사와 손떨림이 겹치면 한 번에 읽히지 않는다. M 은 코드가
             * 촘촘해지는 대신 그만큼을 견딘다.
             */
            level="M"
            /*
             * 코드 둘레의 빈 테두리. 이 라이브러리는 기본값이 0 이라 따로 주지 않으면
             * 코드가 흰 상자에 꽉 찬다. 규격이 요구하는 4 모듈을 그대로 둔다. 테두리가
             * 없으면 코드와 배경의 경계를 찾지 못해 읽히지 않는 기기가 있다.
             */
            marginSize={4}
            bgColor="transparent"
            /* 본문 글자와 같은 색으로 둔다. 순검정은 이 화면에서 혼자 튄다. */
            fgColor="#202124"
            aria-hidden="true"
            focusable="false"
          />
        </a>
      </div>
    </aside>
  );
}
