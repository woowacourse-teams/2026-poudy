"use client";

import type { RoutineCommentResponse } from "@poudy/api/api.zod";
import { BottomSheet, BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { IconButton } from "@poudy/design-system/icon-button";
import { TextArea } from "@poudy/design-system/text-area";
import { useToast } from "@poudy/design-system/toast";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useVirtualKeyboardInset } from "@poudy/design-system/use-virtual-keyboard";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { RoutineCommentItem } from "./RoutineCommentItem";
import { MenuRow } from "./RoutineMenuSheet";

import { completeFeatureIntent, requestFeatureLogin } from "@/lib/analytics/feature-login";
import { routineFlow } from "@/lib/analytics/routine";
import { track } from "@/lib/analytics/track";
import { isSignedOut } from "@/lib/api/member";
import { deleteRoutineComment, editRoutineComment, fetchRoutineComments, writeRoutineComment } from "@/lib/api/routine";
import { RETRY_LATER } from "@/lib/domain/messages";
import { ROUTINE_COMMENT_MAX_LENGTH, routineTextLength } from "@/lib/domain/routine";
import { useHeightVariable } from "@/lib/hooks/useHeightVariable";
import { rememberLoginReturn } from "@/lib/storage/login-return";

/** 댓글 입력칸이 늘어나는 최대 줄 수. 넘치면 칸 안에서 스크롤한다. */
const MAX_INPUT_LINES = 3;

/** 상세 안 댓글 자리의 id. 반응 줄의 '댓글 N'과 옛 댓글 주소(/routines/[id]/comments → #comments)가 여기로 내려온다. */
export const COMMENTS_ANCHOR = "comments";

export type CommentsState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | {
      readonly status: "ready";
      readonly items: readonly RoutineCommentResponse[];
      readonly total: number;
      readonly page: number;
      readonly hasNext: boolean;
      readonly writable: boolean;
    };

/** 댓글 자리로 내려간다. 붙은 상단 내비 높이만큼은 자리의 scroll-margin 이 띄운다. */
export const scrollToComments = (behavior: ScrollBehavior = "smooth") => {
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  document.getElementById(COMMENTS_ANCHOR)?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : behavior });
};

/**
 * 루틴 상세 안의 댓글(S185 · S198 · S206~S211). 목록을 쪽 단위로 읽고, 쓰기·고치기·지우기를 이 목록에 바로 반영한다.
 * 목록과 화면 아래 입력 바가 같은 상태를 쓴다.
 */
