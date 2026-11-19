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

/** 파우치. 열린 상태의 [파우치 ›]와 평가 전 카드의 버튼이 연다. */
const POUCH_PATH = "/pouch";

/**
 * 나에게 안 맞는 성분 판정 카드(S85). 주의 성분 확인 위에서 나에게 걸린 성분만 빨간 칩으로 보인다.
 *
 * 상태는 로그인 여부 → 파우치 평가 분석과 이 구성품 성분의 교집합 순서로 고른다(S85 · 상태 7종).
 * 나만의 필터는 분석 결과에서 고른 사본이라 판정에 쓰지 않는다(#1209). 그래서 걸림 상태의 출처는 늘 '내 평가로 찾은 성분'이다.
 * - 로그인 전 · 평가 전: 잠긴 카드. '이 제품이 안 맞았다면 / 의심되는 성분은 [?] 개'와 흰 면 버튼 하나.
 * - 걸림: 앞 줄 '내 평가로 찾은 성분' + 'N종이 들어 있어요'와 걸린 성분 칩. 칩을 누르면 화면을 떠나지 않고 성분 시트(S24b)를 연다.
 * - 걸림 없음 · 낮게 평가한 제품 없음: 초록 확인 표시. 낮게 평가한 제품이 없을 때만 설명 줄을 둔다.
 * - 불러오는 중 · 불러오기 실패.
 * 지금 제품을 '안 맞았어요'로 평가했고 분석 성분과 겹치지 않으면 걸림 없음 카드를 그대로 보인다(#1179, .pen에 아직 상태가 없다).
 * 관리자 세션에는 파우치가 없어 그리지 않는다.
 *
 * 카드는 일곱 상태 모두 회색 면(ui-surface) · 테두리 없음 · 2xl · 안쪽 16 · 줄 간격 12다. 상태는 흰 아이콘 원 안의 아이콘 색과
 * 숫자 색으로만 구분하고, 제목 글자는 모두 text-primary 다. 브랜드 색은 앞 줄 글자와 물음표에만 쓴다.
 * 빨강(위험)은 걸린 성분에만 쓴다. 주의 성분(노랑)과 같은 성분이 나와도 따로 표시하지 않는다(S60 ⑥).
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
  return <EvaluationIngredients productId={productId} ingredients={ingredients} userProduct={userProduct} />;
}

type Evaluation = {
  readonly analysis: IngredientAnalysisResponse;
  readonly productCount: number;
  readonly ratingCount: number;
};

/** 로그인한 회원. 파우치 평가 분석을 구성품 전성분과 직접 비교한다. */
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

  if (state === "loading") return <LoadingCard />;
  if (state === "error") {
    return (
      <ErrorCard
        onRetry={() => {
          setState("loading");
          setRetry((value) => value + 1);
        }}
      />
    );
  }
  if (state.productCount === 0 || state.ratingCount === 0) return <LockedCard productId={productId} action="shelf" />;
  if (state.analysis.badProductCount === 0) return <ClearCard noBadProducts />;
  const ids = new Set(state.analysis.items.map((item) => item.id));
  const matched = ingredients.filter((ingredient) => ids.has(ingredient.id));
  if (matched.length > 0) return <MatchedCard productId={productId} unsuitable={matched} ingredients={ingredients} />;
  return <ClearCard />;
}

const CARD = "flex flex-col gap-3 rounded-2xl bg-surface p-4";

/** 첫 줄 왼쪽의 흰 아이콘 원(44). 상태는 원 안 아이콘의 색으로 구분한다. 비우면 불러오는 중의 빈 원이다. */
function StatusCircle({ children }: { readonly children?: ReactNode }) {
  return (
    <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background">
      {children}
    </span>
  );
}

/**
 * 열린 상태(걸림 · 걸림 없음)의 첫 줄 오른쪽 [파우치 ›]. 파우치 화면으로 간다(#1181).
 * 회색 카드 위의 글자 링크라 상자는 그대로 두고, hover·눌림 때 둘레(높이 32, 좌우 8)에 회색 면보다 한 단계 진한 면을 그린다
 * (fb-inline, STATE S08). 누르는 영역은 위아래로 넓혀 44를 지킨다.
 */
