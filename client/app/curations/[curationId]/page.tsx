import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TrackView } from "@/components/analytics/TrackView";
import { CurationBlocks } from "@/components/curation/CurationBlocks";
import { OtherCurations } from "@/components/curation/OtherCurations";
import { JsonLd } from "@/components/seo/JsonLd";
import { HidingTopBar } from "@/components/ui/HidingTopBar";
import { ShareButton } from "@/components/ui/ShareButton";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ApiError } from "@/lib/api/client";
import { fetchCuration, fetchCurations } from "@/lib/api/products";
import { curationOneLine } from "@/lib/domain/curation-text";
import { OPEN_GRAPH_BASE } from "@/lib/seo/metadata";
import { SITE_DESCRIPTION } from "@/lib/seo/site";
import { breadcrumbList } from "@/lib/seo/structured-data";

const load = async (raw: string) => {
  const curationId = Number(raw);
  if (!Number.isInteger(curationId)) notFound();

  try {
    return await fetchCuration(curationId);
  } catch (error) {
    /* 없는 기획전이거나 게시 중이 아니면 서버가 404 를 준다. 둘 다 이 화면에는 없는 것이다. */
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
};

export async function generateMetadata(props: PageProps<"/curations/[curationId]">): Promise<Metadata> {
  const { curationId } = await props.params;

  // 여기서 notFound() 를 부르면 렌더링 경로 밖이라 404 상태가 전해지지 않는다.
  // 조회에 실패해도 canonical 은 남긴다.
  const canonical = `/curations/${curationId}`;

  try {
    const curation = await fetchCuration(Number(curationId));
    const title = curationOneLine(curation.title);
    const { description } = curation;
    /*
     * 공유 카드에는 사이트 기본 그림을 쓴다.
     *
     * 기획전 이미지는 세로로 긴 안내서인 경우가 많아, 가로로 자르는 공유 카드에서는 가운데
     * 띠만 남고 제목 글자가 잘려 나간다. 표지로 쓸 썸네일을 상세 응답이 주게 되면 그때 바꾼다.
     *
     * openGraph 를 적으면 루트 값이 통째로 바뀌므로 그림을 빼먹으면 미리보기가 비어 나간다.
     */
    const image = { url: "/opengraph-image", alt: SITE_DESCRIPTION };
    /*
     * 공유 카드의 제목에는 어떤 화면인지를 덧붙인다. 기획전 제목만 두면 링크를 받은 사람이
     * 무슨 페이지인지 알기 어렵다. 문서 제목은 템플릿이 사이트 이름을 이미 붙이므로 그대로 둔다.
     */
    const shareTitle = `${title} | 파우디 큐레이션`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { ...OPEN_GRAPH_BASE, title: shareTitle, description, url: canonical, images: [image] },
      twitter: { card: "summary_large_image", title: shareTitle, description, images: [image] },
    };
  } catch {
    return { alternates: { canonical } };
  }
}

export default async function CurationDetailPage(props: PageProps<"/curations/[curationId]">) {
  const { curationId } = await props.params;
  /* 이어 볼 목록은 본문과 함께 받는다. 받지 못해도 본문은 그대로 보여 주고 목록만 비운다. */
  const [curation, list] = await Promise.all([load(curationId), fetchCurations().catch(() => ({ items: [] }))]);

  return (
    <>
      {/*
        기획전 이름을 바에 둔다. 바로 아래에 기획전 이미지가 붙어야 첫 화면이 그림으로 열리므로
        본문에 제목을 따로 세우지 않는다. 바의 제목이 이 화면의 대표 제목이다.

        설명은 화면에 적지 않는다. 기획자가 필요한 말은 이미지 블록에 담아 올리고, 설명은
        검색 결과와 공유 카드에 쓰인다.

        길게 내려 읽는 화면이라 바는 내려갈 때 물러나고 올릴 때 돌아온다.
      */}
      <HidingTopBar title={curationOneLine(curation.title)} right={<ShareButton />} />

      <TrackView event="curation_viewed" properties={{ curation_id: curation.id }} />

      <main className="flex-1 pb-10">
        <JsonLd data={breadcrumbList([{ name: curationOneLine(curation.title), path: `/curations/${curation.id}` }])} />

        {/* 좌우 여백은 블록이 스스로 정한다. 기획전 이미지는 화면 폭을 채우고 제품 블록만 안쪽으로 들인다. */}
        {/*
          본문이 끝나는 자리에 40px 을 둔다. 마지막 블록의 아래 여백은 기획전마다 달라 0 일 수도
          있어, 그대로 두면 본문과 이어지는 목록이 붙어 보여 어디서 본문이 끝났는지 흐려진다.
        */}
        <div className="pb-10">
          <CurationBlocks curationId={curation.id} blocks={curation.blocks} />
        </div>

        <OtherCurations currentId={curation.id} curations={list.items} />
      </main>

      <SiteFooter />
    </>
  );
}
