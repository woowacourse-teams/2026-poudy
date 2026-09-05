"use client";

import { useRouter } from "next/navigation";

/*
 * 체크만 따로 그린다. 공용 Icon 은 스프라이트를 <use> 로 가리켜 안쪽 path 에
 * pathLength 를 줄 수 없다. 획이 그려지는 움직임은 이 화면에만 쓴다.
 */
function DrawnCheck() {
  return (
    <svg
      width={30}
      height={30}
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
export function InquiryDone({ description }: { readonly description: string }) {
  const router = useRouter();

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
          onClick={() => router.back()}
          className="w-full rounded-xl bg-action py-4 text-[14px] font-bold text-action-text"
        >
          확인
        </button>
      </div>
    </>
  );
}
