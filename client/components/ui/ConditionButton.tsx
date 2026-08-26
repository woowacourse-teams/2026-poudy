"use client";

type ConditionButtonProps = {
  readonly kind: "include" | "exclude";
  readonly active: boolean;
  readonly onClick: () => void;
  /** 어느 성분의 조건인지 읽히게 한다. */
  readonly ingredientName: string;
};

/**
 * 디자인의 포함·제외 버튼. 고른 쪽만 채워진다.
 * 포함은 검정, 제외는 빨강으로 서로 다른 뜻임을 색으로도 알린다.
 *
 * 제외의 빨강은 Tailwind red 계열을 쓴다. 채움은 흰 글자를 얹는 자리라 red-600 을
 * 쓴다(4.77:1). red-500 은 3.81:1, red-400 은 2.89:1 로 둘 다 4.5:1 에 못 미친다.
 * 빠른 필터의 체크 네모도 같은 red-600 이라 화면 안에서 제외의 빨강이 하나로 읽힌다.
 *
 * 색은 누른 쪽에만 쓴다. 누르기 전에는 둘 다 같은 회색 테두리로 둔다. 포함과 제외는
 * 나란히 놓인 대등한 선택지라, 한쪽만 미리 붉게 두면 이미 눌린 것처럼 보이고
 * 그쪽을 고르라고 미는 것으로 읽힌다.
 *
 * 그 회색은 필터 칩이 쓰는 것과 같은 값이다. 누르기 전 테두리는 여기 누를 것이
 * 있다는 윤곽일 뿐이라, 옆에 선 성분 이름보다 먼저 눈에 들어오면 안 된다.
 */
export function ConditionButton({ kind, active, onClick, ingredientName }: ConditionButtonProps) {
  const label = kind === "include" ? "포함" : "제외";
  const activeStyle = kind === "include" ? "border-[#212124] bg-[#212124]" : "border-red-600 bg-red-600";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${ingredientName} ${label}`}
      className={`h-8 w-12 shrink-0 rounded-2xl border text-[12px] ${
        active ? `${activeStyle} font-bold text-white` : "border-[#D1D3D8] bg-white font-semibold text-[#212124]"
      }`}
    >
      {label}
    </button>
  );
}
