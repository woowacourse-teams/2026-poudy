import { BrandMark } from "./brand-mark";
import { BrandNameEnd } from "./brand-title";

type BrandHeroProps = {
  readonly name: string;
  readonly englishName?: string | null;
  readonly imageUrl?: string | null;
};

/*
 * 머리의 자리(명세 S30 '브랜드 히어로'). 본문 위 12 · 좌우 거터(LAYOUT L09), 아래 칩 줄까지 12.
 * 본문 위아래 여백은 이 머리가 화면의 첫 내용이라 여기서 맡는다.
 */
const FRAME = "px-gutter py-3";
/* 회색 면(radius 2xl), 안쪽 위아래 20 · 좌우 16. 로고와 이름 사이 12, 이름과 영문명 사이 4. */
const CARD = "flex flex-col items-center gap-3 rounded-2xl bg-surface px-4 py-5";

/**
 * 브랜드 상세의 머리. 가운데에 원형 로고 56, 브랜드명(h1), 영문명을 둔다.
 *
 * 제품 수는 바로 아래 목록 머리('총 N개')와 겹쳐 두지 않는다. 브랜드명이 바 아래로 가려지면 바 제목이
 * 로고와 브랜드명으로 바뀌므로(BrandBarTitle), 이름 아래 끝에 그 경계를 둔다.
 */
export function BrandHero({ name, englishName, imageUrl }: BrandHeroProps) {
  return (
    <section className={FRAME}>
      <div className={CARD}>
        <BrandMark name={name} imageUrl={imageUrl} size="hero" loading="eager" />
        <div className="flex w-full flex-col items-center gap-1 text-center">
          <h1 className="relative text-hero font-bold break-keep text-text-primary">
            {name}
            <BrandNameEnd />
          </h1>
          {englishName ? <p className="text-caption font-medium text-text-secondary">{englishName}</p> : null}
        </div>
      </div>
    </section>
  );
}
