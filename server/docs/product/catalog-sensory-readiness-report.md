# Catalog sensory readiness report

Schema: `catalog-sensory-readiness-v1`

Tool: `catalog-sensory-readiness-tool-v1`

이 보고서는 입력 파일명과 내용 해시만 기록하며 실행 시각과 절대 경로를 기록하지 않는다. 같은 스키마·도구 버전과 같은 입력이면 같은 결과를 생성한다. 계산 규칙이 바뀌면 도구 버전을 올린다.

## Inputs

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| products.json | 552924 | `4aecabf77663ab94b64de03c6dfc80d3a15e8164e859baec5a4ec8b89d42a843` |
| ingredients.json | 31441501 | `f5d771e588d13d86161b06a46d4c35245e92f5ab21b62ab79a64a205d82a5c7d` |
| categories.json | 2817 | `e04e269a77b38bcda66b037b3a2d3482034671c90a595fd29d508bc637a06fc2` |

## Catalog

- Products: 199
- Ingredients: 22013
- Categories: 15
- Referenced unique ingredients: 1009
- Malformed records (product/ingredient/category): 0 / 0 / 0
- Duplicate IDs (product/ingredient/category): 0 / 0 / 0
- Unknown category references: 0
- Malformed tag mappings: 0
- Unrecognized formulation roles: 0

## Category distribution

| ID | Parent ID | Path | Products |
| ---: | ---: | --- | ---: |
| 2 | 1 | 스킨케어/스킨/토너 | 31 |
| 3 | 1 | 스킨케어/에센스/세럼/앰플 | 57 |
| 4 | 1 | 스킨케어/크림 | 46 |
| 5 | 1 | 스킨케어/로션 | 9 |
| 7 | 6 | 마스크팩/시트팩 | 10 |
| 8 | 6 | 마스크팩/패드 | 5 |
| 9 | 6 | 마스크팩/패치 | 2 |
| 11 | 10 | 클렌징/클렌징폼/젤 | 4 |
| 12 | 10 | 클렌징/오일/밤 | 1 |
| 14 | 13 | 선케어/선크림 | 32 |
| 15 | 13 | 선케어/선스틱 | 2 |

## Existing sensory fields

| Field | Absent | Explicit null | Valid 0-3 | Invalid |
| --- | ---: | ---: | ---: | ---: |
| `moisture_level` | 199 | 0 | 0 | 0 |
| `oil_level` | 199 | 0 | 0 | 0 |

## Ingredient list quality

제품의 `ingredients` 배열 순서가 구조적으로 보존되는지만 확인했다. source URL 존재 여부만 집계하고 외부 원문을 대조하지 않으므로 공식 전성분의 순서와 완전성은 검증하지 않았다.

- Ordered arrays: 199
- Missing or invalid arrays: 0
- Empty arrays: 0
- References (resolved/unresolved/malformed): 7623 (7623 / 0 / 0)
- Duplicate references: 2
- Ingredient counts (samples/min/p25/median/p75/p90/max/mean): 199 / 5 / 29 / 38 / 47 / 56 / 76 / 38.31

### Duplicate ingredient references

| Product ID | Product | Ingredient ID | Ingredient | Positions |
| ---: | --- | ---: | --- | --- |
| 93 | 더마UV365 레드진정 톤업 선크림 | 3435 | 티타늄디옥사이드 | 9, 13 |
| 118 | 블루빈 B5-PDRN 마일드 크림 | 393 | 바실러스발효물 | 11, 48 |

## Formulation role coverage

감각 역할은 프로필이나 실제 영향 판정이 아니라 1차 선별 신호다.

| Coverage | Unique ingredients | Occurrences |
| --- | ---: | ---: |
| Recognized formulation role | 734 / 1009 (72.75%) | 4889 / 7623 (64.13%) |
| Sensory screening role | 278 / 1009 (27.55%) | 2480 / 7623 (32.53%) |

### Role usage