function PouchLink() {
  const { pressableProps } = usePressable();

  return (
    <Link
      href={POUCH_PATH}
      {...pressableProps}
      className="pressable press-scale fb-inline relative flex shrink-0 items-center gap-0.5 text-caption leading-snug font-semibold text-text-secondary after:absolute after:-inset-x-2 after:-inset-y-3"
    >
      파우치
      <Icon name="chevron-right" size={14} />
    </Link>
  );
}

/**
 * 첫 줄. 흰 아이콘 원 · 글 · (열린 상태면) [파우치 ›]를 가운데 맞춤으로 늘어놓는다.
 * 글 칸은 가장 긴 낱말보다 좁아지지 않는다(min-width: auto). 기기 글자 크기를 키워 한 줄에 다 들지 않으면
 * 낱말을 가르는 대신 [파우치 ›]를 다음 줄로 넘긴다(text-scale-check · 폭 320 ×1.95 에서 '괜찮아요'가 갈라졌다).
 */
function ResultRow({
  icon,
  link = false,
  children,
}: {
  readonly icon: ReactNode;
  readonly link?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {icon}
      <div className="flex flex-1 flex-col gap-0.5">{children}</div>
      {link && <PouchLink />}
    </div>
  );
}

const TITLE = "text-block font-bold break-keep text-text-primary";
/** 앞 줄(출처 · 찾아온 까닭을 받는 말). body 14 · 600 · brand-text */
const LEAD = "text-body leading-snug font-semibold break-keep text-brand-text";

const LOCKED_COPY = {
  login: {
    spoken: "이 제품이 안 맞았다면 의심되는 성분이 몇 개인지 로그인하면 알려 드려요",
    label: "로그인하고 확인하기",
  },
  shelf: {
    spoken: "이 제품이 안 맞았다면 의심되는 성분이 몇 개인지 파우치에서 평가하면 알려 드려요",
    label: "파우치에서 평가하기",
  },
} as const;

/**
 * 잠긴 상태(로그인 전 · 등록한 제품이나 평가가 없음). 이 화면에는 '○○가 안 맞아요'처럼 검색해서 오는 사람이 많아, 그 까닭을
 * 알고 싶은 마음을 받는 제목('이 제품이 안 맞았다면 / 의심되는 성분은 [?] 개')을 두고 답만 가린다. 처음 온 사람이 읽으므로
 * '의심 성분'이라는 서비스 말은 쓰지 않는다. 설명 줄은 두지 않는다(제목과 버튼이 이미 말한다).
 * 흐린 흰 칩과 자물쇠로 '열면 여기에 성분이 보인다'를 보여 주고 흰 면 버튼 하나를 둔다. ①과 ②는 버튼 글자만 다르다.
 * 화면의 주 행동(파우치에 저장)과 겨루지 않도록 보조 버튼으로 그린다.
 * 보이는 두 줄과 흐린 칩 · 자물쇠는 보조 기술에서 감추고, 제목은 한 문장으로 읽어 준다.
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
      <h3>
        <span className="sr-only">{copy.spoken}</span>
        <span aria-hidden="true" className="flex flex-col gap-1">
          <span className={LEAD}>이 제품이 안 맞았다면</span>
          <span className="flex flex-wrap items-center gap-1 text-screen font-bold break-keep text-text-primary">
            의심되는 성분은
            <span className="flex size-8 items-center justify-center rounded-full border border-brand-border bg-background leading-none text-brand">
              ?
            </span>
            개
          </span>
        </span>
      </h3>
      <div aria-hidden="true" className="relative flex h-9 items-center gap-2 overflow-hidden">
        {["w-16", "w-12", "w-23", "w-14"].map((width) => (
          <span key={width} className={`h-8 shrink-0 rounded-full bg-background blur-xs ${width}`} />
        ))}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-text-secondary">
            <Icon name="lock" size={16} />
          </span>
        </span>
      </div>
      <Button ref={ref} variant="secondary-on-surface" className="w-full" onClick={go}>
        {copy.label}
      </Button>
    </section>
  );
}

/** 평가 분석을 받는 동안. 빈 흰 원과 제목 자리 한 줄을 두고, 무엇을 기다리는지는 화면낭독기에만 알린다. */
function LoadingCard() {
  return (
    <section data-shelf-intro="unsuitable" aria-busy="true" className={CARD}>
      <ResultRow icon={<StatusCircle />}>
        {/* 회색 카드 위라 제목 자리는 흰 면이다. Skeleton 은 ui-surface 면이라 카드에 묻혀 같은 펄스의 흰 줄을 직접 그린다(F02). */}
        <span
          aria-hidden="true"
          className="h-4.5 w-45 max-w-full animate-skeleton rounded-xs bg-background motion-reduce:animate-none"
        />
        <p role="status" className="sr-only">
          평가한 제품의 주의 성분을 확인하고 있어요
        </p>
      </ResultRow>
    </section>
  );
}

