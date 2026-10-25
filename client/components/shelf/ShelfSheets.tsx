"use client";

import type { ShelfProductResponse, ShelfUsageStatus } from "@poudy/api/api.zod";
import { Badge } from "@poudy/design-system/badge";
import { BottomSheet, BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { Icon } from "@poudy/design-system/icon";
import { useToast } from "@poudy/design-system/toast";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { ShelfIllustration, type ShelfIllustrationName } from "./ShelfIllustration";
import { RatingFeelStep, RatingFitStep } from "./ShelfRatingForm";

// 패키지 Icon 에 아직 없는 그림(pencil, eraser)만 옛 아이콘으로 그린다.
import { Icon as LegacyIcon } from "@/components/ui/icons/Icon";
import { ProductImage } from "@/components/ui/ProductImage";
import { createAnalyticsId } from "@/lib/analytics/shelf-journey";
import { track } from "@/lib/analytics/track";
import { withJosa } from "@/lib/domain/format";
import { draftOf, isRated, ratingBadge, type RatingDraft } from "@/lib/domain/shelf";

/**
 * 시트가 닫히는 동안에도 마지막 제품을 그린다. 제품을 바로 비우면 닫히는 전환 동안 시트가 빈 채로 내려간다.
 * 렌더 중에 고치는 것은 React 가 허용하는 '앞 값에 맞춰 상태 고치기'라 effect 를 쓰지 않는다.
 */
const useLastItem = (item: ShelfProductResponse | undefined) => {
  const [last, setLast] = useState(item);
  if (item && item !== last) setLast(item);
  return item ?? last;
};

type ProductTitleProps = {
  readonly item: ShelfProductResponse;
  /** 썸네일 옆 위 줄. 브랜드다. */
  readonly caption: string;
  /** 아래 줄. 제품명이다. */
  readonly children: ReactNode;
  readonly trailing?: ReactNode;
  /** 평가 시트는 lg(썸네일 칸 48 · 브랜드 굵게), 제품 메뉴는 md(썸네일 40)다. */
  readonly size?: "md" | "lg";
};

/**
 * 시트 제목 안에 두는 제품 머리(S52d·S52e·S52i). 어느 제품의 시트인지 썸네일과 이름을 함께 보여 준다.
 * 시트 머리(BottomSheetHeader)는 제목 글만 받으므로, 제목 자리에 썸네일과 두 줄을 함께 넣는다. 썸네일은 낭독에서 뺀다.
 */
function ProductTitle({ item, caption, children, trailing, size = "md" }: ProductTitleProps) {
  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={cn("flex shrink-0 items-center justify-center", size === "lg" && "size-12 p-1")}
      >
        <ProductImage src={item.product.imageUrl} size={40} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "truncate text-caption leading-snug text-text-secondary",
            size === "lg" ? "font-medium" : "font-normal",
          )}
        >
          {caption}
        </span>
        {children}
      </span>
      {trailing}
    </span>
  );
}

/**
 * 평가 시트를 닫은 까닭.
 * - cancelled: 아무것도 저장하지 않고 닫았다. 담는 중이면 담기를 취소한 것이다.
 * - later: 담는 중에 [나중에 할게요]를 눌러 사용 상태만 저장했다.
 * - saved: 평가를 하나라도 저장했다.
 */
export type RatingSheetResult = "cancelled" | "later" | "saved";

type RatingSheetProps = {
  /** 평가할 제품. 담는 중이면 아직 선반에 없는 제품을 선반 제품 모양으로 넘긴다(pendingShelfItem). */
  readonly item: ShelfProductResponse | undefined;
  /**
   * 선반에 담는 중인지(S52i). 사용 상태를 묻고, 아래에 [나중에 할게요] · [건너뛰기]를 둔다.
   * 담는 중에는 첫 저장([나중에 할게요] · [다음] · [평가 저장])이 담기다. 그 전에 닫으면 담기를 취소한다.
   */
  readonly adding?: boolean;
  readonly onClose: (result: RatingSheetResult) => void;
  /** 고른 값을 저장한다. 담는 중이면 첫 저장에서 담고, 그 뒤로는 담은 제품의 평가를 고친다. */
  readonly onSave: (draft: RatingDraft, ratingFlowId: string) => Promise<unknown>;
};

