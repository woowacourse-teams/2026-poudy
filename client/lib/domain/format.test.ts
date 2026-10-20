import { describe, expect, it } from "vitest";

import {
  formatCount,
  formatEnglishName,
  formatDate,
  formatDateTime,
  formatLongDate,
  formatPrice,
  formatProgress,
  formatUnitPrice,
  formatVolume,
  formatVolumeWithUnitPrice,
  josaOf,
  namesWithJosa,
  shortName,
  unitPrice,
  withJosa,
  withJosaShort,
} from "./format";

describe("formatPrice", () => {
  it("천 단위를 끊어 원을 붙인다", () => {
    expect(formatPrice(32000)).toBe("32,000원");
    expect(formatPrice(900)).toBe("900원");
  });
});

describe("formatVolume", () => {
  it("숫자와 단위를 붙여 쓴다", () => {
    expect(formatVolume({ volumeValue: 21, volumeUnit: "g" })).toBe("21g");
    expect(formatVolume({ volumeValue: 30, volumeUnit: "매" })).toBe("30매");
  });

  it("단위는 서버가 보낸 글자를 그대로 쓴다", () => {
    expect(formatVolume({ volumeValue: 80, volumeUnit: "mL" })).toBe("80mL");
    expect(formatVolume({ volumeValue: 80, volumeUnit: "ml" })).toBe("80ml");
  });

  it("천 단위부터 쉼표를 넣는다", () => {
    expect(formatVolume({ volumeValue: 1000, volumeUnit: "ml" })).toBe("1,000ml");
  });
});

describe("unitPrice", () => {
  it("가격을 용량으로 나눠 반올림한다", () => {
    expect(unitPrice(18000, { volumeValue: 200, volumeUnit: "ml" })).toBe(90);
    expect(unitPrice(23000, { volumeValue: 300, volumeUnit: "ml" })).toBe(77);
  });

  it("용량이 0 이거나 숫자가 아니면 계산하지 않는다", () => {
    expect(unitPrice(18000, { volumeValue: 0, volumeUnit: "ml" })).toBeUndefined();
    expect(unitPrice(18000, { volumeValue: Number.NaN, volumeUnit: "ml" })).toBeUndefined();
  });
});

describe("formatUnitPrice", () => {
  it("'{단위}당 {금액}원'으로 쓴다", () => {
    expect(formatUnitPrice(32000, { volumeValue: 80, volumeUnit: "mL" })).toBe("mL당 400원");
    expect(formatUnitPrice(26000, { volumeValue: 21, volumeUnit: "g" })).toBe("g당 1,238원");
  });

  it("용량을 모르면 없다", () => {
    expect(formatUnitPrice(32000, { volumeValue: 0, volumeUnit: "ml" })).toBeUndefined();
  });
});

describe("formatVolumeWithUnitPrice", () => {
  it("용량과 단가를 가운뎃점으로 잇는다", () => {
    expect(formatVolumeWithUnitPrice(18000, { volumeValue: 200, volumeUnit: "mL" })).toBe("200mL · mL당 90원");
  });

  it("용량을 알 수 없으면 단가를 빼고 보여 준다", () => {
    expect(formatVolumeWithUnitPrice(18000, { volumeValue: 0, volumeUnit: "ml" })).toBe("0ml");
  });
});

describe("formatEnglishName", () => {
  it("이름 사이의 쉼표 뒤를 한 칸 띄운다", () => {
    expect(formatEnglishName("Flavor,Fragrance,perfume,Parfum,Aroma")).toBe(
      "Flavor, Fragrance, perfume, Parfum, Aroma",
    );
    expect(formatEnglishName("Flavor , Fragrance")).toBe("Flavor, Fragrance");
  });

  it("숫자 사이의 쉼표는 이름의 일부라 그대로 둔다", () => {
    expect(formatEnglishName("1,2-Hexanediol")).toBe("1,2-Hexanediol");
    expect(formatEnglishName("Fragrance,1,2-Hexanediol")).toBe("Fragrance, 1,2-Hexanediol");
  });
});

describe("formatCount", () => {
  it("숫자에 '개'를 붙이고 천 단위를 끊는다", () => {
    expect(formatCount(472)).toBe("472개");
    expect(formatCount(12000)).toBe("12,000개");
  });
});

describe("formatProgress", () => {
  it("'현재 / 전체'로 앞뒤를 한 칸씩 띄운다", () => {
    expect(formatProgress(4, 350)).toBe("4 / 350");
    expect(formatProgress(2, 5)).toBe("2 / 5");
    expect(formatProgress(120, 1000)).toBe("120 / 1,000");
  });
});

