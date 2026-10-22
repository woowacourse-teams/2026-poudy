import Image from "next/image";

/*
 * 선반 소개의 2D 그림(명세 S54a~S54d). 명세(poudy-ui.pen)의 벡터 그림을 3배로 내보낸 webp 다.
 * 그림은 글이 이미 하는 말을 거드는 장식이라 대체 텍스트를 비워 보조 기술에서 감춘다.
 */
const ILLUSTRATIONS = {
  /** 선반 위 제품들. 써 본 화장품을 기억한다. */
  record: "/images/shelf/record.webp",
  /** 돋보기로 성분 목록을 본다. 공통 성분의 힌트를 찾는다. */
  ingredientHint: "/images/shelf/ingredient-hint.webp",
  /** 체크한 가방. 내 기준으로 고른다. */
  myPick: "/images/shelf/my-pick.webp",
  /** 자물쇠. 나만 보는 선반이다. */
  privacy: "/images/shelf/privacy.webp",
  /** 휴대폰에서 제품을 담는다(사용 방법 1). */
  howToAdd: "/images/shelf/how-to-add.webp",
  /** 엄지 위·아래(사용 방법 2). */
  howToRate: "/images/shelf/how-to-rate.webp",
  /** 두 제품의 성분을 견준다(사용 방법 3). */
  howToCheck: "/images/shelf/how-to-check.webp",
} as const;

export type ShelfIllustrationName = keyof typeof ILLUSTRATIONS;

type ShelfIllustrationProps = {
  readonly name: ShelfIllustrationName;
  /** 그리는 크기(px). 명세의 48 · 68 · 76 중 하나다. */
  readonly size: 48 | 68 | 76;
};

const SIZE_CLASS = { 48: "size-12", 68: "size-17", 76: "size-19" } as const;

export function ShelfIllustration({ name, size }: ShelfIllustrationProps) {
  return (
    <Image
      src={ILLUSTRATIONS[name]}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`${SIZE_CLASS[size]} shrink-0 select-none`}
    />
  );
}