/**
 * 평가 시트(S52e · S52e-1 · S52e-2 고치기, S52i · S52i-2 담은 직후).
 * 사용감을 평가하는 제품은 1단계(맞음)와 2단계(사용감)로 나누고, 아니면 1단계만 둔다.
 * 단계가 바뀌는 시트라 손잡이를 끄고, 머리에 ‹(2단계)와 ✕(고치기만)를 둔다(LAYOUT L10).
 */
export function ShelfRatingSheet({ item, adding = false, onClose, onSave }: RatingSheetProps) {
  const shown = useLastItem(item);
  // 시트 밖에서 닫아도(딤 · Esc · 끌어내리기) 이미 저장한 1단계 답이 있는지 알아야 한다.
  const savedRef = useRef(false);
  const dismissRef = useRef<(() => void) | undefined>(undefined);
  const [session, setSession] = useState(() => ({ open: item !== undefined, id: createAnalyticsId() }));
  if (session.open !== (item !== undefined))
    setSession({ open: item !== undefined, id: item ? createAnalyticsId() : session.id });

  return (
    <BottomSheet open={item !== undefined} onClose={() => dismissRef.current?.()} handle={false}>
      {shown ? (
        <RatingSheetContent
          key={`${shown.product.id}:${session.id}`}
          item={shown}
          open={item !== undefined}
          ratingFlowId={session.id}
          dismissRef={dismissRef}
          adding={adding}
          savedRef={savedRef}
          onClose={onClose}
          onSave={onSave}
        />
      ) : null}
    </BottomSheet>
  );
}

/**
 * 평가 단계 진행 표시(2단계). 지금 단계까지 채운다.
 * 머리 아래 여백(16)과 같은 16 을 아래에 두고 본문은 위 여백 없이 이어, [머리][진행바][폼] 사이를 모두 16 으로 맞춘다.
 */
function RatingProgress({ step }: { readonly step: 1 | 2 }) {
  return (
    <div
      role="progressbar"
      aria-label={`평가 ${step}/2단계`}
      aria-valuemin={1}
      aria-valuemax={2}
      aria-valuenow={step}
      className="flex shrink-0 gap-1 px-gutter pb-4"
    >
      <span className="h-1 flex-1 rounded-full bg-action" />
      <span className={cn("h-1 flex-1 rounded-full", step === 2 ? "bg-action" : "bg-border")} />
    </div>
  );
}

type RatingSheetContentProps = Omit<RatingSheetProps, "item" | "adding"> & {
  readonly item: ShelfProductResponse;
  readonly adding: boolean;
  readonly savedRef: React.RefObject<boolean>;
  readonly dismissRef: React.RefObject<(() => void) | undefined>;
  readonly open: boolean;
  readonly ratingFlowId: string;
};

