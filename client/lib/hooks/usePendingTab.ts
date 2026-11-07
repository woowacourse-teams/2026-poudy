import { useRouter } from "next/navigation";
import { startTransition, useOptimistic } from "react";

/**
 * 다른 화면으로 가는 탭이 응답을 기다리지 않고 누른 탭을 먼저 고른 것으로 보이게 한다. 밑줄도 누른 자리에서 바로 옮겨 간다.
 *
 * 이동을 transition 으로 감싸 그동안만 누른 탭을 보인다. 이동이 끝나면 주소에서 읽은 `current` 로 돌아가므로, 이동이 버려지거나
 * 다른 이동에 밀려도 누른 탭이 남지 않는다. 링크의 이동을 대신 맡는 것이라 새 탭에서 열기와 미리 받기는 링크가 그대로 한다.
 */
export function usePendingTab<T>(current: T) {
  const router = useRouter();
  const [shown, setShown] = useOptimistic(current);

  /** 링크의 onNavigate 로 넘긴다. 링크 대신 같은 주소로 옮긴다. */
  const navigate =
    (tab: T, href: string, { replace = false }: { readonly replace?: boolean } = {}) =>
    (event: { readonly preventDefault: () => void }) => {
      event.preventDefault();
      startTransition(() => {
        setShown(tab);
        if (replace) router.replace(href);
        else router.push(href);
      });
    };

  return [shown, navigate] as const;
}
