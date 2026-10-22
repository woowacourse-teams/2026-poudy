import { keepQuoteWithParticle } from "@poudy/design-system/keep-quote";

import { noticeImageUrl } from "@/lib/api/notices";

export function NoticeBody({
  content,
  imageIds = [],
  noticeId,
}: {
  readonly content: string;
  readonly imageIds?: readonly string[];
  readonly noticeId?: string;
}) {
  // 빈 줄로 나눈 덩어리를 문단으로 보고 사이를 16 띄운다. 문단 안의 줄바꿈은 그대로 두고, 낱말 중간에서 줄을 나누지 않는다(명세 S57a).
  const paragraphs = content.split(/\n\s*\n/).filter((paragraph) => paragraph.trim());
  return (
    <div className="space-y-4 text-body leading-relaxed text-text-body">
      {paragraphs.map((paragraph, p) => (
        <p key={p} className="break-keep break-words whitespace-pre-wrap">
          {paragraph.split(/(https?:\/\/[^\s<>]+)/g).map((part, i) =>
            /^https?:\/\//.test(part) ? (
              <a
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-brand underline"
              >
                {part}
              </a>
            ) : (
              keepQuoteWithParticle(part)
            ),
          )}
        </p>
      ))}
      {imageIds.map((id) => (
        <figure key={id}>
          {/* 서버가 검증·재인코딩한 사용자 첨부 이미지. 고정 비율로 자르지 않고 원래 비율로 표시한다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={noticeImageUrl(id, noticeId)} alt="공지 첨부 이미지" className="h-auto w-full rounded-lg" />
        </figure>
      ))}
    </div>
  );
}
