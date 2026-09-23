/**
 * 줄바꿈을 걷어 낸 한 줄 문구.
 *
 * 서버는 홈 캐러셀 카드 위에서 줄을 나누려고 큐레이션 제목과 설명에 줄바꿈을 넣어 내려 준다.
 * 그 카드 밖에서 쓰면 한 낱말이 끊겨 보이거나 문서 제목과 공유 카드에 줄바꿈이 그대로
 * 들어가므로, 공백으로 합친다.
 */
export const curationOneLine = (text: string): string => text.replace(/\s+/g, " ").trim();