function RatingSheetContent({
  item,
  adding,
  savedRef,
  onClose,
  onSave,
  open,
  ratingFlowId,
  dismissRef,
}: RatingSheetContentProps) {
  const toast = useToast();
  const [draft, setDraft] = useState<RatingDraft>(() => draftOf(item));
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const twoSteps = item.product.sensorySupported;
  const persisted = useRef<RatingDraft | undefined>(adding ? undefined : draftOf(item));
  const closed = useRef(false);
  const seenSteps = useRef(new Set<number>());
  const metadata = {
    product_id: item.product.id,
    rating_flow_id: ratingFlowId,
    mode: adding ? ("add" as const) : ("edit" as const),
    step: step === 1 ? ("fit" as const) : ("sensory" as const),
    sensory_supported: twoSteps,
  };
  const finish = (reason: "dismissed" | "later" | "skip_sensory" | "saved") => {
    if (closed.current || !open) return;
    closed.current = true;
    const value = persisted.current;
    track("shelf_rating_closed", {
      ...metadata,
      close_reason: reason,
      product_persisted: !adding || savedRef.current,
      has_fit_rating: value?.preference != null,
      has_sensory_rating: value?.moistureLevel != null || value?.oilLevel != null,
      save_pending: busy,
    });
    onClose(reason === "later" ? "later" : savedRef.current ? "saved" : "cancelled");
  };
  useEffect(() => {
    dismissRef.current = () => finish("dismissed");
  });
  useEffect(() => {
    if (!open || seenSteps.current.has(step)) return;
    seenSteps.current.add(step);
    track("shelf_rating_step_viewed", {
      product_id: item.product.id,
      rating_flow_id: ratingFlowId,
      mode: adding ? "add" : "edit",
      step: step === 1 ? "fit" : "sensory",
      sensory_supported: twoSteps,
    });
  }, [adding, item.product.id, open, ratingFlowId, step, twoSteps]);

  useEffect(() => {
    savedRef.current = false;
  }, [savedRef]);

  const save = (next: () => void, value: RatingDraft = draft) => {
    setBusy(true);
    onSave(value, ratingFlowId).then(
      () => {
        setBusy(false);
        savedRef.current = true;
        persisted.current = value;
        next();
      },
      () => {
        // 시트를 열어 둔 채 다시 누를 수 있게 한다. 고른 값은 그대로 남는다.
        setBusy(false);
        toast.show({ message: "평가를 저장하지 못했어요. 잠시 후 다시 시도해 주세요." });
      },
    );
  };

  const close = () => finish("saved");

  /** 담는 중의 [나중에 할게요]. 고른 사용 상태만 담고, 1단계에서 고른 답은 버린다. */
  const later = () => save(() => finish("later"), { ...draft, preference: null, moistureLevel: null, oilLevel: null });

  /*
   * 1단계의 [다음]. 담는 중이면 1단계 답과 함께 바로 담고 넘어가, 2단계에서 닫아도 담은 제품과 답이 남는다(S52i).
   * 고치기는 2단계까지 고친 뒤 [평가 저장]으로 한 번에 보낸다.
   */
  const next = () => (adding ? save(() => setStep(2)) : setStep(2));

  if (step === 2) {
    return (
      <>
        {/* 단계 제목은 제품 머리의 이름과 같은 16 으로 둔다(S52e-1 · S52i-2). */}
        <BottomSheetHeader
          title={<span className="text-section leading-snug">사용감은 어땠나요?</span>}
          onBack={() => setStep(1)}
        />
        <RatingProgress step={2} />
        <BottomSheetBody>
          <div className="pb-5">
            <RatingFeelStep draft={draft} onDraftChange={setDraft} short={adding} />
          </div>
        </BottomSheetBody>
        <BottomSheetFooter
          divided
          primary={{ label: "평가 저장", onClick: () => save(close), busy }}
          secondary={adding ? { label: "건너뛰기", onClick: () => finish("skip_sensory") } : undefined}
        />
      </>
    );
  }

  return (
    <>
      <BottomSheetHeader
        title={
          <ProductTitle item={item} caption={item.product.brandName} size="lg">
            <span className="text-section leading-snug font-bold">{item.product.name}</span>
          </ProductTitle>
        }
        // 평가 시트는 ✕ 를 두지 않는다(S52e · S52i). 제품 옆 ✕ 가 '담기 취소'로 읽히고, 딤 · 끌어 내리기 · Esc 로 닫는다.
      />
      {twoSteps ? <RatingProgress step={1} /> : null}
      <BottomSheetBody>
        {/* 진행바가 아래 여백을 맡으므로 본문은 진행바가 없을 때만 위 여백을 둔다. */}
        <div className={cn("pb-5", !twoSteps && "pt-2")}>
          <RatingFitStep draft={draft} onDraftChange={setDraft} askUsage={adding} />
        </div>
      </BottomSheetBody>
      <BottomSheetFooter
        divided
        primary={
          twoSteps ? { label: "다음", onClick: next, busy } : { label: "평가 저장", onClick: () => save(close), busy }
        }
        secondary={adding ? { label: "나중에 할게요", onClick: later, disabled: busy } : undefined}
      />
    </>
  );
}

