const MONTH_DAY = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" });

/** 서버 시각을 한국 날짜의 `10월 5일` 꼴로 바꾼다. */
export const monthDay = (dateTime: string): string => MONTH_DAY.format(new Date(dateTime));
