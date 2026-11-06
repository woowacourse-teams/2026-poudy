"use client";

import { YouTubeOrderRequest, type YouTubeChannelOrderResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminButton, ADMIN_FIELD } from "@/components/admin/AdminControls";
import { AdminShell } from "@/components/admin/AdminShell";
import { fetchYouTubeOrder, saveYouTubeOrder } from "@/lib/api/youtube";

function ChannelOrderRow({
  channel,
  onSaved,
}: {
  readonly channel: YouTubeChannelOrderResponse;
  readonly onSaved: () => void;
}) {
  const [position, setPosition] = useState(String(channel.displayOrder));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <li className="border-b border-admin-border py-4">
      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const parsed = YouTubeOrderRequest.safeParse({ displayOrder: Number(position) });
          if (!position.trim() || !parsed.success || Number(position) > 2147483647) {
            setMessage("Order에 0 이상의 정수를 입력해 주세요.");
            return;
          }
          setBusy(true);
          setMessage("");
          try {
            await saveYouTubeOrder(channel.id, parsed.data);
            setMessage("저장했어요.");
            onSaved();
          } catch {
            setMessage("저장하지 못했어요. 다시 시도해 주세요.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Link href={`/youtubers/${channel.id}`} className="min-w-40 flex-1 font-semibold">
          {channel.name}
        </Link>
        <label className="flex items-center gap-2 text-admin-caption">
          Order
          <input
            aria-label={`${channel.name} Order`}
            type="number"
            min="0"
            max="2147483647"
            step="1"
            required
            value={position}
            disabled={busy}
            onChange={(e) => {
              setPosition(e.target.value);
              setMessage("");
            }}
            className={`${ADMIN_FIELD} w-24`}
          />
        </label>
        <AdminButton type="submit" busy={busy} disabled={String(channel.displayOrder) === position}>
          저장
        </AdminButton>
        {message && (
          <p role="status" className="w-full text-admin-caption">
            {message}
          </p>
        )}
      </form>
    </li>
  );
}

function ChannelOrderList() {
  const [channels, setChannels] = useState<readonly YouTubeChannelOrderResponse[]>();
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    fetchYouTubeOrder()
      .then((items) => {
        if (alive) {
          setChannels(items);
          setFailed(false);
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [revision]);
  const reload = () => setRevision((n) => n + 1);
  if (failed)
    return (
      <div role="alert">
        유튜버 목록을 불러오지 못했어요. <AdminButton onClick={reload}>다시 시도</AdminButton>
      </div>
    );
  if (!channels) return <p role="status">유튜버를 불러오고 있어요.</p>;
  if (!channels.length) return <p>등록된 유튜버가 없어요.</p>;
  return (
    <ul>
      {channels.map((channel) => (
        <ChannelOrderRow key={`${channel.id}-${channel.displayOrder}`} channel={channel} onSaved={reload} />
      ))}
    </ul>
  );
}

export default function AdminYouTubersPage() {
  return (
    <AdminShell
      title="유튜버 순서"
      description="Order가 작은 유튜버부터 홈과 목록에 표시합니다. 같은 값이면 채널 ID 순서로 정렬합니다. 공개할 영상과 연결 제품이 있는 유튜버만 서비스에 표시됩니다."
    >
      <ChannelOrderList />
    </AdminShell>
  );
}
