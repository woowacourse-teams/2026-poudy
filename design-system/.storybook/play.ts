import { expect, waitFor } from "storybook/test";
import type { UserEventObject } from "storybook/test";

/**
 * 요소의 가운데를 마우스로 누르고 뗀다. play 함수에서 userEvent.click 대신 쓴다.
 *
 * user-event 의 click 은 포인터 좌표를 0,0 으로 보낸다. usePressable 은 뗀 자리가 요소 밖이면 누름을 취소하므로
 * (STATE S05), 그 좌표로는 버튼이 눌리지 않는다. 실제 사용자처럼 요소 위의 좌표를 실어 보낸다.
 */
export async function press(userEvent: UserEventObject, element: Element) {
  const rect = element.getBoundingClientRect();
  const coords = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
  await userEvent.pointer([
    { target: element, coords },
    { keys: "[MouseLeft]", target: element, coords },
  ]);
}

/**
 * 요소와 그 안의 전환·애니메이션이 모두 끝날 때까지 기다린다. 시트처럼 움직이며 나타나는 요소를 누르기 전에 쓴다.
 * 움직이는 동안 누르면 누른 자리와 뗀 자리가 달라져 usePressable 이 누름을 취소한다.
 */
export async function settled(element: Element) {
  await waitFor(() => expect(element.getAnimations({ subtree: true })).toHaveLength(0));
}
