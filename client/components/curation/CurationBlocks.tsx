import type { CurationBlockResponse } from "@poudy/api/api.zod";
import Image from "next/image";

import { CurationFilterBlock } from "./CurationFilterBlock";
import { CurationProductGrid } from "./CurationProductGrid";

type CurationBlocksProps = {
  readonly curationId: number;
  readonly blocks: readonly CurationBlockResponse[];
};

/**
 * 블록 하나의 속.
 *
 * `type` 으로 갈리는 판별 유니온이라, 종류를 하나라도 빠뜨리면 아래 `never` 자리에서
 * 타입 검사가 걸린다. 서버가 블록을 늘렸을 때 화면에서 조용히 빠지지 않는다.
 */
function CurationBlock({
  curationId,
  block,
  first,
}: {
  readonly curationId: number;
  readonly block: CurationBlockResponse;
  readonly first: boolean;
}) {
  switch (block.type) {
    case "IMAGE":
      /*
       * 기획전 이미지는 화면 폭을 꽉 채우고, 높이는 그림의 비율을 따른다. 제품 목록과 달리
       * 이 그림이 기획전의 얼굴이라, 양옆에 흰 띠가 남으면 따로 붙인 삽화처럼 보인다.
       *
       * 어떤 크기로 올라올지 미리 알 수 없어 고정 높이를 줄 수 없다. next/image 는
       * width·height 가 있어야 비율을 잡아 두므로 정사각으로 적고, 실제 비율은 도착한
       * 그림이 정한다.
       */
      return (
        <Image
          src={block.imageUrl}
          alt=""
          width={1080}
          height={1080}
          sizes="(max-width: 480px) 100vw, 448px"
          /*
           * 맨 앞의 이미지는 화면을 열자마자 보이는 가장 큰 요소(LCP)다. 미루지 않고 먼저
           * 받는다. 그 아래의 이미지는 내려 읽을 때 받아도 늦지 않다.
           */
          {...(first ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
          className="h-auto w-full"
        />
      );
    /* 제품 블록은 본문 여백 안쪽에 놓는다. 여백은 이미지가 아니라 여백이 필요한 쪽이 갖는다. */
    case "PRODUCTS":
      return (
        <div className="px-4">
          <CurationProductGrid products={block.products} />
        </div>
      );
    case "PRODUCTS_BY_FILTER":
      return (
        <div className="px-4">
          <CurationFilterBlock
            curationId={curationId}
            blockId={block.id}
            filters={block.filters}
            products={block.products}
          />
        </div>
      );
    default: {
      /* 위에서 모든 종류를 다루었다는 것을 타입으로 붙들어 둔다. */
      const unhandled: never = block;
      return unhandled;
    }
  }
}

/**
 * 큐레이션 본문. 서버가 저장한 순서 그대로 블록을 쌓는다.
 *
 * 블록 사이의 위아래 여백은 서버가 블록마다 지정해 준다. 화면에서 따로 정하지 않고 받은
 * 값을 그대로 적는다. 기획전마다 리듬이 달라, 클라이언트가 한 가지 간격으로 묶으면
 * 기획자가 의도한 숨이 사라진다.
 *
 * 여백은 margin 이 아니라 padding 으로 적는다. margin 은 위아래로 맞닿으면 큰 쪽 하나만
 * 남아, 앞 블록의 아래 여백 24 와 뒤 블록의 위 여백 24 가 48 이 아니라 24 가 된다.
 * 기획자가 블록마다 적은 값이 그대로 더해져야 관리 화면에서 본 간격과 맞는다.
 */
export function CurationBlocks({ curationId, blocks }: CurationBlocksProps) {
  return (
    <>
      {blocks.map((block, index) => (
        <div key={block.id} style={{ paddingTop: block.spacingTop, paddingBottom: block.spacingBottom }}>
          <CurationBlock curationId={curationId} block={block} first={index === 0} />
        </div>
      ))}
    </>
  );
}