export const useRoutineComments = (routineId: number, version?: unknown) => {
  const toast = useToast();
  const [state, setState] = useState<CommentsState>({ status: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);

  const loadFirst = useCallback(
    () =>
      fetchRoutineComments(routineId, 1).then(
        (page) =>
          setState({
            status: "ready",
            items: page.items,
            total: page.pagination.totalElements,
            page: 1,
            hasNext: page.pagination.hasNext,
            writable: page.writable,
          }),
        () => setState({ status: "error" }),
      ),
    // 공개 여부를 바꾸면(version) 쓸 수 있는지(writable)가 바뀌어 다시 읽는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routineId, version],
  );

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  const retry = () => {
    setState({ status: "loading" });
    loadFirst();
  };

  /** 다음 쪽을 붙인다. 이미 있는 댓글은 뺀다. 버튼으로만 부르고 보이면 자동으로 부르지 않는다(기존 동작). */
  const loadMore = async () => {
    if (state.status !== "ready" || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await fetchRoutineComments(routineId, state.page + 1);
      const seen = new Set(state.items.map((comment) => comment.id));
      setState({
        ...state,
        items: [...state.items, ...next.items.filter((comment) => !seen.has(comment.id))],
        total: next.pagination.totalElements,
        page: state.page + 1,
        hasNext: next.pagination.hasNext,
      });
    } catch {
      toast.show({ message: `댓글을 더 불러오지 못했어요. ${RETRY_LATER}` });
    } finally {
      setLoadingMore(false);
    }
  };

  const added = (comment: RoutineCommentResponse) => {
    if (state.status === "ready") setState({ ...state, items: [...state.items, comment], total: state.total + 1 });
  };

  const edited = (comment: RoutineCommentResponse) => {
    if (state.status === "ready")
      setState({ ...state, items: state.items.map((item) => (item.id === comment.id ? comment : item)) });
  };

  const removed = (commentId: number) => {
    if (state.status === "ready")
      setState({ ...state, items: state.items.filter((item) => item.id !== commentId), total: state.total - 1 });
  };

  return { state, loadingMore, retry, loadMore, added, edited, removed };
};

export type RoutineCommentThread = ReturnType<typeof useRoutineComments>;

/**
 * 내 댓글 더보기 시트(S209). 제목 머리는 화면에 두지 않고 시트 이름으로만 읽힌다. 댓글 수정·댓글 삭제 두 줄이다.
 * 비공개로 바뀐 루틴은 수정할 수 없어 삭제만 둔다.
 */
function CommentMenuSheet({
  comment,
  onClose,
  onEdit,
  onDelete,
  editable,
}: {
  readonly comment: RoutineCommentResponse | undefined;
  readonly onClose: () => void;
  readonly onEdit: (comment: RoutineCommentResponse) => void;
  readonly onDelete: (comment: RoutineCommentResponse) => void;
  readonly editable: boolean;
}) {
  // 닫히는 동안에도 마지막 댓글을 그대로 쓴다.
  const [shown, setShown] = useState(comment);
  if (comment && comment !== shown) setShown(comment);

  return (
    <BottomSheet open={comment !== undefined} onClose={onClose}>
      <div className="sr-only">
        <BottomSheetHeader title="내 댓글" />
      </div>
      <div className="flex flex-col pt-2 pb-safe">
        {editable ? (
          <MenuRow
            icon="pencil"
            label="댓글 수정"
            onPress={() => {
              if (shown) onEdit(shown);
            }}
          />
        ) : null}
        <MenuRow
          icon="trash"
          label="댓글 삭제"
          danger
          onPress={() => {
            if (shown) onDelete(shown);
          }}
        />
      </div>
    </BottomSheet>
  );
}

/** 댓글 수정 시트(S209-1). 열 때마다 원래 내용으로 시작한다. */
function CommentEditSheet({
  comment,
  onClose,
  onSave,
}: {
  readonly comment: RoutineCommentResponse | undefined;
  readonly onClose: () => void;
  readonly onSave: (comment: RoutineCommentResponse, content: string) => Promise<unknown>;
}) {
  const [shown, setShown] = useState(comment);
  if (comment && comment !== shown) setShown(comment);

  return (
    <BottomSheet open={comment !== undefined} onClose={onClose}>
      {shown ? <CommentEditForm key={shown.id} comment={shown} onClose={onClose} onSave={onSave} /> : null}
    </BottomSheet>
  );
}

function CommentEditForm({
  comment,
  onClose,
  onSave,
}: {
  readonly comment: RoutineCommentResponse;
  readonly onClose: () => void;
  readonly onSave: (comment: RoutineCommentResponse, content: string) => Promise<unknown>;
}) {
  const [value, setValue] = useState(comment.content);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const length = routineTextLength(value);
  const ready = length > 0 && length <= ROUTINE_COMMENT_MAX_LENGTH;

  const save = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await onSave(comment, value.trim());
    } catch {
      setBusy(false);
      setFailed(true);
    }
  };

  return (
    <>
      <BottomSheetHeader title="댓글 수정" onClose={onClose} />
      <BottomSheetBody>
        <div className="pb-2">
          <TextArea
            label="댓글"
            value={value}
            onChange={setValue}
            maxLength={ROUTINE_COMMENT_MAX_LENGTH}
            countOf={routineTextLength}
            serverError={failed ? `고치지 못했어요. ${RETRY_LATER}` : undefined}
          />
        </div>
      </BottomSheetBody>
      <BottomSheetFooter primary={{ label: "저장", onClick: save, busy, disabled: !ready }} />
    </>
  );
}

/**
 * 상세 안의 댓글 목록(S185 · S198). 제목 '댓글 N' 아래에 오래된 순으로 둔다. 내 댓글에는 ⋮ 로 수정·삭제 시트를 연다.
 * 댓글만 불러오지 못하면 이 자리에만 알리고 루틴 본문과 입력 바는 그대로 둔다(S211).
 */
