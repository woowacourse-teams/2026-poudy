"use client";

import type {
  IngredientAnalysisResponse,
  ProductIngredientResponse,
  UnsuitableIngredientResponse,
} from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { useIngredientSheetTracking } from "@/components/analytics/useIngredientSheetTracking";
import { IngredientSheet } from "@/components/ingredient/IngredientSheet";
import { openInPlace } from "@/components/ui/open-in-place";
import type { SheetCloseMethod } from "@/lib/analytics/events";
import { requestShelfLogin } from "@/lib/analytics/shelf";
import { fetchIngredientAnalysis, fetchShelf } from "@/lib/api/shelf";
import type { UserProductState } from "@/lib/domain/user-product";
import { useShelfEntry } from "@/lib/hooks/useShelfEntry";
import { rememberLoginReturn } from "@/lib/storage/login-return";

/** 파우치. 열린 상태의 [파우치 ›]가 연다. */
const POUCH_PATH = "/pouch";

/**
 * 나에게 안 맞는 성분(S60 ⑤). 주의 성분 확인 위에서 나에게 걸린 성분만 빨간 칩으로 보인다.
 *
 * 상태는 로그인 여부 → 나만의 필터가 비었는지 → 이 구성품 성분과의 교집합 순서로 고른다(S60 · 상태 4종).
 * - 로그인 전: 잠긴 카드와 [로그인하고 확인하기]. 로그인 뒤 이 화면으로 돌아온다.
 * - 나만의 필터가 빔: 파우치 평가 분석과 비교하고, 평가가 없으면 [파우치에서 평가하기]로 안내한다.
 * - 걸림: 걸린 성분 칩. 누르면 화면을 떠나지 않고 성분 시트(S24b)를 연다.
 * - 걸림 없음: 초록 안심 표시.
 * 관리자 세션에는 나만의 필터가 없어 그리지 않는다.
 *
 * 같은 카드(흰 면 · 브랜드 테두리 · 2xl)를 쓰고, 평가 기반 결과는 그 기준을 머리에 표시한다.
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
  if (userProduct.status === "signedOut") return <LockedCard productId={productId} action="login" />;
  if (userProduct.myFilterEmpty) {
    return <EvaluationIngredients productId={productId} ingredients={ingredients} userProduct={userProduct} />;
  }
  if (userProduct.unsuitableIngredients.length === 0) return <ClearCard />;

  return <MatchedCard productId={productId} unsuitable={userProduct.unsuitableIngredients} ingredients={ingredients} />;
}

type Evaluation = {
  readonly analysis: IngredientAnalysisResponse;
  readonly productCount: number;
  readonly ratingCount: number;
};

/** 나만의 필터가 빈 회원. 파우치 평가 분석을 구성품 전성분과 직접 비교한다. */
function EvaluationIngredients({
  productId,
  ingredients,
  userProduct,
}: {
  readonly productId: number;
  readonly ingredients: readonly ProductIngredientResponse[];
  readonly userProduct: UserProductState;
}) {
  const [state, setState] = useState<Evaluation | "loading" | "error">("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const analyze = async (): Promise<Evaluation> => {
      const [analysis, shelf] = await Promise.all([fetchIngredientAnalysis(), fetchShelf()]);
      return {
        analysis,
        productCount: shelf.items.length,
        ratingCount: shelf.items.filter((item) => item.rating.preference !== null).length,
      };
    };
    analyze().then(
      (result) => {
        if (active) setState(result);
      },
      () => {
        if (active) setState("error");
      },
    );
    return () => {
      active = false;
    };
  }, [retry, userProduct]);

  if (state === "loading" || state === "error") {
    return (
      <section data-shelf-intro="unsuitable" className={CARD}>
        <PersonalBadge />
        <p role="status" className="text-caption leading-snug text-text-secondary">
          {state === "loading" ? "평가한 제품의 주의 성분을 확인하고 있어요." : "주의 성분을 불러오지 못했어요."}
        </p>
        {state === "error" && (
          <Button
            variant="secondary"
            onClick={() => {
              setState("loading");
              setRetry((value) => value + 1);
            }}
          >
            다시 시도
          </Button>
        )}
      </section>
    );
  }
  if (state.productCount === 0 || state.ratingCount === 0) return <LockedCard productId={productId} action="shelf" />;
  if (state.analysis.badProductCount === 0) return <ClearCard fromRatings noBadProducts />;
  const ids = new Set(state.analysis.items.map((item) => item.id));
  const matched = ingredients.filter((ingredient) => ids.has(ingredient.id));
  if (matched.length > 0)
    return <MatchedCard productId={productId} unsuitable={matched} ingredients={ingredients} fromRatings />;
  return <ClearCard fromRatings />;
}

