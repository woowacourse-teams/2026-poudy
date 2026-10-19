"use client";

import type { ShelfProductResponse, ShelfUsageStatus } from "@poudy/api/api.zod";
import { Badge } from "@poudy/design-system/badge";
import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { IconButton } from "@poudy/design-system/icon-button";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useState } from "react";

import { ShelfIntro } from "./ShelfIntro";
import { ShelfIntroActions } from "./ShelfIntroActions";
import { ShelfRatingForm } from "./ShelfRatingForm";

/*
 * 선반 화면의 시트들. 시트 그릇은 아직 디자인 시스템에 없어(#727) client 의 옛 BottomSheet 를 쓴다.
 * TODO(#727): BottomSheet · ConfirmSheet 가 들어오면 그릇만 바꾼다. 안의 내용은 그대로 둔다.
 */
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Icon } from "@/components/ui/icons/Icon";
import type { IconId } from "@/components/ui/icons/sprite";
import { ProductImage } from "@/components/ui/ProductImage";
import { withJosa } from "@/lib/domain/format";
import { draftOf, ratingBadge, type RatingDraft } from "@/lib/domain/shelf";

type ProductHeadProps = {
  readonly item: ShelfProductResponse;
  readonly title: string;
  readonly onClose: () => void;
};

/** 시트 머리. 어느 제품을 평가하는지 썸네일과 이름을 함께 둔다(S52e·S52i). */
function ProductHead({ item, title, onClose }: ProductHeadProps) {
  return (
    <BottomSheet.CustomHeader>
      <div className="flex items-center gap-3 px-5 pt-3 pb-4">
        <ProductImage src={item.product.imageUrl} size={40} className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-caption text-text-secondary">
            {item.product.brandName} · {item.product.name}
          </p>
          <BottomSheet.Title className="text-screen font-bold text-text-primary">{title}</BottomSheet.Title>
        </div>
        <IconButton label="닫기" onClick={onClose} icon={<Icon name="x" size={24} strokeWidth={2} />} />
      </div>
    </BottomSheet.CustomHeader>
  );
}

type RatingSheetProps = {
  readonly item: ShelfProductResponse | undefined;
  /** 제품을 막 담은 직후인지(S52i). 머리 글과 아래 버튼이 다르다. */
  readonly justAdded?: boolean;
  readonly onClose: () => void;
  readonly onSave: (draft: RatingDraft) => Promise<unknown>;
};

/** 평가 시트(S52e 평가 고치기 · S52i 제품 추가 직후 · S53f 사용 상태 고르기). */
export function ShelfRatingSheet({ item, justAdded = false, onClose, onSave }: RatingSheetProps) {
  return (
    <BottomSheet open={item !== undefined} onClose={onClose}>
      {item ? (
        <RatingSheetContent key={item.product.id} item={item} justAdded={justAdded} onClose={onClose} onSave={onSave} />
      ) : null}
    </BottomSheet>
  );
}

function RatingSheetContent({
  item,
  justAdded,
  onClose,
  onSave,
}: Required<Omit<RatingSheetProps, "item">> & { readonly item: ShelfProductResponse }) {
  const [draft, setDraft] = useState<RatingDraft>(() => draftOf(item));
  const [busy, setBusy] = useState(false);

  const save = () => {
    setBusy(true);
    // TODO(#728): 저장에 실패하면 토스트로 알린다. 지금은 시트를 열어 둔 채 다시 누를 수 있게만 한다.
    onSave(draft).then(onClose, () => setBusy(false));
  };

  return (
    <>
      {/* TODO(#728): 제품을 막 담았으면 머리 위에 '선반에 저장했어요 · 저장 취소' 안내 줄(Notice)을 둔다(S52i). */}
      <ProductHead item={item} title={justAdded ? "써 보니 어땠나요?" : "평가 고치기"} onClose={onClose} />
      <BottomSheet.Body>
        <ShelfRatingForm
          draft={draft}
          sensorySupported={item.product.sensorySupported}
          onDraftChange={setDraft}
          usageQuestion={justAdded ? "지금 쓰고 있나요?" : "지금도 쓰고 있나요?"}
        />
      </BottomSheet.Body>
      <BottomSheet.Footer>
        {justAdded ? (
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            나중에 할게요
          </Button>
        ) : null}
        <Button className="flex-1" busy={busy} onClick={save}>
          평가 저장
        </Button>
      </BottomSheet.Footer>
    </>
  );
}