export function RoutineCommentSection({
  thread,
  emptyText,
}: {
  readonly thread: RoutineCommentThread;
  /** 댓글이 없을 때의 한 줄. 없으면 아무것도 두지 않는다. */
  readonly emptyText?: string;
}) {
  const toast = useToast();
  const { state } = thread;
  const [now] = useState(() => new Date());
  const [menuComment, setMenuComment] = useState<RoutineCommentResponse>();
  const [deleting, setDeleting] = useState<RoutineCommentResponse>();
  const [editing, setEditing] = useState<RoutineCommentResponse>();

  const edit = async (comment: RoutineCommentResponse, content: string) => {
    thread.edited(await editRoutineComment(comment.id, content));
    setEditing(undefined);
    toast.show({ message: "댓글을 고쳤어요" });
  };

  const remove = async (comment: RoutineCommentResponse) => {
    try {
      await deleteRoutineComment(comment.id);
      thread.removed(comment.id);
      toast.show({ message: "댓글을 지웠어요" });
    } catch {
      toast.show({ message: `댓글을 지우지 못했어요. ${RETRY_LATER}` });
    } finally {
      setDeleting(undefined);
    }
  };

  // 옛 댓글 주소(/routines/[id]/comments)에서 넘어오면 #comments 로 온다. 댓글을 받은 뒤 한 번만 그 자리로 내려간다.
  const ready = state.status === "ready";
  const arrived = useRef(false);
  useEffect(() => {
    if (!ready || arrived.current || window.location.hash !== `#${COMMENTS_ANCHOR}`) return;
    arrived.current = true;
    scrollToComments("auto");
  }, [ready]);

  let title = "댓글";
  if (state.status === "ready") title = `댓글 ${state.total}`;

  return (
    <section
      id={COMMENTS_ANCHOR}
      aria-labelledby="routine-comments-title"
      aria-busy={state.status === "loading" || undefined}
      className="flex scroll-mt-11 flex-col gap-2 px-gutter pt-8"
    >
      <h2 id="routine-comments-title" className="text-section font-bold text-text-primary">
        {title}
      </h2>
      {state.status === "error" ? (
        <ErrorState variant="section" onRetry={thread.retry}>
          댓글을 불러오지 못했어요
        </ErrorState>
      ) : null}
      {state.status === "ready" && state.items.length === 0 && emptyText ? (
        <p className="py-2 text-body text-text-secondary">{emptyText}</p>
      ) : null}
      {state.status === "ready" && state.items.length > 0 ? (
        <ul className="flex flex-col">
          {state.items.map((comment) => (
            <li key={comment.id} data-comment-id={comment.id}>
              <RoutineCommentItem
                comment={comment}
                now={now}
                trailing={
                  comment.mine ? (
                    <IconButton
                      label="댓글 더보기"
                      aria-haspopup="dialog"
                      align="end"
                      icon={<Icon name="dots-vertical" size={20} className="text-text-secondary" />}
                      onClick={() => setMenuComment(comment)}
                    />
                  ) : null
                }
              />
            </li>
          ))}
        </ul>
      ) : null}
      {state.status === "ready" && state.hasNext ? (
        <Button variant="secondary" busy={thread.loadingMore} onClick={thread.loadMore}>
          댓글 더 보기
        </Button>
      ) : null}

      <CommentMenuSheet
        comment={menuComment}
        editable={state.status === "ready" && state.writable}
        onClose={() => setMenuComment(undefined)}
        onEdit={(comment) => {
          setMenuComment(undefined);
          setEditing(comment);
        }}
        onDelete={(comment) => {
          setMenuComment(undefined);
          setDeleting(comment);
        }}
      />
      <CommentEditSheet comment={editing} onClose={() => setEditing(undefined)} onSave={edit} />
      <ConfirmSheet
        open={deleting !== undefined}
        title="댓글을 지울까요?"
        description="지운 댓글은 되돌릴 수 없어요."
        confirmLabel="삭제"
        tone="destructive"
        onConfirm={() => {
          if (deleting) remove(deleting);
        }}
        onCancel={() => setDeleting(undefined)}
      />
    </section>
  );
}

/**
 * 화면 아래 댓글 입력 바(명세 APP · 댓글 입력 바 bwRSM). 입력칸(모서리 8, 쓰는 중에도 회색 면에 테두리만 켬) 옆에 글자 버튼 '등록'을 둔다.
 * '등록'은 고스트 버튼(높이 32 · 좌우 8 · 13/600) 모양이지만 글자는 브랜드색 대신 검정이고, 비어 있으면 흐린 글자다(이 자리의 예외).
 * 로그인 전이면 입력칸을 누르는 순간 로그인 안내 시트를 연다(S207). 비공개 루틴은 입력 바 대신 그 까닭을 적는다(S186).
 * 위 여백은 화면 인스턴스 값 8 이다. 토스트는 이 바 바로 위에 뜬다(data-toast-offset, globals.css).
 */
