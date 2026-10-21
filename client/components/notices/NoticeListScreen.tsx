"use client";

import type { NoticeResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { LoadMore } from "@poudy/design-system/load-more";
import { Screen } from "@poudy/design-system/screen";
import { TopBar } from "@poudy/design-system/top-bar";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useSubScreenBack } from "@/components/navigation/useSubScreenBack";
import { findNotices } from "@/lib/api/notices";
import { formatDate } from "@/lib/domain/format";

const MESSAGES = {
  loading: (loaded: string, total: string) => `${loaded} / ${total} · 다음 공지 불러오는 중`,
  failed: "다음 공지를 불러오지 못했어요",
  next: "다음 공지 보기",
};

type ListState = {
  readonly items: readonly NoticeResponse[];
  readonly page: number;
  readonly total: number;
  readonly hasNext: boolean;
};

/**
 * 공지 목록(명세 S57 · S57-1 · S57-2). 최근 공개 순이고, 끝에 닿으면 다음 장을 저절로 불러온다(APP · 목록 더 불러오기 상태).
 * 행 전체가 공지 상세로 가는 링크다. 공지는 사용자가 만들 수 없어 비었을 때 행동 버튼을 두지 않는다.
 */
export function NoticeListScreen() {
  const back = useSubScreenBack();
  const [list, setList] = useState<ListState | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback((page: number) => {
    setLoading(true);
    setFailed(false);
    findNotices(page)
      .then((data) =>
        setList((prev) => ({
          items: page === 1 || !prev ? data.items : [...prev.items, ...data.items],
          page,
          total: data.pagination.totalElements,
          hasNext: data.pagination.hasNext,
        })),
      )
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // 처음 한 장을 받는다. 상태는 응답이 온 뒤에 바뀐다.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 첫 요청을 시작하며 불러오는 중으로 둔다
    load(1);
  }, [load]);

  let body;
  if (!list) {
    body = failed ? (
      <ErrorState
        variant="screen"
        icon={<Icon name="speakerphone" size={28} />}
        title="공지를 불러오지 못했어요"
        description="잠시 뒤에 다시 시도해 주세요"
        action={
          <Button variant="secondary" onClick={() => load(1)}>
            다시 시도
          </Button>
        }
        className="flex-1"
      />
    ) : null;
  } else if (!list.items.length) {
    body = (
      <EmptyState
        icon={<Icon name="speakerphone" size={28} />}
        title="아직 공지사항이 없어요"
        description="새 소식이 생기면 여기에서 알려 드릴게요"
        className="flex-1"
      />
    );
  } else {
    body = (
      <>
        <ul aria-busy={loading || undefined}>
          {list.items.map((item) => (
            <li key={item.id}>
              <NoticeRow notice={item} />
            </li>
          ))}
        </ul>
        <LoadMore
          direction="next"
          status={!list.hasNext ? "end" : failed ? "failed" : loading ? "loading" : "idle"}
          loadedCount={list.items.length}
          totalCount={list.total}
          onLoad={() => load(list.page + 1)}
          onRetry={() => load(list.page + 1)}
          messages={MESSAGES}
        />
      </>
    );
  }

  return (
    <Screen scroll="document">
      <TopBar variant="sub" title="공지사항" back={back} />
      <main aria-busy={(!list && loading) || undefined} className="flex flex-1 flex-col">
        {body}
      </main>
    </Screen>
  );
}

/**
 * 공지 행. hover · 눌림 면은 화면 폭 전체이고, 구분선은 안쪽 내용 칸 아래에 둬 화면 여백만큼 들어가 있다(STATE S04, LAYOUT L05).
 * 스크롤하며 스친 행이 깜박이지 않게 눌림을 조금 늦게 켠다.
 */
function NoticeRow({ notice }: { readonly notice: NoticeResponse }) {
  const { pressableProps } = usePressable({ delayMs: 80 });

  return (
    <Link href={`/notices/${notice.id}`} {...pressableProps} className="pressable fb-surface block px-gutter">
      <span className="flex flex-col gap-1 border-b border-border py-4">
        <span className="text-title leading-snug font-semibold break-keep text-text-primary">{notice.title}</span>
        {notice.firstPublishedAt ? (
          <time dateTime={notice.firstPublishedAt} className="text-body-sm leading-snug text-text-secondary">
            {formatDate(notice.firstPublishedAt)}
          </time>
        ) : null}
      </span>
    </Link>
  );
}
