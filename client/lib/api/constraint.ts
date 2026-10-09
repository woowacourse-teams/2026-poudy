/**
 * 생성된 스키마에서 꺼낸 길이·개수·범위 제약. 서버 계약에서 제약이 빠지면 화면이 엉뚱한 한도로
 * 막지 않도록 모듈을 불러오는 순간 실패시킨다. 테스트가 모듈을 불러오므로 CI 에서 먼저 드러난다.
 */
export const constraintOf = (value: unknown, name: string): number => {
  if (typeof value !== "number") throw new Error(`API 스키마에 ${name} 제약이 없습니다.`);
  return value;
};
