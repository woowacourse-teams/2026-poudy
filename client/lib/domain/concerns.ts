/** 고민 코드(서버 `Concern`)마다 그림과 근거 성분 시트의 제목 앞부분을 둔다(S87 · S92 · S93). */
const CONCERNS: Readonly<Record<string, { readonly image: string; readonly sheetTitle: string }>> = {
  DRYNESS: { image: "dry-tight", sheetTitle: "건조하고 당기는 피부를 위한" },
  OILINESS: { image: "oiliness", sheetTitle: "번들거리는 피부를 위한" },
  ACNE: { image: "acne", sheetTitle: "여드름이 고민인 피부를 위한" },
  PIGMENTATION: { image: "pigmentation", sheetTitle: "색소·잡티가 고민인 피부를 위한" },
  DULLNESS: { image: "dull-tone", sheetTitle: "톤이 칙칙한 피부를 위한" },
  WRINKLES: { image: "wrinkles", sheetTitle: "주름이 고민인 피부를 위한" },
  UNEVEN_TEXTURE: { image: "rough-texture", sheetTitle: "피부결이 거친 피부를 위한" },
};

/** 고민 그림의 주소. 서버가 새 고민을 더해 그림이 아직 없으면 undefined 를 돌려주고, 그림 자리는 빈 원으로 둔다. */
export const concernImageSrc = (code: string): string | undefined => {
  const concern = CONCERNS[code];
  if (!concern) return undefined;
  return `/images/concerns/${concern.image}.webp`;
};

/** 근거 성분 시트 제목의 앞부분. 모르는 고민은 서버가 준 고민 이름으로 만든다. */
export const concernSheetTitle = (code: string, name: string): string =>
  CONCERNS[code]?.sheetTitle ?? `${name} 고민을 위한`;
