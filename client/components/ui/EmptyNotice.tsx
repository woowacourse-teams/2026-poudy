import Image from "next/image";

import { Icon } from "./icons/Icon";

import type { IconId } from "@/components/ui/icons/sprite";

type EmptyNoticeProps = {
  readonly icon: IconId;
  /**
   * 아이콘 대신 세울 그림. 화면 전체가 비는 자리처럼 한마디 더 건네고 싶을 때 쓴다.
   * 주면 아이콘은 그리지 않는다.
   */
  readonly image?: { readonly src: string; readonly size: number };
  readonly title: string;
  /** 무엇을 하면 채워지는지 덧붙인다. 제목만으로 뜻이 서면 두지 않는다. */
  readonly detail?: string;
  /**
   * 화면 전체가 비어 있을 때는 크게 둔다.
   *
   * 섹션 하나가 빈 것과 화면이 통째로 빈 것은 무게가 다르다. 뒤엣것은 그 화면에서
   * 유일하게 읽을 거리라, 섹션용 크기로 두면 넓은 여백에 파묻힌다.
   */
  readonly size?: "section" | "screen";
  /**
   * 옆이나 위에 선 카드와 높이를 맞춰야 하는 자리에 쓴다.
   * 덧붙이는 말이 없으면 자리가 줄어 한쪽만 주저앉아 보인다.
   */
  readonly className?: string;
};

const SIZE = {
  section: { box: "gap-1.5 px-4 py-6", icon: 20, title: "text-[13px]", detail: "text-[11px]" },
  screen: { box: "gap-2 px-4 py-10", icon: 28, title: "text-[15px]", detail: "text-[12px]" },
} as const;

/**
 * 아직 아무것도 담기지 않은 자리.
 *
 * 채운 회색은 카드처럼 보여 무언가 담긴 자리로 읽힌다. 실제로는 비어 있다는 뜻이므로
 * 배경을 비우고 점선 테두리만 둘러 안이 비었다는 것을 모양으로 드러낸다.
 *
 * 선이 끊겨 있어 같은 색이라도 이어진 선보다 흐리게 읽힌다.
 * `--color-border`(1.21:1) 로는 거의 보이지 않아 칩 테두리와 같은 값을 쓴다.
 *
 * 무엇이 없는지만 말하지 않고 무엇을 하면 채워지는지를 함께 둔다.
 */
export function EmptyNotice({ icon, image, title, detail, size = "section", className = "" }: EmptyNoticeProps) {
  const shape = SIZE[size];

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D1D3D8] ${
        /* 그림에는 둘레 여백이 이미 들어 있어 사이를 더 띄우면 문구가 멀어 보인다. */
        image ? shape.box.replace(/gap-\S+/, "gap-0") : shape.box
      } ${className}`}
    >
      {image ? (
        /*
         * 그리는 크기의 두 배를 적는다. next/image 는 1 배와 2 배 사본만 만들어,
         * 그대로 적으면 3 배 화면이 작은 사본을 늘려 쓰며 가장자리가 뭉갠다.
         */
        <Image
          src={image.src}
          alt=""
          width={image.size * 2}
          height={image.size * 2}
          style={{ width: image.size, height: image.size }}
        />
      ) : (
        <Icon name={icon} size={shape.icon} className="text-text-secondary" />
      )}
      {/*
        아이콘·그림과 같은 결로 낮춘다. 비어 있다는 것을 알리는 자리라 옆의 그림보다
        글자가 진하면 둘이 한 덩어리로 읽히지 않고 문구가 먼저 튀어나온다.
      */}
      <p className={`font-semibold text-text-secondary ${shape.title}`}>{title}</p>
      {/* 덧붙일 말이 없으면 빈 문단이 남지 않게 아예 그리지 않는다. */}
      {detail ? <p className={`text-center text-text-secondary ${shape.detail}`}>{detail}</p> : null}
    </div>
  );
}