| Role | Sensory screening | Unique ingredients | Products | Occurrences |
| --- | --- | ---: | ---: | ---: |
| `ABRASIVE` | false | 69 | 157 | 377 |
| `ABSORBENT` | true | 0 | 0 | 0 |
| `ANTICAKING` | false | 0 | 0 | 0 |
| `ANTIMICROBIAL` | false | 1 | 2 | 2 |
| `ANTIOXIDANT` | false | 2 | 2 | 2 |
| `ANTISEBORRHEIC` | false | 1 | 2 | 2 |
| `ANTISTATIC` | false | 1 | 1 | 1 |
| `BINDING` | false | 4 | 16 | 16 |
| `BUFFERING` | false | 67 | 171 | 492 |
| `BULKING` | false | 1 | 6 | 6 |
| `CLEANSING` | false | 4 | 13 | 13 |
| `COLORANT` | false | 11 | 31 | 69 |
| `EMOLLIENT` | true | 149 | 160 | 780 |
| `EMULSION_STABILISING` | false | 14 | 75 | 93 |
| `FILM_FORMING` | true | 41 | 175 | 429 |
| `FRAGRANCE_FUNCTIONAL` | false | 0 | 0 | 0 |
| `HAIR_CONDITIONING` | false | 8 | 62 | 67 |
| `HUMECTANT` | true | 3 | 82 | 128 |
| `KERATOLYTIC` | false | 0 | 0 | 0 |
| `MOISTURISING` | true | 211 | 198 | 1871 |
| `OPACIFYING` | false | 0 | 0 | 0 |
| `PERFUMING` | false | 4 | 53 | 61 |
| `PRESERVATIVE` | false | 3 | 14 | 15 |
| `SKIN_CONDITIONING` | false | 367 | 198 | 1955 |
| `SOLVENT` | false | 1 | 1 | 1 |
| `SURFACTANT` | false | 10 | 64 | 70 |
| `SURFACTANT_FOAM_BOOSTING` | false | 4 | 13 | 13 |
| `VISCOSITY_CONTROLLING` | true | 41 | 169 | 361 |

## Disclosed amounts

- Products: 72
- References: 230
- Malformed: 0
- Types: exact=230
- Units: percent=25, ppb=50, ppm=155

## Source and formulation fields

- `application_type`: 0 products
- `usage_variant`: 0 products
- `formula_archetype`: 0 products
- `source_url`: 0 products
- Official ingredient order verified: false

## 상위 빈출 성분

| Ingredient ID | Ingredient | Products | Occurrences | Roles | Sensory roles |
| ---: | --- | ---: | ---: | --- | --- |
| 2681 | 정제수 | 194 | 194 | SKIN_CONDITIONING |  |
| 4840 | 1,2-헥산다이올 | 179 | 179 |  |  |
| 1012 | 글리세린 | 175 | 175 | MOISTURISING | MOISTURISING |
| 586 | 부틸렌글라이콜 | 166 | 166 |  |  |
| 2070 | 에틸헥실글리세린 | 148 | 148 | MOISTURISING | MOISTURISING |
| 1938 | 나이아신아마이드 | 121 | 121 |  |  |
| 1264 | 소듐하이알루로네이트 | 118 | 118 | MOISTURISING | MOISTURISING |
| 3500 | 판테놀 | 106 | 106 |  |  |
| 1612 | 아데노신 | 101 | 101 |  |  |
| 3260 | 토코페롤 | 101 | 101 |  |  |
| 3953 | 프로판다이올 | 96 | 96 |  |  |
| 2631 | 잔탄검 | 94 | 94 | FILM_FORMING, VISCOSITY_CONTROLLING | FILM_FORMING, VISCOSITY_CONTROLLING |
| 4510 | 하이드로제네이티드레시틴 | 90 | 90 | SKIN_CONDITIONING |  |
| 1824 | 알란토인 | 84 | 84 |  |  |
| 3605 | 펜틸렌글라이콜 | 82 | 82 |  |  |
| 2896 | 카프릴릭/카프릭트라이글리세라이드 | 78 | 78 | MOISTURISING | MOISTURISING |
| 7130 | 세라마이드엔피 | 78 | 78 | EMOLLIENT, SKIN_CONDITIONING | EMOLLIENT |
| 3289 | 트로메타민 | 74 | 74 |  |  |
| 2859 | 카보머 | 72 | 72 | SKIN_CONDITIONING |  |
| 5079 | 다이소듐이디티에이 | 71 | 71 |  |  |

## 감각 역할 기반 선별 후보

