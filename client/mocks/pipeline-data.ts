/*
 * 파이프라인에서 옮긴 목 데이터가 들어갈 자리다. 형태만 정해 두고 비워 둔다.
 *
 * 실제 값은 원본이 기밀이라 저장소에 두지 않는다. 조건을 걸 때 개수가 움직이는
 * 것을 보려면 각자 로컬에서 채운다. 채우는 방법은 mocks/README.md 를 본다.
 *
 * 비어 있어도 화면은 뜬다. fixtures.ts 의 손으로 적은 목 데이터가 쓰인다.
 */

interface PipelineBrand {
  readonly id: number;
  readonly name: string;
  readonly englishName: string;
  readonly imageUrl: string;
  readonly productCount: number;
}

interface PipelineIngredient {
  readonly id: number;
  readonly koreanName: string;
  readonly englishName: string;
}

interface PipelineExcludeCode {
  readonly code: string;
  readonly name: string;
  readonly ingredientIds: readonly number[];
}

interface PipelineProduct {
  readonly id: number;
  readonly name: string;
  readonly brandId: number;
  readonly price: number;
  readonly volumeValue: number;
  readonly volumeUnit: string;
  readonly moistureLevel: number;
  readonly oilLevel: number;
  readonly categoryId: number | null;
  readonly ingredientIds: readonly number[];
}

export const pipelineBrands: PipelineBrand[] = [];

export const pipelineIngredients: PipelineIngredient[] = [];

export const pipelineExcludeCodeIngredients: PipelineExcludeCode[] = [];

export const pipelineProducts: PipelineProduct[] = [];
