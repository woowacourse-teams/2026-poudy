import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";

import { OPEN_APP_PATH } from "@/lib/navigation/open-app";
import { absoluteUrl, SITE_NAME } from "@/lib/seo/site";

/* 둘레의 빈 테두리까지 포함한 크기다. 코드 자체는 이보다 조금 작게 그려진다. */
const QR_SIZE = 132;

/**
 * 넓은 화면의 왼쪽 여백에 서는 안드로이드 앱 설치 안내.
 *
 * 앱은 Play 스토어에만 올라가 있다. iOS 에도 내게 되면 제목과 설명에 적어 둔 조건,
 * 링크의 이름, `resolveOpenAppDestination` 을 함께 손봐야 한다.
 *
 * QR 코드에는 스토어가 아니라 우리 주소(`OPEN_APP_PATH`)를 담는다. 스토어 주소는 구글
 * 도메인이라 앱이 깔려 있어도 스토어가 열린다. 우리 주소는 App Links 가 앱으로 넘기고,
 * 앱이 없으면 그 화면이 스토어로 보낸다.
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
  const openAppUrl = absoluteUrl(OPEN_APP_PATH);

  return (
    <aside
      aria-label={`${SITE_NAME} 안드로이드 앱 설치 안내`}
      /*
       * 왼쪽 여백의 가운데에 세운다. 본문은 뷰포트 가운데에 있으므로 그 절반(50%)에서
       * 본문 폭의 절반만큼 왼쪽으로 물러난 곳이 여백의 오른쪽 끝이고, 남은 폭의
       * 가운데가 패널의 자리다.
       */
      style={{
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
      className="fixed bottom-[calc(var(--bottom-navigation-height)+2rem)] z-20 hidden place-items-center px-4 lg:grid"
    >
      <div className="flex w-full max-w-64 flex-col items-center gap-3 text-center">
        <Image src="/logo.webp" alt="" width={226} height={296} draggable={false} className="h-9 w-auto select-none" />

        {/*
          제목에서 안드로이드임을 먼저 밝힌다. 지금은 Play 스토어에만 올라가 있어, 조건을
          적지 않으면 iPhone 사용자가 찍어 본 뒤에야 받을 수 없다는 것을 알게 된다.
          시선이 먼저 닿는 자리에 두어 코드를 비추기 전에 읽히게 한다.
        */}
        <p className="text-[15px] font-bold text-text-primary">안드로이드 앱으로 더 편하게</p>

        {/* QR 스캔과 스토어 검색을 두 줄로 안내하되, 낭독할 때는 공백으로 이어 읽는다. */}
        <p className="text-[13px] leading-relaxed whitespace-nowrap text-text-secondary">
          QR 코드를 스캔하거나 <br />
          플레이 스토어에서 ‘파우디’를 검색해 보세요.
        </p>

        {/*
          QR 코드는 링크의 내용을 그림으로 옮긴 것이라 화면 낭독기에는 읽어 줄 것이 없다.
          코드를 읽지 못하는 사람도 같은 곳으로 갈 수 있도록 링크로 감싸고, 링크의 이름이
          어디로 가는지 알린다.
        */}
        <a
          href={openAppUrl}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Google Play 에서 ${SITE_NAME} 앱 받기 (새 창)`}
          className="rounded-2xl border border-border bg-background p-2"
        >
          <QRCodeSVG
            value={openAppUrl}
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
