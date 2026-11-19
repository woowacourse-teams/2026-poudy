"use client";

import type { RatingPreference, RoutineAuthorResponse, RoutineProductResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import type { ReactNode } from "react";

import { RoutineVisibility } from "./RoutineVisibility";
import { TimeOfDayIcon } from "./TimeOfDayIcon";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProductImage } from "@/components/ui/ProductImage";
import { profileLabel, SKIN_KINDS } from "@/lib/domain/member-profile";
import { photoRow, TIME_OF_DAY_LABEL, type TimeOfDay } from "@/lib/domain/routine";

type PhotoProduct = Pick<RoutineProductResponse, "id" | "imageUrl">;

/** 사진 판 카드가 받는 루틴. 내 루틴 · 공개 루틴 · 예시 루틴이 모두 이 모양을 가진다. */
export type PhotoCardRoutine = {
  readonly name: string;
  readonly morning: readonly PhotoProduct[];
  readonly evening: readonly PhotoProduct[];
};

const TIMES_OF_DAY = ["morning", "evening"] as const satisfies readonly TimeOfDay[];

/**
 * 사진 오른쪽 아래의 평가 배지(명세 APP · 평가 배지 MCX0W · KFezC, 이 자리는 18). 디자인 시스템 Badge 는 28·36 만 있어
 * 40 사진 칸에 맞는 작은 원을 같은 색(흰 면 · 진한 테두리 · 엄지)으로 그린다.
 */
function RatingMark({ preference }: { readonly preference: RatingPreference }) {
  const good = preference === "GOOD";
  return (
    <span
      role="img"
      aria-label={good ? "내 평가: 잘 맞았어요" : "내 평가: 안 맞았어요"}
      className={cn(
        "absolute right-0.5 bottom-0.5 flex size-4.5 items-center justify-center rounded-full border border-border-strong bg-background",
        good ? "text-success-text" : "text-danger-action",
      )}
    >
      <Icon name={good ? "thumb-up" : "thumb-down"} size={12} />
    </span>
  );
}

/** 시간대 한 줄. 해·달 그림 뒤에 제품 사진 40 을 4칸까지 둔다. 넘치면 3장과 '+N' 이다. */
function PhotoRow({
  timeOfDay,
  products,
  currentProductId,
  ratings,
}: {
  readonly timeOfDay: TimeOfDay;
  readonly products: readonly PhotoProduct[];
  readonly currentProductId?: number;
  readonly ratings?: ReadonlyMap<number, RatingPreference>;
}) {
  const { shown, more } = photoRow(products, currentProductId);

  return (
    <span className="flex items-center gap-2">
      <TimeOfDayIcon timeOfDay={timeOfDay} size={16} />
      <span className="sr-only">
        {TIME_OF_DAY_LABEL[timeOfDay]} {products.length}개
      </span>
      <span className="flex items-center gap-2">
        {shown.map((product) => {
          const rating = ratings?.get(product.id);
          return (
            <span
              key={product.id}
              className={cn(
                "relative flex size-10 shrink-0 overflow-hidden rounded-md bg-background",
                product.id === currentProductId && "ring-2 ring-brand ring-inset",
              )}
            >
              <ProductImage src={product.imageUrl} size={40} />
              {rating ? <RatingMark preference={rating} /> : null}
            </span>
          );
        })}
        {more > 0 ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background text-caption font-semibold text-text-secondary">
            +{more}
            <span className="sr-only">개 더</span>
          </span>
        ) : null}
      </span>
    </span>
  );
}

/** 좋아요·댓글 수. 수가 없으면(undefined) 그 칸을 그리지 않는다. */
export function RoutineCounts({
  likeCount,
  commentCount,
}: {
  readonly likeCount?: number;
  readonly commentCount?: number;
}) {
  return (
    <span className="flex shrink-0 items-center gap-2 text-caption text-text-secondary">
      {likeCount === undefined ? null : (
        <span className="flex items-center gap-1">
          <Icon name="heart" size={14} />
          <span className="sr-only">좋아요</span>
          {likeCount}
        </span>
      )}
      {commentCount === undefined ? null : (
        <span className="flex items-center gap-1">
          <Icon name="message-circle" size={14} />
          <span className="sr-only">댓글</span>
          {commentCount}
        </span>
      )}
    </span>
  );
}

/**
 * 작성자 줄(명세 j6nApu): 프로필 20 · 닉네임 · '· 피부 타입'을 글자로 잇는다. 피부 타입이 없으면 가운뎃점까지 숨긴다.
 * 칸 사이는 노드 값 4 다(context 의 6 은 간격 스케일 밖이라 노드를 따른다).
 */