const CARD = "flex flex-col gap-3 rounded-2xl border border-brand-border bg-background p-4";

/** 머리의 '내 평가로 찾은 성분' 표시. 파우치 평가로 고른 내용이라는 것을 알린다. */
function PersonalBadge() {
  return (
    <span className="flex min-h-5.5 w-fit max-w-full items-center gap-1 rounded-full bg-brand-soft px-2 text-label leading-snug font-bold text-brand-text">
      <Icon name="user-check" size={12} />내 평가로 찾은 성분
    </span>
  );
}

/**
 * 열린 상태의 머리. 왼쪽에 결과를 두고 오른쪽 위의 [파우치 ›]로 파우치에 간다.
 * 평가로 찾은 결과면 제목 위에 그 표시를 둔다.
 * 흰 카드 위의 글자 링크라 상자는 그대로 두고, hover·눌림 때 둘레(높이 32, 좌우 8)에 한 단계 진한 면을 그린다
 * (fb-inline + fb-inline-on-background, STATE S08). 다른 글자 링크('입력하기 ›')와 같은 방식이다.
 */
function OpenHead({ fromRatings = false, children }: { readonly fromRatings?: boolean; readonly children: ReactNode }) {
  const { pressableProps } = usePressable();

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {fromRatings && <PersonalBadge />}
        {children}
      </div>
      <Link
        href={POUCH_PATH}
        {...pressableProps}
        className="pressable press-scale fb-inline fb-inline-on-background relative flex shrink-0 items-center gap-0.5 text-caption leading-snug font-semibold text-text-secondary after:absolute after:-inset-x-2 after:-inset-y-3"
      >
        파우치
        <Icon name="chevron-right" size={14} />
      </Link>
    </div>
  );
}

const LOCKED_COPY = {
  login: {
    title: "이 제품에 나와 안 맞는 성분이 있을까요?",
    description: "로그인하고 파우치에 써 본 제품을 평가하면 알려 드려요.",
    label: "로그인하고 확인하기",
  },
  shelf: {
    title: "안 맞았던 제품을 알려 주면 찾아 드려요",
    description: "안 맞았던 제품을 추가하면 주의 성분을 찾아드려요.",
    label: "파우치에서 평가하기",
  },
} as const;

/**
 * 잠긴 상태(로그인 전 · 등록한 제품이나 평가가 없음). 흐린 빨간 칩과 자물쇠로 '열면 보인다'를 보여 주고 회색 버튼 하나를 둔다.
 * 화면의 주 행동(파우치에 저장)과 겨루지 않도록 보조 버튼으로 그린다. 흐린 칩과 자물쇠는 장식이라 보조 기술에서 감춘다.
 */
function LockedCard({ productId, action }: { readonly productId: number; readonly action: keyof typeof LOCKED_COPY }) {
  const router = useRouter();
  const copy = LOCKED_COPY[action];
  const login = action === "login";
  const { ref, select } = useShelfEntry({
    source: "product_filter",
    placement: "locked_card",
    intent: (login && "view_product_filter") || "view_shelf",
    productId,
    authState: (login && "signed_out") || "signed_in",
  });
  const go = () => {
    select();
    if (!login) return router.push(POUCH_PATH);
    rememberLoginReturn();
    requestShelfLogin("view_product_filter");
    router.push("/login");
  };
  return (
    <section data-shelf-intro="unsuitable" className={CARD}>
      <h3 className="text-section leading-snug font-bold break-keep text-text-primary">{copy.title}</h3>
      <div aria-hidden="true" className="relative flex h-9 items-center gap-2 overflow-hidden">
        {["w-16", "w-12", "w-23", "w-14"].map((width) => (
          <span key={width} className={`h-8 shrink-0 rounded-full bg-danger-soft blur-xs ${width}`} />
        ))}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-text-secondary">
            <Icon name="lock" size={16} />
          </span>
        </span>
      </div>
      <p className="text-caption leading-snug text-text-secondary">{copy.description}</p>
      <Button ref={ref} variant="secondary" className="w-full" onClick={go}>
        {copy.label}
      </Button>
    </section>
  );
}

