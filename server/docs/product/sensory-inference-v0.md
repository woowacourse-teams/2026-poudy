# 감각 추론 v0 기준과 한계

이 문서는 수분감·유분감 `0~3`의 첫 운영 가능 추정치를 만드는 기준과 의도적으로 남겨 둔
한계를 기록한다. v0의 목표는 완벽한 관능 모델이 아니라 **같은 입력에는 같은 결과를 내고,
틀릴 수 있는 이유와 다음 보완 지점을 설명할 수 있는 대략적인 분류**다.

## 출력 의미

- 수분감과 유분감은 도포 5분 뒤 피부에 남는 소비자 사용감을 서로 독립적으로 나타낸다.
- 두 값은 임상 보습 효능, 장벽 개선, TEWL 또는 피부 타입별 적합도 점수가 아니다.
- API의 정수 `0~3` 계약은 유지한다. 내부에는 v0의 낮은 근거 수준을 반영한 confidence와
  모든 파라미터 버전을 함께 보관한다.
- v0 결과는 관능 패널의 정답 라벨이 아니라 다음 데이터 수집과 검수의 우선순위를 정할
  baseline이다.

## v0 입력과 계산 원칙

v0는 runtime `products.json`의 수동 `moisture_level`, `oil_level`을 읽지 않는다. 서버 기동 시
다음 입력만으로 한 번 계산한다.

1. canonical 제품 category의 수분감·유분감 시작점
2. 원문 순서가 보존된 전성분 목록
3. 기존 `FormulationRole` 중 수분감의 `HUMECTANT`, 비유상 `MOISTURISING`과 유분감의
   `EMOLLIENT`, 감산 신호인 `ABSORBENT`
4. 기존 tag가 비어 있는 상위 빈출 성분 가운데 소수의 명시적 v0 보완 ID

전성분은 앞 순서일수록 더 큰 가중치를 주되 정확 함량으로 가장하지 않는다. category
시작점에 제한된 보정만 더하고 `0~3` 범위로 clamp한 뒤 가장 가까운 정수로 변환한다.
수분 신호가 유분 점수를 올리거나 유상 신호가 수분 점수를 자동으로 올리지 않게 두 축을
분리한다.

초기 범위 밖 category도 API 계약을 깨지 않도록 낮은 confidence의 별도 category fallback을
사용한다. 이 값은 leave-on 감각 모델의 검증 표본으로 세지 않는다.

## v0에서 잘 된 부분

- 원천 JSON에 사람이 입력한 최종 레벨이 없어도 전 제품을 결정적으로 생성할 수 있다.
- category만 쓰는 단일 baseline보다 전성분 순서와 감각 역할 차이를 반영한다.
- 수분감과 유분감을 독립 축으로 계산해 `수분감이 높으면 유분감도 높다`는 가정을 하지
  않는다.
- 미분류 성분을 0점 근거로 간주하지 않고 confidence를 낮추는 방식으로 취급한다.
- 파라미터와 레벨 변환 버전을 `SensoryModelVersion`에 넣어 같은 입력·버전의 결과를
  재현하고 이후 모델과 diff할 수 있다.
- confidence는 아직 보정되지 않았으므로 내부에만 두고, 공식 원문 순서·함량·제형이 없는
  현재 catalog에서는 상한을 낮게 제한한다.

## 알려진 한계와 다음 보완

| 현재 한계 | v0 결과에 미치는 영향 | 다음 보완 |
| --- | --- | --- |
| 전성분 source URL과 공식 revision이 없어 배열의 공식 순서·완전성을 검증하지 못함 | 앞쪽 가중치가 잘못된 순서에 적용될 수 있음 | 공식 제품 페이지 snapshot과 revision을 수집해 순서 검증 상태를 별도 보존 |
| `application_type`이 없어 rinse-off와 leave-on을 원천에서 구분하지 못함 | 범위 밖 제품은 category fallback일 뿐 5분 leave-on 감각으로 검증할 수 없음 | 공식 사용법 기반 `ApplicationTypeDecision`을 제품 observation에 연결 |
| 감각 screening role이 참조 성분 출현의 약 32.53%만 덮고 일부 function tag가 부정확함 | 태그 없는 글라이콜·판테놀 또는 잘못 분류된 오일 신호를 놓칠 수 있음 | 상위 영향 성분부터 버전된 `IngredientSensoryProfile`로 교체하고 override마다 근거 기록 |
| 순서 가중치는 정확 농도나 1% 경계를 뜻하지 않음 | 같은 순서라도 실제 함량이 다른 처방을 구분하지 못함 | 공개 함량을 우선 적용하고 category별 rank/함량 사전분포로 대체 |
| category 시작점은 관능 패널로 보정되지 않은 초기 가설임 | 같은 category 안의 제형 차이를 충분히 나누지 못하고 경계 제품이 한 단계 어긋날 수 있음 | category·제형별 표본과 블라인드 반복 평가로 prior 및 level cut point 보정 |
| phase, 제형 유형, 휘발과 5분 dry-down을 계산하지 않음 | 실리콘, 휘발성 용매, 파우더, 왁스와 필름의 after-feel 차이를 축약함 | `FormulaArchetype`, phase composition, dry-down과 modifier를 독립 채널로 추가 |
| v0 confidence는 실제 오류 확률에 맞춘 값이 아님 | 제품 간 상대적인 근거 부족 신호로만 사용할 수 있음 | holdout 관능 라벨로 confidence bin별 실제 오차를 측정하고 calibration 적용 |
| 개인 피부 상태·도포량·환경을 입력하지 않음 | 개인 경험과 다를 수 있음 | 공통 제품 점수를 유지하고 개인화는 별도 모델로만 추가 |

## 검증과 교체 기준

v0 배포 전에는 다음을 확인한다.

- 수동 레벨 필드가 없는 외부 catalog 전체가 기동 시 생성된다.
- 목록, 상세, filter와 count가 같은 추정값을 사용한다.
- 동일한 category·전성분 순서·모델 버전은 동일 결과를 낸다.
- 실제 catalog의 category별 레벨 분포와 confidence 분포를 남겨 전 제품이 한 단계로
  붕괴하거나 극단값으로 몰리지 않는지 확인한다.
- 초기 관능 표본에서는 category-only baseline과 v0를 함께 저장한다. v0가 개선하지 못하는
  category는 복잡도를 더하기 전에 prior·tag 또는 범위 정의를 먼저 수정한다.

후속 모델은 v0 코드를 직접 덧대기보다 같은 `ProductSensoryEstimator` 경계에서 교체한다.
파라미터나 cut point가 바뀌면 해당 버전을 올리고 전체 catalog diff를 검수한다. 임시 수동
override가 필요하면 최종 JSON 레벨을 되살리지 않고 제품 ID, 사유, 승인자, 만료 조건과
모델 버전을 가진 별도 override로만 관리한다.
