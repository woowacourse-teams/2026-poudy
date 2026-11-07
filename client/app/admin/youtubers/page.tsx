"use client";

import type { YouTubeChannelOrderResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminButton } from "@/components/admin/AdminControls";
import { AdminShell } from "@/components/admin/AdminShell";
import { fetchYouTubeOrder, saveYouTubeOrder } from "@/lib/api/youtube";

function ChannelOrderList() {
  const [channels, setChannels] = useState<readonly YouTubeChannelOrderResponse[]>();
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [dragging, setDragging] = useState<string>();
  const [dropTarget, setDropTarget] = useState<string>();
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
  const move = (id: string, to: number) => {
    if (busy || !channels || to < 0 || to >= channels.length) return;
    const from = channels.findIndex((channel) => channel.id === id);
    if (from < 0 || from === to) return;
    const remaining = channels.filter((channel) => channel.id !== id);
    setChannels([...remaining.slice(0, to), channels[from], ...remaining.slice(to)]);
    setDirty(true);
    setSaveFailed(false);
    setMessage(`${channels[from].name}을(를) ${to + 1}번째로 이동했어요. 순서를 저장해 주세요.`);
  };
  const save = async () => {
    if (busy || !dirty || !channels) return;
    setBusy(true);
    setSaveFailed(false);
    setMessage("");
    try {
      // 재시도도 전체 순서를 보내 중간에 실패한 저장을 마무리한다.
      for (const [displayOrder, channel] of channels.entries()) {
        await saveYouTubeOrder(channel.id, { displayOrder });
      }
      setChannels(await fetchYouTubeOrder());
      setDirty(false);
      setMessage("순서를 저장했어요.");
    } catch {
      setSaveFailed(true);
      setMessage("저장을 완료하지 못했어요. 일부 순서가 반영됐을 수 있으니 순서 저장을 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  };
  if (failed)
    return (
      <div role="alert">
        유튜버 목록을 불러오지 못했어요. <AdminButton onClick={reload}>다시 시도</AdminButton>
      </div>
    );
  if (!channels) return <p role="status">유튜버를 불러오고 있어요.</p>;
  if (!channels.length) return <p>등록된 유튜버가 없어요.</p>;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border pb-4">
        <p id="channel-order-help" className="text-admin-caption text-admin-text-secondary">
          왼쪽 손잡이를 드래그하거나 위·아래 버튼으로 이동하세요. 손잡이에서 방향키도 사용할 수 있어요.
        </p>
        <AdminButton primary busy={busy} disabled={!dirty} onClick={save}>
          {busy ? "저장 중…" : "순서 저장"}
        </AdminButton>
      </div>
      {message && (
        <p role={saveFailed ? "alert" : "status"} className="py-3 text-admin-caption">
          {message}
        </p>
      )}
      <ol aria-label="유튜버 표시 순서" aria-busy={busy}>
        {channels.map((channel, index) => (
          <li
            key={channel.id}
            className={cn(
              "flex items-center gap-3 border-b border-admin-border py-4",
              dragging === channel.id && "opacity-50",
              dropTarget === channel.id && "bg-admin-selected ring-2 ring-inset ring-admin-brand",
            )}
            onDragOver={(event) => {
              if (!dragging || busy) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropTarget(channel.id);
            }}
            onDrop={(event) => {
              if (!dragging || busy) return;
              event.preventDefault();
              move(dragging, index);
              setDragging(undefined);
              setDropTarget(undefined);
            }}
          >
            <button
              type="button"
              draggable={!busy}
              disabled={busy}
              aria-label={`${channel.name} 순서 이동`}
              aria-describedby="channel-order-help"
              className="flex size-11 shrink-0 cursor-grab items-center justify-center rounded-admin-md text-admin-text-secondary select-none focus-visible:ring-2 focus-visible:ring-admin-brand active:cursor-grabbing disabled:opacity-50"
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", channel.id);
                setDragging(channel.id);
              }}
              onDragEnd={() => {
                setDragging(undefined);
                setDropTarget(undefined);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                  event.preventDefault();
                  move(channel.id, index + (event.key === "ArrowUp" ? -1 : 1));
                }
              }}
            >
              <span aria-hidden="true">⠿</span>
            </button>
            <span className="min-w-6 shrink-0 whitespace-nowrap tabular-nums">{index + 1}</span>
            <Link href={`/youtubers/${channel.id}`} draggable={false} className="min-w-0 flex-1 font-semibold">
              {channel.name}
            </Link>
            <div className="flex shrink-0 gap-2">
              <AdminButton
                aria-label={`${channel.name} 위로 이동`}
                disabled={busy || index === 0}
                onClick={() => move(channel.id, index - 1)}
              >
                ↑
              </AdminButton>
              <AdminButton
                aria-label={`${channel.name} 아래로 이동`}
                disabled={busy || index === channels.length - 1}
                onClick={() => move(channel.id, index + 1)}
              >
                ↓
              </AdminButton>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

export default function AdminYouTubersPage() {
  return (
    <AdminShell
      title="홈 유튜버 순서"
      description="위에 있는 유튜버부터 홈에 표시합니다. 유튜버 목록은 사용자가 선택한 정렬을 따릅니다. 순서를 바꾼 뒤 저장해 주세요. 공개할 영상과 연결 제품이 있는 유튜버만 서비스에 표시됩니다."
    >
      <ChannelOrderList />
    </AdminShell>
  );
}