const clearDescription = (fromRatings: boolean, noBadProducts: boolean): string => {
  if (!fromRatings) return "나만의 필터에 넣은 성분이 들어 있지 않아요.";
  if (noBadProducts) return "안 맞았던 제품을 추가하면 주의 성분을 찾아드려요.";
  return "평가로 찾은 주의 성분이 들어 있지 않아요.";
};

/** 걸림 없음. 초록 원 안의 확인 표시와 결론 문장을 둔다. */
function ClearCard({
  fromRatings = false,
  noBadProducts = false,
}: {
  readonly fromRatings?: boolean;
  readonly noBadProducts?: boolean;
}) {
  return (
    <section data-shelf-intro="unsuitable" className={CARD}>
      <OpenHead fromRatings={fromRatings}>
        <div className="@container">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-text">
              <Icon name="check" size={20} />
            </span>
            <div className="flex min-w-0 grow basis-full flex-col gap-0.5 @min-[calc(52px_+_10em)]:basis-0">
              <h3 className="text-section leading-snug font-bold break-keep text-success-text">
                나에게 안 맞는 성분이 없어요
              </h3>
              <p className="text-caption leading-snug text-text-secondary">
                {clearDescription(fromRatings, noBadProducts)}
              </p>
            </div>
          </div>
        </div>
      </OpenHead>
    </section>
  );
}

/** 걸림. 제목에 개수를 빨갛게 두고, 걸린 성분을 칩으로 늘어놓는다. */
function MatchedCard({
  productId,
  unsuitable,
  ingredients,
  fromRatings = false,
}: {
  readonly productId: number;
  readonly unsuitable: readonly Pick<UnsuitableIngredientResponse, "id" | "koreanName">[];
  readonly fromRatings?: boolean;
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
    <section data-shelf-intro="unsuitable" data-no-select className={CARD}>
      <OpenHead fromRatings={fromRatings}>
        <h3 className="text-section leading-snug font-bold break-keep text-text-primary">
          {(fromRatings && "나와 안 맞을 수 있는 성분") || "나에게 안 맞는 성분"}{" "}
          <span className="text-danger-action">{unsuitable.length}종</span>이 들어 있어요
        </h3>
      </OpenHead>
      <ul className="flex flex-wrap gap-2">
        {unsuitable.map((ingredient) => (
          <li key={ingredient.id} className="max-w-full">
            <UnsuitableChip ingredient={ingredient} canOpen={byId.has(ingredient.id)} onOpen={show} />
          </li>
        ))}
      </ul>
      <p className="text-caption leading-snug text-text-secondary">
        {(fromRatings && "안 맞았던 제품의 평가로 찾은 성분이에요.") || "나만의 필터에 넣은 성분으로 확인했어요."}
      </p>

      <IngredientSheet open={open} ingredient={openId === undefined ? undefined : byId.get(openId)} onClose={close} />
    </section>
  );
}

/**
 * 걸린 성분 칩. 성분 설명으로 가는 링크로 그리고, 그냥 누르면 화면을 떠나지 않도록 시트로 연다.
 * 전성분에 없는 성분이면 시트에 그릴 것이 없어 성분 설명 화면으로 보낸다.
 * hover · 눌림은 빨간 면을 한 단계 진하게(danger-border) 하고 글자도 한 단계 진하게 한다(fb-tint-danger, STATE S03).
 * 이름은 줄을 바꾸지 않는다. 칩의 최대 폭은 칩 묶음 폭이고, 한 칩이 행보다 넓으면 말줄임으로 자른다.
 * 잘려도 칩의 접근성 이름은 전체 이름이고, 누르면 나오는 시트와 성분 설명에도 전체 이름이 있다.
 */
function UnsuitableChip({
  ingredient,
  canOpen,
  onOpen,
}: {
  readonly ingredient: Pick<UnsuitableIngredientResponse, "id" | "koreanName">;
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
      className="pressable fb-tint-danger press-scale relative flex h-8 max-w-full items-center rounded-full after:absolute after:inset-x-0 after:-inset-y-1.75 border border-danger-border bg-danger-soft px-3.5 text-body-sm leading-none font-semibold text-danger-action"
    >
      {/* 줄 높이가 1이라 truncate 의 overflow 가 괄호와 g·y 의 아랫부분을 자른다. 위아래 여백으로 잘리는 경계만 넓힌다. */}
      <span className="truncate py-1">{ingredient.koreanName}</span>
    </Link>
  );
}
