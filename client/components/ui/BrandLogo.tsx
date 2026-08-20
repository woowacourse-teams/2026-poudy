import Image from "next/image";

type BrandLogoProps = {
  readonly name: string;
  readonly imageUrl?: string;
  readonly size?: number;
};

/**
 * 브랜드 로고. 그림이 없으면 이름 첫 글자를 대신 보여 준다.
 * 이름은 옆에 적혀 있으므로 이 자리는 보조 기술에서 감춘다.
 */
export function BrandLogo({ name, imageUrl, size = 40 }: BrandLogoProps) {
  const initial = name.trim().charAt(0);

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-white font-bold text-text-secondary"
    >
      {imageUrl ? (
        <Image src={imageUrl} alt="" width={size} height={size} className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