| Ingredient ID | Ingredient | Products | Occurrences | Roles | Sensory roles |
| ---: | --- | ---: | ---: | --- | --- |
| 1012 | 글리세린 | 175 | 175 | MOISTURISING | MOISTURISING |
| 2070 | 에틸헥실글리세린 | 148 | 148 | MOISTURISING | MOISTURISING |
| 1264 | 소듐하이알루로네이트 | 118 | 118 | MOISTURISING | MOISTURISING |
| 2631 | 잔탄검 | 94 | 94 | FILM_FORMING, VISCOSITY_CONTROLLING | FILM_FORMING, VISCOSITY_CONTROLLING |
| 2896 | 카프릴릭/카프릭트라이글리세라이드 | 78 | 78 | MOISTURISING | MOISTURISING |
| 7130 | 세라마이드엔피 | 78 | 78 | EMOLLIENT, SKIN_CONDITIONING | EMOLLIENT |
| 5611 | 하이드롤라이즈드하이알루로닉애씨드 | 60 | 60 | BUFFERING, HUMECTANT, MOISTURISING | HUMECTANT, MOISTURISING |
| 1775 | 아크릴레이트/C10-30알킬아크릴레이트크로스폴리머 | 55 | 55 | FILM_FORMING, VISCOSITY_CONTROLLING | FILM_FORMING, VISCOSITY_CONTROLLING |
| 973 | 세테아릴알코올 | 50 | 50 | EMOLLIENT, MOISTURISING | EMOLLIENT, MOISTURISING |
| 4785 | 하이알루로닉애씨드 | 49 | 49 | BUFFERING, HUMECTANT, MOISTURISING | HUMECTANT, MOISTURISING |
| 1401 | 스쿠알란 | 47 | 47 | EMOLLIENT, MOISTURISING | EMOLLIENT, MOISTURISING |
| 7587 | 글리세릴스테아레이트 | 46 | 46 | MOISTURISING | MOISTURISING |
| 221 | 메틸프로판다이올 | 42 | 42 | MOISTURISING | MOISTURISING |
| 1267 | 소듐하이알루로네이트크로스폴리머 | 40 | 40 | FILM_FORMING, VISCOSITY_CONTROLLING | FILM_FORMING, VISCOSITY_CONTROLLING |
| 1944 | 암모늄아크릴로일다이메틸타우레이트/브이피코폴리머 | 39 | 39 | EMULSION_STABILISING, FILM_FORMING, VISCOSITY_CONTROLLING | FILM_FORMING, VISCOSITY_CONTROLLING |
| 473 | 베타-글루칸 | 37 | 37 | MOISTURISING | MOISTURISING |
| 3061 | 콜레스테롤 | 37 | 37 | EMOLLIENT, SKIN_CONDITIONING | EMOLLIENT |
| 1149 | 소듐아세틸레이티드하이알루로네이트 | 35 | 35 | MOISTURISING | MOISTURISING |
| 3731 | 폴리글리세릴-10라우레이트 | 30 | 30 | MOISTURISING | MOISTURISING |
| 4476 | 다이메티콘 | 30 | 30 | EMOLLIENT, FILM_FORMING | EMOLLIENT, FILM_FORMING |

## 감각 역할이 없는 상위 빈출 성분

| Ingredient ID | Ingredient | Products | Occurrences | Roles | Sensory roles |
| ---: | --- | ---: | ---: | --- | --- |
| 2681 | 정제수 | 194 | 194 | SKIN_CONDITIONING |  |
| 4840 | 1,2-헥산다이올 | 179 | 179 |  |  |
| 586 | 부틸렌글라이콜 | 166 | 166 |  |  |
| 1938 | 나이아신아마이드 | 121 | 121 |  |  |
| 3500 | 판테놀 | 106 | 106 |  |  |
| 1612 | 아데노신 | 101 | 101 |  |  |
| 3260 | 토코페롤 | 101 | 101 |  |  |
| 3953 | 프로판다이올 | 96 | 96 |  |  |
| 4510 | 하이드로제네이티드레시틴 | 90 | 90 | SKIN_CONDITIONING |  |
| 1824 | 알란토인 | 84 | 84 |  |  |
| 3605 | 펜틸렌글라이콜 | 82 | 82 |  |  |
| 3289 | 트로메타민 | 74 | 74 |  |  |
| 2859 | 카보머 | 72 | 72 | SKIN_CONDITIONING |  |
| 5079 | 다이소듐이디티에이 | 71 | 71 |  |  |
| 5218 | 다이프로필렌글라이콜 | 67 | 67 |  |  |
| 2898 | 카프릴릴글라이콜 | 59 | 59 |  |  |
| 540 | 병풀추출물 | 57 | 57 | SKIN_CONDITIONING |  |
| 475 | 베타인 | 52 | 52 |  |  |
| 1880 | 알지닌 | 46 | 46 | SKIN_CONDITIONING |  |
| 1463 | 스테아릭애씨드 | 40 | 40 | ABRASIVE, BUFFERING |  |