/** 평가 분석을 받지 못했다. 빈 결과로 대신하지 않고 [다시 시도]를 둔다. */
function ErrorCard({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <section data-shelf-intro="unsuitable" className={CARD}>
      <ResultRow
        icon={
          <StatusCircle>
            <Icon name="alert-circle" size={20} className="text-text-secondary" />
          </StatusCircle>
        }
      >
        <p role="status" className={TITLE}>
          주의 성분을 불러오지 못했어요
        </p>
      </ResultRow>
      <Button variant="secondary-on-surface" className="w-full" onClick={onRetry}>
        다시 시도
      </Button>
    </section>
  );
}

/**
 * 걸림 없음. 흰 원 안의 초록 확인 표시와 결론 제목을 둔다.
 * 낮게 평가한 제품이 없을 때만 설명 줄을 둔다. 제목만으로는 아직 찾은 성분이 없다는 사실이 빠지기 때문이다(S85 ⑤).
 */
function ClearCard({ noBadProducts = false }: { readonly noBadProducts?: boolean }) {
  return (
    <section data-shelf-intro="unsuitable" className={CARD}>
      <ResultRow
        link
        icon={
          <StatusCircle>
            <Icon name="check" size={20} className="text-success-text" />
          </StatusCircle>
        }
      >
        <h3 className={TITLE}>확인한 성분 모두 괜찮아요</h3>
        {noBadProducts && (
          <p className="text-caption break-keep text-text-secondary">평가한 제품이 쌓이면 의심 성분을 찾아 드려요.</p>
        )}
      </ResultRow>
    </section>
  );
}

/** 걸림. 앞 줄로 출처('내 평가로 찾은 성분')를 밝히고, 큰 줄의 개수만 빨갛게 둔 뒤 걸린 성분을 칩으로 늘어놓는다. */
function MatchedCard({
  productId,
  unsuitable,
  ingredients,
}: {
  readonly productId: number;
  readonly unsuitable: readonly Pick<UnsuitableIngredientResponse, "id" | "koreanName">[];
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
      <ResultRow
        link
        icon={
          <StatusCircle>
            <Icon name="alert-circle" size={20} className="text-danger-action" />
          </StatusCircle>
        }
      >
        <h3 className="flex flex-col gap-0.5">
          <span className={LEAD}>내 평가로 찾은 성분</span>{" "}
          <span className={TITLE}>
            <span className="text-danger-action">{unsuitable.length}종</span>이 들어 있어요
          </span>
        </h3>
      </ResultRow>
      <ul className="flex flex-wrap gap-2">
        {unsuitable.map((ingredient) => (
          <li key={ingredient.id} className="max-w-full">
            <UnsuitableChip ingredient={ingredient} canOpen={byId.has(ingredient.id)} onOpen={show} />
          </li>
        ))}
      </ul>

      <IngredientSheet open={open} ingredient={openId === undefined ? undefined : byId.get(openId)} onClose={close} />
    </section>
  );
}

/**
 * 걸린 성분 칩. 성분 설명으로 가는 링크로 그리고, 그냥 누르면 화면을 떠나지 않도록 시트로 연다.
 * 전성분에 없는 성분이면 시트에 그릴 것이 없어 성분 설명 화면으로 보낸다.
 * 회색 카드 위라 면은 흰색, 테두리는 danger-border, 글자는 danger-action 이다(S85 ③).
 * hover · 눌림은 면을 danger-border 로 칠하고 글자도 한 단계 진하게 한다(fb-tint-danger, STATE S03 '옅은 색 면'과 같은 결).
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
      className="pressable fb-tint-danger press-scale relative flex h-8 max-w-full items-center rounded-full after:absolute after:inset-x-0 after:-inset-y-1.75 border border-danger-border bg-background px-3.5 text-body-sm leading-none font-semibold text-danger-action"
    >
      {/* 줄 높이가 1이라 truncate 의 overflow 가 괄호와 g·y 의 아랫부분을 자른다. 위아래 여백으로 잘리는 경계만 넓힌다. */}
      <span className="truncate py-1">{ingredient.koreanName}</span>
    </Link>
  );
}
