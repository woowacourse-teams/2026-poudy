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
  const parts = content.split(/(https?:\/\/[^\s<>]+)/g);
  return (
    <div className="space-y-4 text-body leading-relaxed text-text-body">
      <p className="whitespace-pre-wrap break-words">
        {parts.map((part, i) =>
          /^https?:\/\//.test(part) ? (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all text-brand underline">
              {part}
            </a>
          ) : (
            part
          ),
        )}
      </p>
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
