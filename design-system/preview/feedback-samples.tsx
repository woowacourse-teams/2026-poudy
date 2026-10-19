import { useRef, useState } from "react";

import { Button } from "../src/button";
import { EmptyState } from "../src/empty-state";
import { ErrorState } from "../src/error-state";
import { Glyph } from "../src/icons";
import { LoadMore } from "../src/load-more";
import { Notice } from "../src/notice";
import { Skeleton } from "../src/skeleton";
import { ToastProvider, useToast } from "../src/toast";
import { Section } from "./section";

/** 조건 일치 제품 목록의 첫 로딩 자리(S50a). 상품 목록 카드와 같은 높이, 사진 80. */
function ProductRowSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      <Skeleton shape="box" className="size-20" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton shape="line" size={13} className="w-14" />
        <Skeleton shape="line" size={15} className="w-full" />
        <Skeleton shape="line" size={13} className="w-37.5" />
      </div>
    </div>
  );
}

function ToastSamples() {
  const toast = useToast();
  const actionRef = useRef<HTMLButtonElement>(null);
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        onClick={() => toast.show({ message: "레티놀은 ‘레티놀·레티노이드 6종’에 들어 있어 하나로 합쳤어요" })}
      >
        정보 토스트
      </Button>
      <Button
        ref={actionRef}
        variant="secondary"
        onClick={() => {
          const id = count + 1;
          setCount(id);
          toast.show({
            message: `제품 ${id}을 위시리스트에서 뺐어요`,
            action: { label: "되돌리기", onClick: () => setCount(id - 1), returnFocusTo: actionRef },
          });
        }}
      >
        되돌리기 토스트
      </Button>
    </div>
  );
}

/** 피드백 부품(Skeleton · Toast · Notice · EmptyState · ErrorState · LoadMore) 견본 */
export function FeedbackSamples() {
  const [noticeOpen, setNoticeOpen] = useState(true);
  const [previous, setPrevious] = useState<"idle" | "loading" | "failed">("idle");

  return (
    <ToastProvider>
      <Section title="Skeleton (S50a 첫 로딩)">
        <div aria-busy="true" className="flex flex-col">
          <ProductRowSkeleton />
          <ProductRowSkeleton />
        </div>
      </Section>

      <Section title="Toast (아래에 떠서 4초 뒤 사라짐)">
        <ToastSamples />
      </Section>

      <Section title="Notice (✕ 로 닫을 때까지 남음)">
        {noticeOpen ? (
          <Notice
            actions={[
              { label: "대신 리모넨 남기기", onClick: () => setNoticeOpen(false) },
              { label: "조건 보기", onClick: () => {} },
            ]}
            onClose={() => setNoticeOpen(false)}
          >
            링크 조건 중 ‘리모넨’은 ‘향료/알레르기 성분’ 피하기와 함께 쓸 수 없어서 뺐어요.
          </Notice>
        ) : (
          <Button variant="secondary" onClick={() => setNoticeOpen(true)}>
            안내 줄 다시 보기
          </Button>
        )}
        <Notice onClose={() => {}}>행동 없이 알리기만 하는 안내 줄이에요.</Notice>
      </Section>

      <Section title="EmptyState · 아이콘 (S51d)">
        <EmptyState
          icon={<Glyph name="search" size={28} />}
          title="‘독도 세럼’과 맞는 제품이 없어요"
          description={"제품명 철자를 확인하거나,\n브랜드 이름만으로 다시 검색해 보세요."}
          action={<Button variant="secondary">다시 검색하기</Button>}
        />
      </Section>

      <Section title="EmptyState · 그림 (S55d-1)">
        <EmptyState
          image={<div className="size-42.5 rounded-full bg-surface" />}
          title="아직 위시리스트에 추가한 제품이 없어요"
          description={"제품 상세에서 위시리스트 추가 버튼을 누르면\n여기에서 모아 볼 수 있어요."}
          action={<Button variant="secondary">제품 둘러보기</Button>}
        />
      </Section>

      <Section title="ErrorState · screen (S51)">
        <ErrorState
          variant="screen"
          icon={<Glyph name="alert-circle" size={28} />}
          title="화면이 잠깐 삐끗했어요"
          description={"얼른 바로잡고 있어요.\n잠시 후 다시 시도해 주세요."}
          action={<Button variant="secondary">다시 시도</Button>}
          code="7f3a9c"
        />
      </Section>

      <Section title="ErrorState · section (S51a)">
        <ErrorState variant="section" onRetry={() => {}}>
          제품을 불러오지 못했어요
        </ErrorState>
      </Section>

      <Section title="LoadMore · 이전 제품 보기 (누르면 불러오는 중 → 실패)">
        <LoadMore
          direction="previous"
          status={previous}
          onLoad={() => {
            setPrevious("loading");
            setTimeout(() => setPrevious("failed"), 1200);
          }}
        />
      </Section>

      <Section title="LoadMore · 다음 장 (불러오는 중 · 마지막 · 실패)">
        <LoadMore
          direction="next"
          status="loading"
          loadedCount={4}
          totalCount={350}
          onLoad={() => {}}
          onRetry={() => {}}
        />
        <LoadMore
          direction="next"
          status="end"
          loadedCount={350}
          totalCount={350}
          onLoad={() => {}}
          onRetry={() => {}}
        />
        <LoadMore
          direction="next"
          status="failed"
          loadedCount={20}
          totalCount={350}
          onLoad={() => {}}
          onRetry={() => {}}
        />
      </Section>
    </ToastProvider>
  );
}
