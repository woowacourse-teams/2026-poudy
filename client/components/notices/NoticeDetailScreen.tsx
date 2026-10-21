"use client";

import type { NoticeResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Screen } from "@poudy/design-system/screen";
import { TopBar } from "@poudy/design-system/top-bar";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { NoticeBody } from "./NoticeBody";

import { useSubScreenBack } from "@/components/navigation/useSubScreenBack";
import { findNotice, recordNoticeView } from "@/lib/api/notices";
import { formatDate } from "@/lib/domain/format";

/** 밖에서 바로 들어와 이전 화면이 없으면 ‹ 는 공지 목록으로 간다. */
const LIST = { href: "/notices", label: "공지사항 목록" };

/**
 * 공지 상세(명세 S57a). 제목 → 공개일 → 내용 → [목록 보기] 순서다. 공지 띠로 바로 들어온 사람도 [목록 보기]로 다른 공지를
 * 찾아갈 수 있다. 이전 글 · 다음 글은 두지 않는다. 상단 내비 제목이 h1('공지사항')이고 공지 제목은 h2 다.
 */
export function NoticeDetailScreen({ id }: { readonly id: string }) {
  const router = useRouter();
  const back = useSubScreenBack(LIST);
  const [notice, setNotice] = useState<NoticeResponse | null>(null);
  const [error, setError] = useState(false);
  const counted = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    findNotice(id)
      .then((data) => {
        if (!active) return;
        setError(false);
        setNotice(data);
        if (counted.current !== data.id) {
          counted.current = data.id;
          recordNoticeView(data.id).catch(() => {});
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      counted.current = null;
    };
  }, [id]);

  const toList = (
    <Button variant="secondary" onClick={() => router.push(LIST.href)} className="w-full">
      목록 보기
    </Button>
  );

  return (
    <Screen scroll="document">
      <TopBar variant="sub" title="공지사항" back={back} />
      {error ? (
        <main className="flex flex-1 flex-col">
          <ErrorState
            variant="screen"
            icon={<Icon name="speakerphone" size={28} />}
            title="공지를 불러오지 못했어요"
            description="비공개로 바뀌었거나 삭제되었을 수 있어요"
            action={toList}
            className="flex-1"
          />
        </main>
      ) : notice?.id === id ? (
        <main className="flex flex-col gap-6 px-gutter pt-5 pb-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-screen leading-tight font-bold break-keep text-text-primary">{notice.title}</h2>
            {notice.firstPublishedAt ? (
              <time dateTime={notice.firstPublishedAt} className="text-body-sm leading-snug text-text-secondary">
                {formatDate(notice.firstPublishedAt)}
              </time>
            ) : null}
          </div>
          <NoticeBody content={notice.content} imageIds={notice.images.map((i) => i.imageId)} noticeId={notice.id} />
          {toList}
        </main>
      ) : (
        <main aria-busy="true" className="flex-1" />
      )}
    </Screen>
  );
}
