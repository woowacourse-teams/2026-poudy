"use client";

import type { RoutineCommentResponse } from "@poudy/api/api.zod";
import { BottomSheet, BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { Button } from "@poudy/design-system/button";
import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { IconButton } from "@poudy/design-system/icon-button";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { TextArea } from "@poudy/design-system/text-area";
import { useToast } from "@poudy/design-system/toast";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useVirtualKeyboardInset } from "@poudy/design-system/use-virtual-keyboard";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { RoutineCommentItem } from "./RoutineCommentItem";
import { MenuRow } from "./RoutineMenuSheet";

import { SubTopBar } from "@/components/navigation/SubTopBar";
import { ApiError } from "@/lib/api/client";
import { isSignedOut } from "@/lib/api/member";
import { deleteRoutineComment, editRoutineComment, fetchRoutineComments, writeRoutineComment } from "@/lib/api/routine";
import { RETRY_LATER } from "@/lib/domain/messages";
import { ROUTINE_COMMENT_MAX_LENGTH, routineTextLength } from "@/lib/domain/routine";
import { rememberLoginReturn } from "@/lib/storage/login-return";

/** 댓글 입력칸이 늘어나는 최대 줄 수. 넘치면 칸 안에서 스크롤한다. */
const MAX_INPUT_LINES = 3;

type CommentsState =
  | { readonly status: "loading" }
  | { readonly status: "notFound" }
  | { readonly status: "error" }
  | {
      readonly status: "ready";
      readonly items: readonly RoutineCommentResponse[];
      readonly total: number;
      readonly page: number;
      readonly hasNext: boolean;
      readonly writable: boolean;
    };

/** 댓글 목록을 쪽 단위로 읽는다. 다음 쪽을 붙일 때 이미 있는 댓글은 뺀다. */
const useComments = (routineId: number) => {
  const [state, setState] = useState<CommentsState>({ status: "loading" });

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
        (error: unknown) => {
          if (error instanceof ApiError && error.code === "ROUTINE_NOT_FOUND") {
            setState({ status: "notFound" });
            return;
          }
          setState({ status: "error" });
        },
      ),
    [routineId],
  );

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  return { state, setState, loadFirst };
};

/** 내 댓글 더보기 시트. 수정과 삭제. */
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
      <BottomSheetHeader title="내 댓글" />
      <div className="flex flex-col pb-safe">
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

/** 댓글 수정 시트. 열 때마다 원래 내용으로 시작한다. */
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

