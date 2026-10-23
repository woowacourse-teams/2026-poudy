import { getImageProps } from "next/image";

type Source = {
  readonly src: string;
  /** 화면에 그리는 크기(px). 파일은 이 크기의 2배로 내보내 두었다. */
  readonly width: number;
  readonly height: number;
};

type SnippetImageProps = {
  /** 화면 조각이 무엇을 보여 주는지. 조각 안의 글자를 읽을 수 없는 사람에게 같은 내용을 전한다. */
  readonly alt: string;
  /** 모바일(600px 미만)에 쓰는 그림. 태블릿 그림이 없으면 태블릿에서도 쓴다. */
  readonly narrow: Source;
  /** 태블릿(600~1023px)에 쓰는 그림. */
  readonly tablet?: Source;
  /** 데스크톱(1024px 이상)에 쓰는 그림. 없으면 좁은 그림을 그대로 쓴다. */
  readonly wide?: Source;
  /** 첫 화면에 보이는 그림이면 먼저 받는다. */
  readonly eager?: boolean;
  readonly className?: string;
};

/*
 * 화면 크기에 따라 다른 그림을 고른다. 같은 조각이라도 디자인(S56-M·T·D)에서 칸 폭이 달라 조각 안의
 * 줄바꿈과 크기가 다르다. 그림 하나를 늘이고 줄이면 조각 안 글자가 화면마다 다른 크기로 보인다.
 *
 * `next/image` 의 `Image` 는 그림을 하나만 받는다. 화면 폭에 따라 고르려면 `picture` 의 `source` 를
 * 써야 하므로 `getImageProps` 로 속성을 만들어 직접 그린다(Next.js 권장 방식).
 */
export function SnippetImage({ alt, narrow, tablet, wide, eager = false, className }: SnippetImageProps) {
  const loading = eager ? "eager" : "lazy";
  const { props: fallback } = getImageProps({ alt, ...narrow, loading, fetchPriority: eager ? "high" : "auto" });
  const tabletProps = tablet ? getImageProps({ alt, ...tablet }).props : undefined;
  const wideProps = wide ? getImageProps({ alt, ...wide }).props : undefined;

  return (
    <picture className="contents">
      {wide && wideProps ? (
        <source
          media="(min-width: 1024px)"
          srcSet={wideProps.srcSet ?? wideProps.src}
          width={wide.width}
          height={wide.height}
        />
      ) : null}
      {tablet && tabletProps ? (
        <source
          media="(min-width: 600px)"
          srcSet={tabletProps.srcSet ?? tabletProps.src}
          width={tablet.width}
          height={tablet.height}
        />
      ) : null}
      {/* picture 로 화면별 그림을 고르려면 img 를 직접 둔다. */}
      <img {...fallback} alt={alt} draggable={false} className={className} />
    </picture>
  );
}
