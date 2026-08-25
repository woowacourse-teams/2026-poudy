import { Icon } from "./icons/Icon";

type CheckMarkProps = {
  readonly checked: boolean;
};

/**
 * 고른 것을 나타내는 네모 표시. 브랜드·성분·유수분 시트가 함께 쓴다.
 *
 * 크기는 옆에 서는 글자에 맞춘다. 글자보다 크면 표시가 먼저 눈에 들어와 무엇을 고르는
 * 자리인지보다 표시가 도드라진다. 체크는 얇게 그어 작은 네모 안에서 뭉치지 않게 한다.
 *
 * 누르는 일은 이 표시를 감싸는 쪽이 맡는다. 여기서는 보이는 것만 그린다.
 */
export function CheckMark({ checked }: CheckMarkProps) {
  return (
    <span
      className={`flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors duration-control-state ease-standard motion-reduce:transition-none ${
        checked ? "border-[#212124] bg-[#212124]" : "border-[#B9BDC5] bg-white"
      }`}
    >
      {checked ? <Icon name="check" size={11} strokeWidth={1.5} className="text-white" /> : null}
    </span>
  );
}
