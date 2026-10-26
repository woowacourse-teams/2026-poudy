"use client";

import type { ProductIngredientResponse, UnsuitableIngredientResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useIngredientSheetTracking } from "@/components/analytics/useIngredientSheetTracking";
import { IngredientSheet } from "@/components/ingredient/IngredientSheet";
import { openInPlace } from "@/components/ui/open-in-place";
import type { SheetCloseMethod } from "@/lib/analytics/events";
import { requestShelfLogin } from "@/lib/analytics/shelf";
import type { UserProductState } from "@/lib/domain/user-product";
import { useShelfEntry } from "@/lib/hooks/useShelfEntry";
import { rememberLoginReturn } from "@/lib/storage/login-return";

/** 나만의 필터(S55j). 열린 상태의 [필터 편집]이 연다. */
const MY_FILTER_PATH = "/my-page/filter";

/**
 * 나에게 안 맞는 성분(S60 ⑤). 주의 성분 확인 위에서 나만의 필터에 걸린 성분만 빨간 칩으로 보인다.
 *
 * 상태는 로그인 여부 → 나만의 필터가 비었는지 → 이 구성품 성분과의 교집합 순서로 고른다(S60 · 상태 4종).
 * - 로그인 전: 잠긴 카드와 [로그인하고 확인하기]. 로그인 뒤 이 화면으로 돌아온다.
 * - 나만의 필터가 빔: 잠긴 카드와 [선반에서 평가하기]. 명세는 '안 맞았어요 평가가 없음'이지만, 응답은 나만의 필터가 비었는지만 알려 준다.
 * - 걸림: 걸린 성분 칩. 누르면 화면을 떠나지 않고 성분 시트(S24b)를 연다.
 * - 걸림 없음: 초록 안심 표시.
 * 관리자 세션에는 나만의 필터가 없어 그리지 않는다.
 *
 * 네 상태 모두 같은 카드(흰 면 · 브랜드 테두리 · 2xl)와 머리의 '나만의 필터' 표시를 쓴다.
 * 색은 빨강(위험)이다. 주의 성분(노랑)과 같은 성분이 나와도 따로 표시하지 않는다(S60 ⑥).
 */
export function UnsuitableIngredients({
  productId,
  userProduct,
  ingredients,
}: {
  readonly productId: number;
  readonly userProduct: UserProductState;
  /** 고른 구성품의 전성분. 걸린 성분 칩이 여는 시트에 그린다. */
  readonly ingredients: readonly ProductIngredientResponse[];
}) {
  if (userProduct.status === "adminSession") return null;

  if (userProduct.status === "signedOut") {
    return <LockedCard productId={productId} title="이 제품에 나와 안 맞는 성분이 있을까요?" action="login" />;
  }
  if (userProduct.myFilterEmpty) {
    return <LockedCard productId={productId} title="안 맞았던 제품을 알려 주면 찾아 드려요" action="shelf" />;
  }
  if (userProduct.unsuitableIngredients.length === 0) return <ClearCard />;

  return <MatchedCard productId={productId} unsuitable={userProduct.unsuitableIngredients} ingredients={ingredients} />;
}

const CARD = "flex flex-col gap-3 rounded-2xl border border-brand-border bg-background p-4";

/** 머리의 '나만의 필터' 표시. 회원의 나만의 필터로 고른 내용이라는 것을 알린다. */
function PersonalBadge() {
  return (
    <span className="flex h-5.5 w-fit shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2 text-label leading-snug font-bold text-brand-text">
      <Icon name="user-check" size={12} />
      나만의 필터
    </span>
  );
}

/** 열린 상태의 머리. 오른쪽 위의 [필터 편집 ›]은 나만의 필터로 간다. */
function OpenHead() {
  const { pressableProps } = usePressable();

  return (
    <div className="flex items-center justify-between gap-2">
      <PersonalBadge />
      <Link
        href={MY_FILTER_PATH}
        {...pressableProps}
        className="pressable relative flex items-center gap-0.5 text-caption leading-snug font-semibold text-text-secondary after:absolute after:-inset-x-2 after:-inset-y-3"
      >
        필터 편집
        <Icon name="chevron-right" size={14} />
      </Link>
    </div>
  );
}

const LOCKED_COPY = {
  login: { description: "로그인하고 선반에 써 본 제품을 평가하면 알려 드려요.", label: "로그인하고 확인하기" },
  shelf: {
    description: "써 본 제품을 선반에 올리고 '안 맞았어요'로 평가하면, 함께 든 성분을 이 제품과 비교해요.",
    label: "선반에서 평가하기",
  },
} as const;

/** 흐린 칩의 폭. 실제 데이터가 아닌 장식이라 명세의 견본 폭을 그대로 쓴다. */
const BLURRED_CHIPS = ["w-16", "w-12", "w-23", "w-14"] as const;

/**
 * 잠긴 상태(로그인 전 · 나만의 필터가 빔). 흐린 빨간 칩과 자물쇠로 '열면 보인다'를 보여 주고 회색 버튼 하나를 둔다.
 * 화면의 주 행동(선반에 저장)과 겨루지 않도록 보조 버튼으로 그린다.
 * 흐린 칩과 자물쇠는 장식이라 보조 기술에서 감춘다.
 */
