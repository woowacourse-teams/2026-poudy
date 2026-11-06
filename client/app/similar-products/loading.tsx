import { Skeleton } from "@poudy/design-system/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="유사템을 불러오는 중" className="flex flex-col gap-6">
      <Skeleton shape="card" className="h-28 w-full" />
      <Skeleton shape="line" size={16} className="w-40" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} shape="card" className="h-28 w-full" />
      ))}
    </div>
  );
}