/** 루틴 댓글(/routine/[routineId]/comments, RT12). 오래된 순 목록과 아래 입력창. 답글과 댓글 좋아요는 없다. */
export function RoutineCommentsScreen({ routineId }: { readonly routineId: number }) {
  const router = useRouter();
  const toast = useToast();
  const { state, setState, loadFirst } = useComments(routineId);
  const [now] = useState(() => new Date());
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [menuComment, setMenuComment] = useState<RoutineCommentResponse>();
  const [deleting, setDeleting] = useState<RoutineCommentResponse>();
  const [editing, setEditing] = useState<RoutineCommentResponse>();
  const [loginAsked, setLoginAsked] = useState(false);
  const composerRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const keyboardInset = useVirtualKeyboardInset();
  const length = routineTextLength(draft);

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

  // 키보드가 가린 만큼 입력창을 올린다. 하단 행동 바와 같은 방식이다.
  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.transform = keyboardInset > 0 ? `translateY(-${keyboardInset}px)` : "";
  }, [keyboardInset]);
  const ready = length > 0 && length <= ROUTINE_COMMENT_MAX_LENGTH && !sending;
  const { pressableProps: sendPressableProps } = usePressable({ disabled: !ready });

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || state.status !== "ready") return;
    setSending(true);
    try {
      const comment = await writeRoutineComment(routineId, draft.trim());
      setState({ ...state, items: [...state.items, comment], total: state.total + 1 });
      setDraft("");
    } catch (error: unknown) {
      if (isSignedOut(error)) setLoginAsked(true);
      else toast.show({ message: `댓글을 남기지 못했어요. ${RETRY_LATER}` });
    } finally {
      setSending(false);
    }
  };

  const loadMore = async () => {
    if (state.status !== "ready") return;
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

  const edit = async (comment: RoutineCommentResponse, content: string) => {
    const edited = await editRoutineComment(comment.id, content);
    if (state.status === "ready") {
      setState({ ...state, items: state.items.map((item) => (item.id === edited.id ? edited : item)) });
    }
    setEditing(undefined);
    toast.show({ message: "댓글을 고쳤어요" });
  };

  const remove = async (comment: RoutineCommentResponse) => {
    try {
      await deleteRoutineComment(comment.id);
      if (state.status === "ready") {
        setState({
          ...state,
          items: state.items.filter((item) => item.id !== comment.id),
          total: state.total - 1,
        });
      }
      toast.show({ message: "댓글을 지웠어요" });
    } catch {
      toast.show({ message: `댓글을 지우지 못했어요. ${RETRY_LATER}` });
    } finally {
      setDeleting(undefined);
    }
  };

  let title = "댓글";
  if (state.status === "ready") title = `댓글 ${state.total}`;

  return (
    <Screen scroll="document" className="min-h-0 flex-1">
      <SubTopBar title={title} />
      <ScreenBody>
        <main aria-busy={state.status === "loading" || undefined} className="flex flex-1 flex-col pb-4">
          {state.status === "notFound" ? (
            <EmptyState
              icon={<Icon name="alert-circle" size={28} />}
              title="루틴을 찾을 수 없어요"
              description="삭제했거나 공개를 끈 루틴이에요."
              className="flex-1"
            />
          ) : null}
          {state.status === "error" ? (
            <ErrorState
              variant="screen"
              icon={<Icon name="alert-circle" size={28} />}
              title="댓글을 불러오지 못했어요"
              description={RETRY_LATER}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setState({ status: "loading" });
                    loadFirst();
                  }}
                >
                  다시 시도
                </Button>
              }
              className="flex-1"
            />
          ) : null}
          {state.status === "ready" && state.items.length === 0 ? (
            <EmptyState
              icon={<Icon name="message-circle" size={28} />}
              title="아직 댓글이 없어요"
              description="첫 댓글을 남겨 보세요."
              className="flex-1"
            />
          ) : null}
          {state.status === "ready" && state.items.length > 0 ? (
            <div className="flex flex-col gap-2 px-gutter pt-2">
              <ul className="flex flex-col">
                {state.items.map((comment) => (
                  <li key={comment.id}>
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
              {state.hasNext ? (
                <Button variant="secondary" busy={loadingMore} onClick={loadMore}>
                  댓글 더 보기
                </Button>
              ) : null}
            </div>
          ) : null}
        </main>
      </ScreenBody>

      {state.status === "ready" && !state.writable ? (
        <p className="sticky bottom-0 z-(--z-sticky) border-t border-border bg-background px-gutter pt-3 pb-safe text-center text-body-sm text-text-secondary">
          비공개 루틴이라 댓글을 남길 수 없어요.
        </p>
      ) : null}
      {state.status === "ready" && state.writable ? (
        <form
          ref={composerRef}
          onSubmit={send}
          className="sticky bottom-0 z-(--z-sticky) flex shrink-0 flex-col border-t border-border bg-background px-gutter pt-2 pb-safe"
        >
          <div className="flex items-end gap-2 pb-2">
            <div className="flex min-h-12 min-w-0 flex-1 items-center rounded-3xl bg-surface px-4 py-3">
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  // 키보드가 있으면 Enter 는 보내고 Shift+Enter 는 줄을 바꾼다. 터치 화면 키보드에는 Shift+Enter 가 없어
                  // Enter 로 줄을 바꾸고 보내기 버튼으로 보낸다. 한글을 조합하는 중의 Enter 는 글자를 끝내는 것이라 보내지 않는다.
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
            <button
              {...sendPressableProps}
              type="submit"
              aria-label="댓글 보내기"
              disabled={!ready}
              className="pressable press-scale fb-dim flex size-12 shrink-0 items-center justify-center rounded-full bg-action text-action-text disabled:bg-surface disabled:text-text-muted"
            >
              <Icon name="chevron-up" size={20} />
            </button>
          </div>
        </form>
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
      <ConfirmSheet
        open={loginAsked}
        title="댓글을 남기려면 로그인이 필요해요"
        description="로그인하면 루틴에 궁금한 점이나 써 본 경험을 남길 수 있어요."
        confirmLabel="로그인하고 댓글 남기기"
        cancelLabel="다음에 할게요"
        onConfirm={() => {
          setLoginAsked(false);
          rememberLoginReturn();
          router.push("/login");
        }}
        onCancel={() => setLoginAsked(false)}
      />
    </Screen>
  );
}
