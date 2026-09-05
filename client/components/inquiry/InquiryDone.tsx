"use client";

import { useRouter } from "next/navigation";

import { hasInSiteHistory } from "@/lib/navigation/history-depth";

/*
 * 체크만 따로 그린다. 공용 Icon 은 스프라이트를 <use> 로 가리켜 안쪽 path 에
 * pathLength 를 줄 수 없다. 획이 그려지는 움직임은 이 화면에만 쓴다.
 */
function DrawnCheck() {
  return (
    <svg
      width={38}
      height={38}
      /*
       * 시각 보정. 체크는 아래로 뻗은 획이 짧고 위로 올라가는 획이 길어,
       * 자를 대고 가운데에 두면 위로 떠 보인다. 조금 내려 눈에 맞춘다.
       */
      className="translate-y-[1.5px]"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/*
       * Lucide 의 체크는 오른쪽 위에서 시작해 왼쪽 아래로 끝난다. 그대로 그리면
       * 획이 오른쪽부터 생기므로, 점을 뒤집어 왼쪽 아래에서 시작하게 한다.
       * 손으로 체크를 그을 때와 같은 차례다.
       *
       * 길이를 1 로 맞춰 두어 좌표와 무관하게 끊는 셈이 맞는다.
       */}
      <path d="M4 12 9 17 20 6" pathLength={1} strokeDasharray={1} className="animate-check-draw" />
    </svg>
  );
}

/**
 * 접수만 됐다는 사실을 전한다. 이 API 들은 답장을 돌려주지 않으므로
 * 답변이나 반영 시점을 약속하는 문구를 쓰지 않는다.
 */
export function InquiryDone({
  description,
  originPath,
}: {
  readonly description: string;
  /** 문의를 연 화면의 경로. 돌아갈 곳을 정할 때 먼저 본다. */
  readonly originPath?: string;
}) {
  const router = useRouter();

  /*
   * 돌아갈 곳을 세 단계로 고른다.
   *
   * originPath 를 먼저 보는 까닭은 이 값이 `이 문의를 어디서 시작했는가` 를 그대로
   * 담고 있기 때문이다. 방문 기록은 문의 화면에 들어오기까지 거친 자리를 가리키므로,
   * 중간에 다른 화면을 들렀다면 시작한 곳과 어긋난다.
   *
   * 기록을 늘리지 않도록 replace 로 옮긴다. 옮긴 뒤 뒤로 가도 접수 화면으로
   * 돌아오지 않는다.
   */
  const goBack = () => {
    if (originPath && originPath !== "/inquiry") {
      router.replace(originPath);
      return;
    }

    if (hasInSiteHistory()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
          <DrawnCheck />
        </span>

        <h2 className="text-[20px] font-bold text-text-primary">문의를 접수했어요</h2>
        <p className="text-[13px] text-text-secondary">{description}</p>
      </div>

      <div className="sticky bottom-0 bg-background px-8 pb-6 pt-3">
        <button
          type="button"
          onClick={goBack}
          className="w-full rounded-xl bg-action py-4 text-[14px] font-bold text-action-text"
        >
          확인
        </button>
      </div>
    </>
  );
}
