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

/**
 * 시트가 다 열릴 때까지 기다린다. 시트는 붙은 뒤 두 프레임을 기다려 data-state 를 open 으로 바꾸고 그때 올라오기
 * 시작한다. 그 전에 settled 로 확인하면 아직 도는 전환이 없어 바로 지나가므로, open 이 된 뒤에 전환 끝을 기다린다.
 */
export async function opened(dialog: Element) {
  await waitFor(() => expect(dialog).toHaveAttribute("data-state", "open"));
  await settled(dialog);
}