describe("formatLongDate", () => {
  it("문장 안에서 읽는 날짜는 'YYYY년 M월 D일'로 쓰고 월·일에 0을 채우지 않는다", () => {
    expect(formatLongDate("2026-10-05T14:00:00+09:00")).toBe("2026년 10월 5일");
    expect(formatLongDate("2026-11-04")).toBe("2026년 11월 4일");
  });

  it("서울 시각 기준으로 날짜를 정한다", () => {
    expect(formatLongDate("2026-10-04T15:30:00Z")).toBe("2026년 10월 5일");
  });

  it("읽을 수 없는 값은 받은 그대로 돌려준다", () => {
    expect(formatLongDate("unknown")).toBe("unknown");
  });
});

describe("formatDate", () => {
  it("날짜만 있는 값은 시간대를 바꾸지 않고 그대로 쓴다", () => {
    expect(formatDate("2026-08-12")).toBe("2026.08.12");
    expect(formatDate("2026-01-01")).toBe("2026.01.01");
  });

  it("시각이 붙은 값은 Asia/Seoul 기준의 날짜를 쓴다", () => {
    expect(formatDate("2026-08-11T15:30:00Z")).toBe("2026.08.12");
    expect(formatDate("2026-08-11T14:59:59Z")).toBe("2026.08.11");
  });

  it("읽을 수 없는 값은 받은 그대로 돌려준다", () => {
    expect(formatDate("곧")).toBe("곧");
  });
});

describe("formatDateTime", () => {
  it("Asia/Seoul 기준의 날짜와 24시간 시각을 쓴다", () => {
    expect(formatDateTime("2026-08-11T15:30:00Z")).toBe("2026.08.12 00:30");
    expect(formatDateTime("2026-08-12T05:05:00Z")).toBe("2026.08.12 14:05");
  });

  it("시간대 표기가 다른 값도 같은 시각으로 맞춘다", () => {
    expect(formatDateTime("2026-08-12T00:30:00+09:00")).toBe("2026.08.12 00:30");
  });

  it("읽을 수 없는 값은 받은 그대로 돌려준다", () => {
    expect(formatDateTime("")).toBe("");
  });
});

describe("withJosa", () => {
  it("받침에 맞춰 조사를 고른다", () => {
    expect(withJosa("판테놀", "을/를")).toBe("판테놀을");
    expect(withJosa("히알루론산", "을/를")).toBe("히알루론산을");
    expect(withJosa("레티놀", "과/와")).toBe("레티놀과");
    expect(withJosa("토너", "이/가")).toBe("토너가");
    expect(withJosa("세럼", "은/는")).toBe("세럼은");
  });

  it("'으로/로'는 ㄹ 받침 뒤에 '로'를 쓴다", () => {
    expect(withJosa("판테놀", "으로/로")).toBe("판테놀로");
    expect(withJosa("크림", "으로/로")).toBe("크림으로");
    expect(withJosa("토너", "으로/로")).toBe("토너로");
  });

  it("숫자로 끝나면 읽는 소리의 받침을 따른다", () => {
    expect(withJosa("1025 독도 토너 2", "이/가")).toBe("1025 독도 토너 2가");
    expect(withJosa("세럼 3", "이/가")).toBe("세럼 3이");
    expect(withJosa("비타 C 7", "으로/로")).toBe("비타 C 7로");
  });

  it("소리를 알 수 없는 글자로 끝나면 받침이 없는 쪽을 쓴다", () => {
    expect(withJosa("Toner", "을/를")).toBe("Toner를");
  });
});

describe("josaOf", () => {
  it("이름은 빼고 조사만 돌려준다", () => {
    expect(josaOf("토너", "이/가")).toBe("가");
    expect(josaOf("판테놀", "이/가")).toBe("이");
  });
});

describe("shortName", () => {
  it("12자 이하는 그대로 둔다", () => {
    expect(shortName("향료/알레르기 성분")).toBe("향료/알레르기 성분");
    expect(shortName("에스디알코올40-B")).toBe("에스디알코올40-B");
  });

  it("더 길면 '/'가 앞쪽에 있을 때 첫 '/'까지만 둔다", () => {
    expect(shortName("비스-베헤닐/아이소스테아릴/피토스테릴다이머다이리놀레일다이머다이리놀리에이트")).toBe(
      "비스-베헤닐/…",
    );
  });

  it("'/'가 없으면 12자까지 두고 줄인다", () => {
    expect(shortName("하이드록시프로필비스팔미타마이드엠이에이")).toBe("하이드록시프로필비스팔미…");
  });

  it("조사는 줄이기 전 이름의 받침을 따른다", () => {
    expect(withJosaShort("하이드록시프로필비스팔미타마이드엠이에이", "을/를")).toBe("하이드록시프로필비스팔미…를");
    expect(namesWithJosa(["하이드록시프로필비스팔미타마이드엠이에이", "판테놀"], "은/는")).toBe(
      "하이드록시프로필비스팔미… 외 1개는",
    );
  });
});
