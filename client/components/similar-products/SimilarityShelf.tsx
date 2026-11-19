"use client";

import type { ShelfProductInfoResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Skeleton } from "@poudy/design-system/skeleton";
import { useDragScroll } from "@poudy/design-system/use-drag-scroll";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { ProductGridCard } from "@/components/product/ProductGridCard";
import { requestFeatureLogin } from "@/lib/analytics/feature-login";
import { selectSimilarSource } from "@/lib/analytics/similar-products";
import { similarProductsHref } from "@/lib/domain/similar-products";
import type { SimilarityShelfState } from "@/lib/hooks/useSimilarityShelf";
import { rememberLoginReturn } from "@/lib/storage/login-return";

/** 미리 보여 주는 파우치 제품 수. 11번째부터는 검색으로 찾는다(파우치 선택 시트는 2026-11-19 에 없앴다). */
const SHELF_PREVIEW_LIMIT = 10;
/** 카드가 들어갈 자리. 넷째 카드가 걸쳐 보인다. */
const SKELETON_CARDS = 4;

type Props = {
  readonly state: SimilarityShelfState;
  readonly retry: () => void;
};

/**
 * 내 파우치 제품으로 찾기(명세 S271 · S271-1 · S279 · S283 · S271-2). 불러오는 중 · 제품 · 빈 파우치 · 실패 · 로그인 전의
 * 다섯 상태가 모두 같은 높이(머리 32 + 16 + 내용 166)라 상태가 바뀌어도 아래 저렴이 목록이 밀리지 않는다.
 * 기기 글자 크기를 키우면 글자에 맞춰 늘어나도록 높이는 최소 높이로 둔다. 관리자 세션 안내는 이 섹션 밖에서 그린다.
 */
export function SimilarityShelf({ state, retry }: Props) {
  const items = state.status === "ready" ? state.shelf.items : [];

  return (
    <section aria-labelledby="similarity-shelf-title" className="flex flex-col gap-4">
      <div className="flex h-8 items-center">
        <h2 id="similarity-shelf-title" className="text-section font-bold text-text-primary">
          내 파우치 제품으로 찾기
        </h2>
      </div>
      {state.status === "loading" ? <ShelfSkeleton /> : null}
      {state.status === "signedOut" ? <SignedOutPanel /> : null}
      {state.status === "error" ? (
        <div className="flex min-h-41.5 flex-col justify-center">
          <ErrorState variant="section" onRetry={retry}>
            내 파우치를 불러오지 못했어요
          </ErrorState>
        </div>
      ) : null}
      {state.status === "ready" && items.length === 0 ? (
        <Panel title="파우치에 담은 제품이 없어요">
          <GhostOnSurfaceLink href="/pouch">파우치로 가기</GhostOnSurfaceLink>
        </Panel>
      ) : null}
      {items.length > 0 ? <ShelfProducts items={items.slice(0, SHELF_PREVIEW_LIMIT)} /> : null}
    </section>
  );
}

function ShelfProducts({ items }: { readonly items: readonly { readonly product: ShelfProductInfoResponse }[] }) {
  const dragScroll = useDragScroll();
  return (
    // 마우스로 끌어서도 민다. 끈 뒤에 따라오는 클릭은 제품으로 넘어가지 않는다.
    <ul {...dragScroll} className="flex min-h-41.5 items-start gap-2 overflow-x-auto pb-2">
      {items.map(({ product }, index) => (
        <li key={product.id} className="w-25 shrink-0">
          <ProductGridCard
            id={product.id}
            name={product.name}
            brandName={product.brandName}
            imageUrl={product.imageUrl}
            href={similarProductsHref(product.id)}
            onNavigate={() => selectSimilarSource(product.id, "shelf")}
            loading={index < SKELETON_CARDS ? "eager" : "lazy"}
          />
        </li>
      ))}
    </ul>
  );
}

/** 카드와 같은 자리의 스켈레톤(명세 S271-1). 사진 칸과 글 두 줄이다. */
function ShelfSkeleton() {
  return (
    <div
      role="status"
      aria-label="내 파우치를 불러오는 중"
      aria-busy="true"
      className="flex min-h-41.5 items-start gap-2 overflow-hidden pb-2"
    >
      {Array.from({ length: SKELETON_CARDS }, (_, index) => (
        <div key={index} className="flex w-25 shrink-0 flex-col gap-2">
          <Skeleton shape="box" className="aspect-square w-full" />
          <Skeleton shape="line" size={13} className="w-full" />
          <Skeleton shape="line" size={13} className="w-3/5" />
        </div>
      ))}
    </div>
  );
}

/** 빈 파우치 · 로그인 전의 회색 판(명세 S279 cFpyH). 한 줄 제목과 고스트 버튼 하나만 둔다. */
function Panel({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div className="flex min-h-41.5 flex-col items-center justify-center gap-2 rounded-lg bg-surface px-2 text-center">
      <p className="text-body font-semibold text-text-body">{title}</p>
      {children}
    </div>
  );
}

function SignedOutPanel() {
  const router = useRouter();
  return (
    <Panel title="로그인하고 내 제품으로 찾아보세요">
      <Button
        variant="ghost-on-surface"
        trailingIcon={<Icon name="chevron-right" size={14} />}
        onClick={() => {
          rememberLoginReturn();
          requestFeatureLogin("similar_shelf");
          router.push("/login");
        }}
      >
        로그인
      </Button>
    </Panel>
  );
}

/**
 * 회색 판 위의 BTN · Ghost 링크. 패키지 Button 의 ghost-on-surface 와 같은 모양이고, 다른 화면으로 가므로 링크로 둔다.
 * 보이는 높이는 32, 누르는 영역은 위아래로 넓혀 44 다(A11Y D12). hover·눌림은 회색 면보다 한 단계 진한 면(fb-border)이다.
 */
function GhostOnSurfaceLink({ href, children }: { readonly href: string; readonly children: string }) {
  const { pressableProps } = usePressable();
  return (
    <Link
      href={href}
      {...pressableProps}
      className="pressable press-scale fb-border inline-flex h-8 items-center justify-center gap-0.5 rounded-xl px-2 text-body-sm leading-none font-semibold whitespace-nowrap text-brand-text select-none after:absolute after:-inset-y-1.5 after:inset-x-0"
    >
      {children}
      <Icon name="chevron-right" size={14} />
    </Link>
  );
}