function LockedCard({
  title,
  action,
  productId,
}: {
  readonly title: string;
  readonly action: keyof typeof LOCKED_COPY;
  readonly productId: number;
}) {
  const router = useRouter();
  const copy = LOCKED_COPY[action];
  const { ref: entryRef, select: selectEntry } = useShelfEntry({
    source: "product_filter",
    placement: "locked_card",
    intent: action === "login" ? "view_product_filter" : "view_shelf",
    productId,
    authState: action === "login" ? "signed_out" : "signed_in",
  });

  const go = () => {
    selectEntry();
    if (action === "login") {
      rememberLoginReturn();
      requestShelfLogin("view_product_filter");
      router.push("/login");
    } else {
      router.push("/shelf");
    }
  };

  return (
    <section className={CARD}>
      <PersonalBadge />
      <h3 className="text-section leading-snug font-bold text-text-primary">{title}</h3>
      <div aria-hidden="true" className="relative flex h-9 items-center gap-2 overflow-hidden">
        {BLURRED_CHIPS.map((width) => (
          <span key={width} className={`h-8 shrink-0 rounded-full bg-danger-soft blur-xs ${width}`} />
        ))}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-text-secondary">
            <Icon name="lock" size={16} />
          </span>
        </span>
      </div>
      <p className="text-caption leading-snug text-text-secondary">{copy.description}</p>
      <Button ref={entryRef} variant="secondary" onClick={go} className="w-full">
        {copy.label}
      </Button>
    </section>
  );
}

/** 걸림 없음. 초록 원 안의 확인 표시와 결론 문장을 둔다. */
function ClearCard() {
  return (
    <section className={CARD}>
      <OpenHead />
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-text">
          <Icon name="check" size={20} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-section leading-snug font-bold text-success-text">나에게 안 맞는 성분이 없어요</h3>
          <p className="text-caption leading-snug text-text-secondary">나만의 필터에 넣은 성분이 들어 있지 않아요.</p>
        </div>
      </div>
    </section>
  );
}

/** 걸림. 제목에 개수를 빨갛게 두고, 걸린 성분을 칩으로 늘어놓는다. */
function MatchedCard({
  productId,
  unsuitable,
  ingredients,
}: {
  readonly productId: number;
  readonly unsuitable: readonly UnsuitableIngredientResponse[];
  readonly ingredients: readonly ProductIngredientResponse[];
}) {
  const [openId, setOpenId] = useState<number>();
  // 닫는 동안에도 내용이 남아 있어야 시트가 빈 채로 내려가지 않는다. 그래서 무엇을 열었는지와 열려 있는지를 따로 둔다.
  const [open, setOpen] = useState(false);
  const tracking = useIngredientSheetTracking();
  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));

  const show = (id: number) => {
    setOpenId(id);
    setOpen(true);
    tracking.opened({ sheet_type: "ingredient", product_id: productId, ingredient_id: id });
  };
  const close = (method: SheetCloseMethod) => {
    setOpen(false);
    tracking.closed(method);
  };

  return (
    <section data-no-select className={CARD}>
      <OpenHead />
      <h3 className="text-section leading-snug font-bold text-text-primary">
        나에게 안 맞는 성분 <span className="text-danger-action">{unsuitable.length}종</span>이 들어 있어요
      </h3>
      <ul className="flex flex-wrap gap-2">
        {unsuitable.map((ingredient) => (
          <li key={ingredient.id}>
            <UnsuitableChip ingredient={ingredient} canOpen={byId.has(ingredient.id)} onOpen={show} />
          </li>
        ))}
      </ul>
      <p className="text-caption leading-snug text-text-secondary">나만의 필터에 넣은 성분으로 확인했어요.</p>

      <IngredientSheet open={open} ingredient={openId === undefined ? undefined : byId.get(openId)} onClose={close} />
    </section>
  );
}

/**
 * 걸린 성분 칩. 성분 설명으로 가는 링크로 그리고, 그냥 누르면 화면을 떠나지 않도록 시트로 연다.
 * 전성분에 없는 성분이면 시트에 그릴 것이 없어 성분 설명 화면으로 보낸다.
 */
function UnsuitableChip({
  ingredient,
  canOpen,
  onOpen,
}: {
  readonly ingredient: UnsuitableIngredientResponse;
  readonly canOpen: boolean;
  readonly onOpen: (id: number) => void;
}) {
  const { pressableProps } = usePressable();

  return (
    <Link
      href={`/ingredients/${ingredient.id}`}
      {...pressableProps}
      onClick={(event) => {
        if (canOpen) openInPlace(event, () => onOpen(ingredient.id));
      }}
      className="pressable fb-surface press-scale relative flex h-8 items-center rounded-full after:absolute after:inset-x-0 after:-inset-y-1 border border-danger-border bg-danger-soft px-3.5 text-body-sm leading-none font-semibold text-danger-action"
    >
      {ingredient.koreanName}
    </Link>
  );
}