export function RoutineCommentBar({
  routineId,
  thread,
  signedOut,
}: {
  readonly routineId: number;
  readonly thread: RoutineCommentThread;
  /** 로그인 전인지. 모르면 false 로 두고, 보낼 때 401 이 오면 같은 시트를 연다. */
  readonly signedOut: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { state } = thread;
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loginAsked, setLoginAsked] = useState(false);
  const writable = state.status !== "ready" || state.writable;
  // 문의 버튼과 토스트가 이 줄 위에 뜨도록 높이를 알린다. 글이 길어져 입력창이 늘면 따라 올라간다.
  const composerRef = useHeightVariable<HTMLFormElement>("--bottom-action-bar-measured", writable);
  const privateNoticeRef = useHeightVariable<HTMLParagraphElement>("--bottom-action-bar-measured", !writable);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const keyboardInset = useVirtualKeyboardInset();
  const length = routineTextLength(draft);
  const ready = length > 0 && length <= ROUTINE_COMMENT_MAX_LENGTH && !sending && state.status === "ready";
  const { pressableProps } = usePressable({ disabled: !ready });

  // 입력한 줄 수만큼 칸을 늘리되 세 줄까지만 늘리고, 그보다 길면 칸 안에서 스크롤한다.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    // 안쪽 여백은 바깥 틀이 가져서, 글자 영역이 줄 높이의 정확히 세 배에서 잘린다.
    const maxHeight = parseFloat(getComputedStyle(input).lineHeight) * MAX_INPUT_LINES;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`;
    input.style.overflowY = input.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [draft]);

  // 키보드가 가린 만큼 입력 바를 올린다. 하단 행동 바와 같은 방식이다.
  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.transform = keyboardInset > 0 ? `translateY(-${keyboardInset}px)` : "";
  }, [composerRef, keyboardInset]);

  const askLogin = () => {
    inputRef.current?.blur();
    setLoginAsked(true);
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setSending(true);
    try {
      const comment = await writeRoutineComment(routineId, draft.trim());
      completeFeatureIntent("routine_comment", routineId);
      track("routine_comment_submitted", {
        ...routineFlow(routineId),
        routine_id: routineId,
        comment_id: comment.id,
        content_length: routineTextLength(draft.trim()),
        is_routine_author: comment.byRoutineAuthor,
      });
      thread.added(comment);
      setDraft("");
      // 보낸 댓글은 목록 맨 아래에 붙는다. 그 자리가 보이게 내려간다.
      requestAnimationFrame(() =>
        document.querySelector(`[data-comment-id="${comment.id}"]`)?.scrollIntoView({ block: "nearest" }),
      );
    } catch (error: unknown) {
      if (isSignedOut(error)) setLoginAsked(true);
      else toast.show({ message: `댓글을 남기지 못했어요. ${RETRY_LATER}` });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {writable ? (
        <form
          ref={composerRef}
          onSubmit={send}
          data-toast-offset="action-bar"
          className="sticky bottom-0 z-(--z-sticky) flex shrink-0 items-end gap-1 border-t border-border bg-background px-gutter pt-2 pb-safe"
        >
          <div className="flex min-h-12 min-w-0 flex-1 items-center rounded-sm border border-transparent bg-surface px-3 py-3 has-focus-visible:border-text-primary has-[textarea:focus]:border-text-primary">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onPointerDown={(event) => {
                if (!signedOut) return;
                event.preventDefault();
                askLogin();
              }}
              onFocus={() => {
                if (signedOut) askLogin();
              }}
              onKeyDown={(event) => {
                // 키보드가 있으면 Enter 는 보내고 Shift+Enter 는 줄을 바꾼다. 터치 화면 키보드에는 Shift+Enter 가 없어
                // Enter 로 줄을 바꾸고 '등록'으로 보낸다. 한글을 조합하는 중의 Enter 는 글자를 끝내는 것이라 보내지 않는다.
                if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
                if (window.matchMedia("(pointer: coarse)").matches) return;
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }}
              maxLength={ROUTINE_COMMENT_MAX_LENGTH}
              aria-label="댓글"
              placeholder="댓글을 남겨 보세요"
              className="block w-full resize-none bg-transparent p-0 text-body leading-normal text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
          <div className="flex h-12 shrink-0 items-center">
            <button
              {...pressableProps}
              type="submit"
              aria-disabled={!ready || undefined}
              aria-busy={sending || undefined}
              className={cn(
                // 막힌 동안은 흐린 글자색(ui-disabled-text)으로만 알린다. 버튼 전체를 흐리게 하는 기본 비활성 규칙은 끈다.
                "pressable press-scale fb-surface flex h-8 items-center rounded-xl px-2 text-body-sm leading-none font-semibold whitespace-nowrap select-none after:absolute after:-inset-y-1.5 after:inset-x-0 aria-disabled:opacity-100",
                ready ? "text-text-primary" : "text-disabled-text",
              )}
            >
              등록
            </button>
          </div>
        </form>
      ) : (
        <p
          ref={privateNoticeRef}
          data-toast-offset="action-bar"
          className="sticky bottom-0 z-(--z-sticky) border-t border-border bg-background px-gutter pt-3 pb-safe text-center text-body-sm text-text-secondary"
        >
          비공개 루틴이라 댓글을 남길 수 없어요.
        </p>
      )}
      <ConfirmSheet
        open={loginAsked}
        title="댓글을 남기려면 로그인이 필요해요"
        description="로그인하면 루틴에 궁금한 점이나 써 본 경험을 남길 수 있어요."
        confirmLabel="로그인"
        cancelLabel="다음에"
        onConfirm={() => {
          setLoginAsked(false);
          rememberLoginReturn();
          requestFeatureLogin("routine_comment", routineId);
          router.push("/login");
        }}
        onCancel={() => setLoginAsked(false)}
      />
    </>
  );
}