type MenuRowProps = {
  readonly icon: ReactNode;
  readonly label: string;
  readonly onPress: () => void;
  readonly danger?: boolean;
};

/** 제품 메뉴의 행. 행 전체가 누르는 영역이다. */
function MenuRow({ icon, label, onPress, danger = false }: MenuRowProps) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      {...pressableProps}
      onClick={onPress}
      className={cn(
        "pressable fb-surface flex h-14 w-full items-center gap-3 px-gutter text-left text-body leading-none font-semibold",
        danger ? "text-danger-action" : "text-text-primary",
      )}
    >
      <span aria-hidden="true" className={cn("flex shrink-0", !danger && "text-text-body")}>
        {icon}
      </span>
      {label}
    </button>
  );
}

type MenuSheetProps = {
  readonly item: ShelfProductResponse | undefined;
  readonly onClose: () => void;
  readonly onEdit: (item: ShelfProductResponse) => void;
  readonly onClear: (item: ShelfProductResponse) => void;
  readonly onMove: (item: ShelfProductResponse, usageStatus: ShelfUsageStatus) => void;
  readonly onRemove: (item: ShelfProductResponse) => void;
};

/** 제품 메뉴(S52d). 평가 고치기·지우기, 사용 상태 옮기기, 선반에서 빼기. */
export function ShelfProductMenu({ item, onClose, onEdit, onClear, onMove, onRemove }: MenuSheetProps) {
  const shown = useLastItem(item);
  const badge = shown && ratingBadge(shown.rating);

  return (
    <BottomSheet open={item !== undefined} onClose={onClose}>
      {shown ? (
        <>
          <BottomSheetHeader
            title={
              <ProductTitle
                item={shown}
                caption={shown.product.brandName}
                trailing={badge ? <Badge variant="rating" rating={badge} size="lg" /> : null}
              >
                <span className="truncate text-body font-semibold">{shown.product.name}</span>
              </ProductTitle>
            }
          />
          {/*
            메뉴 행은 시트 폭 끝까지 누르는 영역과 구분선을 둔다(S52d). 본문(BottomSheetBody)은 좌우 여백 20 을 두므로
            쓰지 않는다. 행이 넷이라 넘치지 않는다.
          */}
          <div className="flex flex-col border-t border-border pb-safe">
            <MenuRow icon={<LegacyIcon name="pencil" size={20} />} label="평가 고치기" onPress={() => onEdit(shown)} />
            {/* 지울 평가가 없으면 두지 않는다(S52d). */}
            {isRated(shown.rating) ? (
              <MenuRow
                icon={<LegacyIcon name="eraser" size={20} />}
                label="평가 지우기"
                onPress={() => onClear(shown)}
              />
            ) : null}
            {shown.usageStatus === "IN_USE" ? (
              <MenuRow
                icon={<Icon name="archive" size={20} />}
                label="사용 완료로 옮기기"
                onPress={() => onMove(shown, "USED")}
              />
            ) : (
              <MenuRow
                icon={<Icon name="archive" size={20} />}
                label="사용 중으로 옮기기"
                onPress={() => onMove(shown, "IN_USE")}
              />
            )}
            <div className="border-t border-border">
              <MenuRow
                icon={<Icon name="trash" size={20} />}
                label="선반에서 빼기"
                danger
                onPress={() => onRemove(shown)}
              />
            </div>
          </div>
        </>
      ) : null}
    </BottomSheet>
  );
}

type RemoveConfirmProps = {
  readonly item: ShelfProductResponse | undefined;
  readonly onClose: () => void;
  /** 빼기를 확정한다. 실패하면 거부된 약속을 돌려준다. */
  readonly onConfirm: (item: ShelfProductResponse) => Promise<unknown>;
  /** 닫은 뒤 포커스를 돌려줄 곳. 뺀 제품의 메뉴 버튼은 사라지므로 목록 쪽을 넘긴다(A11Y D02). */
  readonly returnFocus?: () => HTMLElement | null | undefined;
};

