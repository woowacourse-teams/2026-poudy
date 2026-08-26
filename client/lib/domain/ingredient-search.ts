import { pick } from "./optional";

/** 서버 `Ingredients.SEARCH_RESULT_LIMIT` 의 사본. */
export const INGREDIENT_SEARCH_LIMIT = 5;

/**
 * 검색 결과 옆에 붙는 건수 문구.
 *
 * 상한만큼 왔다는 것은 뒤에 더 있는데 잘려 왔다는 뜻이다. 예전에는 `5개 이상` 이라
 * 적었는데, 눈앞에 다섯 줄이 보이는 자리에서 `5개 이상` 은 세어 보면 맞는 말이라도
 * 그 다섯이 전부인지 일부인지를 말해 주지 않는다. `상위 5개만` 은 잘렸다는 사실을
 * 그 자체로 전하므로, 좁히라는 안내를 따로 덧붙이지 않는다.
 */
export const ingredientCountLabel = (shown: number): string =>
  pick(shown < INGREDIENT_SEARCH_LIMIT, `${shown}개`, `상위 ${shown}개만`);
