/**
 * 처리방침과 이용약관이 함께 쓰는 값.
 * 책임자나 시행일이 바뀌면 문서를 뒤지지 않고 이 파일만 고친다.
 */
export const OPERATOR = {
  serviceName: "Poudy",
  name: "Poudy 팀",
  officer: {
    name: "김우민",
    title: "개인정보 보호책임자",
    email: "poudy.official@gmail.com",
  },
  effectiveDate: "2026년 9월 1일",
  lastRevisedDate: {
    privacy: "2026년 9월 14일",
    terms: "2026년 10월 7일",
  },
} as const;