export function RoutineAuthorLine({
  author,
  likeCount,
  commentCount,
}: {
  readonly author: RoutineAuthorResponse;
  readonly likeCount?: number;
  readonly commentCount?: number;
}) {
  const skin = profileLabel(SKIN_KINDS, author.skinType);
  return (
    <span className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1 text-caption text-text-secondary">
        <ProfileAvatar src={author.profileImageUrl} className="size-5" />
        <span className="truncate">{author.nickname}</span>
        {skin ? <span className="shrink-0">· {skin}</span> : null}
      </span>
      <RoutineCounts likeCount={likeCount} commentCount={commentCount} />
    </span>
  );
}

/** 내 루틴 카드의 아랫줄(S183). 공개 표지와 좋아요·댓글 수. */
export function RoutineVisibilityLine({
  isPublic,
  likeCount,
  commentCount,
}: {
  readonly isPublic: boolean;
  readonly likeCount: number;
  readonly commentCount: number;
}) {
  return (
    <span className="flex items-center justify-between gap-2">
      <RoutineVisibility isPublic={isPublic} />
      <RoutineCounts likeCount={likeCount} commentCount={commentCount} />
    </span>
  );
}

type RoutinePhotoCardProps = {
  readonly routine: PhotoCardRoutine;
  /** 누르면 갈 곳. 없으면 누를 수 없는 카드다(예시 루틴, S179). */
  readonly href?: string;
  readonly onNavigate?: () => void;
  /** 작성자 줄이나 공개 표지 줄 */
  readonly footer?: ReactNode;
  /** 이름 줄 아래의 안내(제품 상세의 '이 루틴에 내가 써 본 제품이 있어요') */
  readonly notice?: ReactNode;
  /** 이름 줄 오른쪽 끝의 표지. 있으면 꺾쇠 대신 둔다(예시 루틴의 '예시'). */
  readonly nameTag?: ReactNode;
  /** 제품 상세의 지금 제품. 그 사진에 브랜드 테두리를 두고, 넷째 이후면 셋째 칸으로 당긴다. */
  readonly currentProductId?: number;
  /** 파우치에서 평가한 제품. 사진에 평가 배지를 겹친다. */
  readonly ratings?: ReadonlyMap<number, RatingPreference>;
  /** 사진 판 높이를 120 으로 고정한다. 가로로 늘어놓는 줄(제품 상세)에서 카드 높이를 맞춘다. */
  readonly fixedPanel?: boolean;
  readonly className?: string;
};

/**
 * 사진 판 루틴 카드(명세 j6nApu · f4aBOT). 위는 회색 사진 판(아침 줄 · 저녁 줄), 아래는 이름과 작성자 줄이다.
 * 둘러보기, 내 루틴 전체 보기, 제품 상세 '이 제품이 들어간 루틴'이 함께 쓴다.
 * 제품이 없는 시간대 줄은 숨기고, 둘 다 없으면 사진 판에 '아직 담은 제품이 없어요' 한 줄을 둔다(S183).
 * hover·눌림은 카드 면 ui-surface, 사진 판은 한 단계 진한 ui-hover-on-surface 다(STATE S03 · S07).
 */
export function RoutinePhotoCard({
  routine,
  href,
  onNavigate,
  footer,
  notice,
  nameTag,
  currentProductId,
  ratings,
  fixedPanel = false,
  className,
}: RoutinePhotoCardProps) {
  const { pressableProps } = usePressable();
  const filled = TIMES_OF_DAY.filter((key) => routine[key].length > 0);

  const body = (
    <>
      <span
        className={cn(
          "flex flex-col justify-center gap-2 bg-surface p-4",
          href && "in-data-hovered:bg-hover-on-surface in-data-pressed:bg-hover-on-surface",
          fixedPanel && "h-30",
        )}
      >
        {filled.length === 0 ? (
          <span className="text-caption text-text-secondary">아직 담은 제품이 없어요</span>
        ) : (
          filled.map((key) => (
            <PhotoRow
              key={key}
              timeOfDay={key}
              products={routine[key]}
              currentProductId={currentProductId}
              ratings={ratings}
            />
          ))
        )}
      </span>
      <span className="flex flex-col gap-3 p-4">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-body font-bold text-text-primary">{routine.name}</span>
          {nameTag ?? (href ? <Icon name="chevron-right" size={20} className="shrink-0 text-text-secondary" /> : null)}
        </span>
        {notice}
        {footer}
      </span>
    </>
  );

  const frame = "flex flex-col overflow-hidden rounded-lg border border-border bg-background";
  if (!href) return <div className={cn(frame, className)}>{body}</div>;

  return (
    <Link
      {...pressableProps}
      href={href}
      onNavigate={onNavigate}
      className={cn("pressable press-scale fb-surface", frame, className)}
    >
      {body}
    </Link>
  );
}