type MenuRowProps = {
  readonly icon: IconId;
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
        "pressable fb-surface flex h-14 w-full items-center gap-3 px-5 text-left text-title leading-none font-medium",
        danger ? "text-danger-action" : "text-text-primary",
      )}
    >
      <span className={cn("shrink-0", !danger && "text-text-body")}>
        <Icon name={icon} size={20} strokeWidth={2} />
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
  const badge = item && ratingBadge(item.rating);

  return (
    <BottomSheet open={item !== undefined} onClose={onClose}>
      {item ? (
        <>
          <BottomSheet.CustomHeader>
            <div className="flex items-center gap-3 border-b border-border px-5 pt-2 pb-3">
              <ProductImage src={item.product.imageUrl} size={40} className="shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate text-caption text-text-secondary">{item.product.brandName}</p>
                <BottomSheet.Title className="truncate text-title font-semibold text-text-primary">
                  {item.product.name}
                </BottomSheet.Title>
              </div>
              {badge ? <Badge variant="rating" rating={badge} /> : null}
            </div>
          </BottomSheet.CustomHeader>
          <div className="flex flex-col pb-safe">
            <MenuRow icon="pencil" label="평가 고치기" onPress={() => onEdit(item)} />
            <MenuRow icon="eraser" label="평가 지우기" onPress={() => onClear(item)} />
            {item.usageStatus === "IN_USE" ? (
              <MenuRow icon="archive" label="사용했던으로 옮기기" onPress={() => onMove(item, "USED")} />
            ) : (
              <MenuRow icon="archive" label="사용 중으로 옮기기" onPress={() => onMove(item, "IN_USE")} />
            )}
            <div className="border-t border-border">
              <MenuRow icon="trash" label="선반에서 빼기" danger onPress={() => onRemove(item)} />
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
  readonly onConfirm: (item: ShelfProductResponse) => Promise<unknown>;
};

/** 선반에서 빼기 확인(S52f). 평가도 지워지고 성분을 다시 계산한다고 알린다. */
export function ShelfRemoveConfirm({ item, onClose, onConfirm }: RemoveConfirmProps) {
  const [busy, setBusy] = useState(false);

  const confirm = (target: ShelfProductResponse) => {
    setBusy(true);
    onConfirm(target)
      .then(onClose)
      .finally(() => setBusy(false));
  };

  return (
    <BottomSheet open={item !== undefined} onClose={onClose}>
      {item ? (
        <>
          <BottomSheet.CustomHeader>
            <div className="flex flex-col gap-2 px-5 pt-3 pb-5">
              <BottomSheet.Title className="text-screen font-bold whitespace-pre-line text-text-primary">
                {`${withJosa(item.product.name, "을/를")}\n선반에서 뺄까요?`}
              </BottomSheet.Title>
              <p className="text-body text-text-secondary">
                남긴 평가도 지워지고, 안 맞을 수 있는 성분을 다시 계산해요.
              </p>
            </div>
          </BottomSheet.CustomHeader>
          <BottomSheet.Footer>
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              취소
            </Button>
            <Button variant="destructive" className="flex-1" busy={busy} onClick={() => confirm(item)}>
              빼기
            </Button>
          </BottomSheet.Footer>
        </>
      ) : null}
    </BottomSheet>
  );
}

/** 기능 설명 시트(S54c). 머리의 도움말 버튼으로 연다. */
export function ShelfFeatureSheet({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.CustomHeader>
        <span className="sr-only">
          <BottomSheet.Title>선반 기능 설명</BottomSheet.Title>
        </span>
      </BottomSheet.CustomHeader>
      <BottomSheet.Body>
        <div className="pt-3 pb-safe">
          <ShelfIntro />
          <ShelfIntroActions label="알겠어요" onPress={onClose} onNavigate={onClose} />
        </div>
      </BottomSheet.Body>
    </BottomSheet>
  );
}