/** 선반에서 빼기 확인(S52f). 평가도 지워지고 성분을 다시 계산한다고 알린다. */
export function ShelfRemoveConfirm({ item, onClose, onConfirm, returnFocus }: RemoveConfirmProps) {
  const shown = useLastItem(item);
  const [busy, setBusy] = useState(false);

  const confirm = () => {
    if (!shown) return;
    setBusy(true);
    onConfirm(shown).then(
      () => {
        setBusy(false);
        onClose();
      },
      () => setBusy(false),
    );
  };

  return (
    <ConfirmSheet
      open={item !== undefined}
      title={
        shown ? (
          <>
            {withJosa(shown.product.name, "을/를")}
            <br />
            선반에서 뺄까요?
          </>
        ) : (
          "선반에서 뺄까요?"
        )
      }
      description="남긴 평가도 지워지고, 안 맞을 수 있는 성분을 다시 계산해요."
      confirmLabel="빼기"
      tone="destructive"
      busy={busy}
      onConfirm={confirm}
      onCancel={onClose}
      returnFocus={returnFocus}
    />
  );
}

type FeatureStep = {
  readonly illustration: ShelfIllustrationName;
  readonly title: string;
  readonly description: string;
};

/** 기능 설명 시트의 기록 → 힌트 → 활용 세 단계(S54c). */
const FEATURE_STEPS: readonly FeatureStep[] = [
  {
    illustration: "record",
    title: "내가 써 본 화장품을 기억해요",
    description: "좋았던 제품도 아쉬웠던 제품도 모아 둬요",
  },
  {
    illustration: "ingredientHint",
    title: "내 피부에 맞는 성분의 힌트를 찾아요",
    description: "안 맞았던 제품의 공통 성분을 알려 줘요",
  },
  {
    illustration: "myPick",
    title: "다음 화장품은 내 기준으로 골라요",
    description: "고른 성분이 든 제품은 검색에서 빼요",
  },
];

/**
 * 기능 설명 시트(S54c). 다 설명하지 않고 소개 페이지(S54d)로 이끈다.
 * 제품이 이미 담긴 사용자에게만 뜨므로 주 버튼은 '시작하기'가 아니라 '알겠어요'다.
 */
export function ShelfFeatureSheet({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheetHeader
        title={
          <>
            써 본 화장품이 쌓일수록
            <br />
            <span className="text-brand-text">나에게 맞는 화장품</span>이 보여요
          </>
        }
      />
      <BottomSheetBody>
        <div className="flex flex-col pb-safe">
          <p className="text-body-sm leading-normal text-text-secondary">
            잘 맞았던 제품도, 아쉬웠던 제품도
            <br />
            모두 다음 선택에 도움이 돼요.
          </p>
          <ul className="flex flex-col gap-5 pt-6">
            {FEATURE_STEPS.map((step) => (
              <li key={step.title} className="flex items-center gap-4">
                <span className="flex size-22 shrink-0 items-center justify-center rounded-xl bg-surface">
                  <ShelfIllustration name={step.illustration} size={68} />
                </span>
                <p className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-title leading-snug font-semibold text-text-primary">{step.title}</span>
                  <span className="text-body-sm leading-normal text-text-secondary">{step.description}</span>
                </p>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 pt-5">
            <Button className="w-full" onClick={onClose}>
              알겠어요
            </Button>
            <Link
              href="/shelf/guide"
              onClick={onClose}
              {...pressableProps}
              className="pressable fb-surface flex min-h-11 items-center justify-center rounded-xl text-body leading-none font-semibold text-text-primary"
            >
              선반 기능 자세히 보기
            </Link>
          </div>
        </div>
      </BottomSheetBody>
    </BottomSheet>
  );
}
