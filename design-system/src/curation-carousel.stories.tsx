import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  CurationCarousel,
  CurationCarouselCard,
  CurationCarouselGuideCard,
  CurationCarouselSlide,
} from "./curation-carousel";

const meta = {
  title: "화면 골격/CurationCarousel",
  component: CurationCarousel,
  parameters: { frame: "screen" },
} satisfies Meta<typeof CurationCarousel>;

export default meta;
// 견본은 render 로 직접 그리므로 args 를 모두 선택으로 받는다.
type Story = StoryObj<typeof CurationCarousel>;

// 그림은 client/public 의 큐레이션 썸네일을 쓴다(.storybook/main.ts 의 staticDirs).
const CURATIONS = [
  {
    id: 1,
    title: "가을바람에 지친 피부,\n장벽부터 채워요",
    description: "세라마이드·판테놀 보습 성분 모아보기",
    imageUrl: "/images/curations/autumn-barrier.jpg",
  },
  {
    id: 2,
    title: "자극 없이 씻어내는\n순한 클렌징",
    description: "설페이트 뺀 클렌저 모아보기",
    imageUrl: "/images/curations/gentle-cleansing.jpg",
  },
  {
    id: 3,
    title: "번들거림은 줄이고\n수분은 남기고",
    description: "지성 피부를 위한 가벼운 보습",
    imageUrl: "/images/curations/light-moisture.jpg",
  },
] as const;

// 칸 수를 세려면 칸을 캐러셀의 자식으로 바로 넘겨야 한다. 칸을 그리는 컴포넌트 하나로 감싸면 한 칸으로 센다.
const slides = (withGuide: boolean) => {
  const offset = withGuide ? 1 : 0;
  return [
    withGuide ? (
      <CurationCarouselSlide key="guide" index={0}>
        <a href="#about">
          <CurationCarouselGuideCard
            badge="서비스 가이드"
            badgeIcon="book"
            title={"3단계로 알아보는\n파우디 사용법"}
            description="원하는 성분, 피하고 싶은 성분만 고르면 돼요"
          />
        </a>
      </CurationCarouselSlide>
    ) : null,
    ...CURATIONS.map((curation, index) => (
      <CurationCarouselSlide key={curation.id} index={index + offset}>
        <a href={`#curation-${curation.id}`}>
          <CurationCarouselCard
            image={
              <img
                src={curation.imageUrl}
                alt=""
                draggable={false}
                className="absolute inset-0 size-full object-cover select-none"
              />
            }
            title={curation.title}
            description={curation.description}
          />
        </a>
      </CurationCarouselSlide>
    )),
  ];
};

export const Home: Story = {
  name: "홈 (서비스 가이드 + 큐레이션 3장 · 5초마다 넘어감)",
  render: () => (
    <CurationCarousel label="큐레이션">{slides(true)}</CurationCarousel>
  ),
};

export const CurationsOnly: Story = {
  name: "큐레이션만 (관리자 미리보기)",
  render: () => (
    <CurationCarousel label="큐레이션">{slides(false)}</CurationCarousel>
  ),
};

export const Single: Story = {
  name: "한 장 (자리 표시 없음 · 넘기지 않음)",
  render: () => (
    <CurationCarousel label="큐레이션">
      <CurationCarouselSlide index={0}>
        <a href="#curation-1">
          <CurationCarouselCard
            image={
              <img
                src={CURATIONS[0].imageUrl}
                alt=""
                draggable={false}
                className="absolute inset-0 size-full object-cover select-none"
              />
            }
            title={CURATIONS[0].title}
            description={CURATIONS[0].description}
          />
        </a>
      </CurationCarouselSlide>
    </CurationCarousel>
  ),
};

export const Empty: Story = {
  name: "비어 있음 (자리를 지키는 빈 카드)",
  render: () => <CurationCarousel label="큐레이션" />,
};
