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
import { useEffect, useState, useSyncExternalStore } from "react";

import { useIngredientSheetTracking } from "@/components/analytics/useIngredientSheetTracking";
import { IngredientSheet } from "@/components/ingredient/IngredientSheet";
import { openInPlace } from "@/components/ui/open-in-place";
import type { SheetCloseMethod } from "@/lib/analytics/events";
import { enterGuestShelfMode, fetchGuestShelf, isGuestShelfMode, subscribeGuestShelfMode } from "@/lib/api/guest-shelf";
import { isSignedOut } from "@/lib/api/member";
import { fetchIngredientAnalysis, fetchMemberShelf } from "@/lib/api/shelf";
import type { UserProductState } from "@/lib/domain/user-product";
import { useShelfEntry } from "@/lib/hooks/useShelfEntry";
import { subscribeGuestShelf } from "@/lib/storage/guest-shelf";

/** 나만의 필터(S55j). 열린 상태의 [필터 편집]이 연다. */
const MY_FILTER_PATH = "/my-page/filter";

/**
 * 나에게 안 맞는 성분(S60 ⑤). 주의 성분 확인 위에서 나만의 필터에 걸린 성분만 빨간 칩으로 보인다.
 *
 * 상태는 로그인 여부 → 나만의 필터가 비었는지 → 이 구성품 성분과의 교집합 순서로 고른다(S60 · 상태 4종).
 * - 로그인 전: 비로그인 선반의 평가 분석과 고른 구성품의 교집합을 표시한다. 평가 변경 시 다시 계산한다.
 * - 나만의 필터가 빔: 선반 평가 분석과 비교하고, 평가가 없으면 [선반에서 평가하기]로 안내한다.
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
  const guestMode = useSyncExternalStore(subscribeGuestShelfMode, isGuestShelfMode, () => false);
  if (userProduct.status === "adminSession") return null;

  const guest = userProduct.status === "signedOut" || guestMode;
  if (guest || userProduct.myFilterEmpty) {
    return (
      <EvaluationIngredients
        key={guest ? "guest" : "member"}
        productId={productId}
        ingredients={ingredients}
        userProduct={userProduct}
      />
    );
  }
  if (userProduct.unsuitableIngredients.length === 0) return <ClearCard />;

  return <MatchedCard productId={productId} unsuitable={userProduct.unsuitableIngredients} ingredients={ingredients} />;
}

/** 비로그인 평가는 나만의 필터에 저장되지 않으므로, 분석 결과를 구성품 전성분과 직접 비교한다. */
function EvaluationIngredients({
  productId,
  ingredients,
  userProduct,
}: {
  readonly productId: number;
  readonly ingredients: readonly ProductIngredientResponse[];
  readonly userProduct: UserProductState;
}) {
  const [state, setState] = useState<
    | {
        readonly analysis: IngredientAnalysisResponse;
        readonly guest: boolean;
        readonly productCount: number;
        readonly ratingCount: number;
      }
    | "loading"
    | "error"
  >("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let request = 0;
    let active = true;
    const analyze = async () => {
      if (userProduct.status !== "signedOut" && !isGuestShelfMode()) {
        try {
          const [analysis, shelf] = await Promise.all([fetchIngredientAnalysis(), fetchMemberShelf()]);
          return {
            analysis,
            guest: false,
            productCount: shelf.items.length,
            ratingCount: shelf.items.filter((item) => item.rating.preference !== null).length,
          };
        } catch (error) {
          if (!isSignedOut(error)) throw error;
        }
      }
      enterGuestShelfMode();
      const { analysis, shelf } = await fetchGuestShelf();
      return {
        analysis,
        guest: true,
        productCount: shelf.items.length,
        ratingCount: shelf.items.filter((item) => item.rating.preference !== null).length,
      };
    };
    const load = () => {
      const current = ++request;
      void analyze().then(
        (result) => {
          if (active && request === current) setState(result);
        },
        () => {
          if (active && request === current) setState("error");
        },
      );
    };
    const unsubscribe = subscribeGuestShelf(() => {
      setState("loading");
      load();
    });
    load();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [retry, userProduct]);

  if (state === "loading" || state === "error") {
    return (
      <section data-shelf-intro="unsuitable" className={CARD}>
        <PersonalBadge guest />
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
  if (state.productCount === 0 || state.ratingCount === 0) {
    return <LockedCard productId={productId} guest={state.guest} />;
  }
  if (state.analysis.badProductCount === 0) return <ClearCard fromRatings noBadProducts />;
  const ids = new Set(state.analysis.items.map((item) => item.id));
  const matched = ingredients.filter((ingredient) => ids.has(ingredient.id));
  if (matched.length > 0)
    return (
      <MatchedCard productId={productId} unsuitable={matched} ingredients={ingredients} guest estimated={state.guest} />
    );
  return <ClearCard fromRatings />;
}

const CARD = "flex flex-col gap-3 rounded-2xl border border-brand-border bg-background p-4";

/** 머리의 '나만의 필터' 표시. 회원의 나만의 필터로 고른 내용이라는 것을 알린다. */
function PersonalBadge({ guest = false }: { readonly guest?: boolean }) {
  return (
    <span className="flex h-5.5 w-fit shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2 text-label leading-snug font-bold text-brand-text">
      <Icon name="user-check" size={12} />
      {guest ? "내 평가로 찾은 성분" : "나만의 필터"}
    </span>
  );
}

/**
 * 열린 상태의 머리. 오른쪽 위의 [필터 편집 ›]은 나만의 필터로 간다.
 * 흰 카드 위의 글자 링크라 상자는 그대로 두고, hover·눌림 때 둘레(높이 32, 좌우 8)에 한 단계 진한 면을 그린다
 * (fb-inline + fb-inline-on-background, STATE S08). 다른 글자 링크([선반 보기 ›], '입력하기 ›')와 같은 방식이다.
 */
function OpenHead({ guest = false }: { readonly guest?: boolean }) {
  const { pressableProps } = usePressable();

  return (
    <div className="flex items-center justify-between gap-2">
      <PersonalBadge guest={guest} />
      <Link
        href={guest ? "/shelf" : MY_FILTER_PATH}
        {...pressableProps}
        className="pressable press-scale fb-inline fb-inline-on-background relative flex items-center gap-0.5 text-caption leading-snug font-semibold text-text-secondary after:absolute after:-inset-x-2 after:-inset-y-3"
      >
        {guest ? "선반 보기" : "필터 편집"}
        <Icon name="chevron-right" size={14} />
      </Link>
    </div>
  );
}

/** 등록한 제품이나 평가가 없을 때의 기존 잠금 카드. */
function LockedCard({ productId, guest }: { readonly productId: number; readonly guest: boolean }) {
  const router = useRouter();
  const { ref, select } = useShelfEntry({
    source: "product_filter",
    placement: "locked_card",
    intent: "view_shelf",
    productId,
    authState: guest ? "signed_out" : "signed_in",
  });
  return (
    <section data-shelf-intro="unsuitable" className={CARD}>
      <PersonalBadge />
      <h3 className="text-section leading-snug font-bold text-text-primary">안 맞았던 제품을 알려 주면 찾아 드려요</h3>
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
      <p className="text-caption leading-snug text-text-secondary">안 맞았던 제품을 추가하면 주의 성분을 찾아드려요.</p>
      <Button
        ref={ref}
        variant="secondary"
        className="w-full"
        onClick={() => {
          select();
          router.push("/shelf");
        }}
      >
        선반에서 평가하기
      </Button>
    </section>
  );
}

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
      <OpenHead guest={fromRatings} />
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-text">
          <Icon name="check" size={20} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-section leading-snug font-bold text-success-text">나에게 안 맞는 성분이 없어요</h3>
          <p className="text-caption leading-snug text-text-secondary">
            {fromRatings
              ? noBadProducts
                ? "안 맞았던 제품을 추가하면 주의 성분을 찾아드려요."
                : "평가로 찾은 주의 성분이 들어 있지 않아요."
              : "나만의 필터에 넣은 성분이 들어 있지 않아요."}
          </p>
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
  guest = false,
  estimated = guest,
}: {
  readonly productId: number;
  readonly unsuitable: readonly Pick<UnsuitableIngredientResponse, "id" | "koreanName">[];
  readonly estimated?: boolean;
  readonly guest?: boolean;
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
      <OpenHead guest={guest} />
      <h3 className="text-section leading-snug font-bold text-text-primary">
        {guest ? "나와 안 맞을 수 있는 성분" : "나에게 안 맞는 성분"}{" "}
        <span className="text-danger-action">{unsuitable.length}종</span>이 들어 있어요
      </h3>
      <ul className="flex flex-wrap gap-2">
        {unsuitable.map((ingredient) => (
          <li key={ingredient.id}>
            <UnsuitableChip ingredient={ingredient} canOpen={byId.has(ingredient.id)} onOpen={show} />
          </li>
        ))}
      </ul>
      <p className="text-caption leading-snug text-text-secondary">
        {guest
          ? estimated
            ? "안 맞았던 제품의 평가로 찾은 성분이에요. 피부 타입을 선택하면 내 피부에 해당하는 주의 성분만 볼 수 있어요."
            : "안 맞았던 제품의 평가로 찾은 성분이에요."
          : "나만의 필터에 넣은 성분으로 확인했어요."}
      </p>

      <IngredientSheet open={open} ingredient={openId === undefined ? undefined : byId.get(openId)} onClose={close} />
    </section>
  );
}

/**
 * 걸린 성분 칩. 성분 설명으로 가는 링크로 그리고, 그냥 누르면 화면을 떠나지 않도록 시트로 연다.
 * 전성분에 없는 성분이면 시트에 그릴 것이 없어 성분 설명 화면으로 보낸다.
 * hover · 눌림은 빨간 면을 한 단계 진하게(danger-border) 하고 글자도 한 단계 진하게 한다(fb-tint-danger, STATE S03).
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
      className="pressable fb-tint-danger press-scale relative flex h-8 items-center rounded-full after:absolute after:inset-x-0 after:-inset-y-1 border border-danger-border bg-danger-soft px-3.5 text-body-sm leading-none font-semibold text-danger-action"
    >
      {ingredient.koreanName}
    </Link>
  );
}
