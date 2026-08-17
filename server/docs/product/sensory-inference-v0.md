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

## 외부 catalog 첫 실행 관찰

2026-08-18에 외부 catalog의 `products.json`, `ingredients.json`, `categories.json`을 v0로
실행했다. 원본 파일은 저장소나 runtime resources에 복사하지 않았고, 입력 크기와 SHA-256,
집계 결과만 [catalog sensory readiness report](catalog-sensory-readiness-report.md)에 남겼다.

| 지표 | 결과 |
| --- | --- |
| 추론 성공 | 199 / 199제품, skip 0 |
| 기존 수동 레벨 | 두 필드 모두 199제품에서 부재 |
| 수분감 `0/1/2/3` | `0 / 15 / 136 / 48` |
| 유분감 `0/1/2/3` | `40 / 67 / 74 / 18` |
| confidence `min/p25/median/p75/max/mean` | `0.25 / 0.46 / 0.49 / 0.52 / 0.55 / 0.4765` |
| 수분·유분 조합 | 수분 1~3과 유분 0~3 사이 12개 조합 |

첫 sanity check에서 확인된 장점은 다음과 같다.

- 토너는 낮은 유분, 크림은 높은 유분, 클렌징 오일·밤과 선스틱은 높은 유분처럼 category
  prior가 의도한 큰 방향이 결과에 나타났다. 이는 정답 검증이 아니라 계산·mapping이 뒤집히지
  않았다는 최소 신호다.
- 유분감은 네 단계에 모두 분포하고 수분·유분 조합도 한 대각선으로 붕괴하지 않아 두 축을
  독립 계산한 효과가 보인다.
- 마스크팩·클렌징·선스틱처럼 초기 leave-on 범위 밖 24제품의 평균 confidence는 초기 범위
  category보다 낮다. 범위 밖 추정치를 같은 근거 수준으로 가장하지 않는다.
- 발견된 중복 성분 참조 2건은 점수를 두 번 올리지 않고 confidence만 낮춘다.

동시에 다음 한계가 실제 분포에서 확인됐다.

- 수분감 2가 136제품(68.34%)이고 수분감 0은 없다. 현 category prior와 cut point가 수분 축을
  중앙에 압축하며, 아주 가벼운 제품을 충분히 분리하지 못할 가능성이 높다.
- 선크림 32제품의 유분감이 모두 2, 로션 9제품의 유분감이 모두 2다. category 안에서 전성분
  역할과 순서 보정만으로 제형 차이를 충분히 나누지 못한다.
- confidence 상한 0.55는 근거 부족을 보수적으로 표현하지만 실제 오류율로 보정된 값은 아니다.
  현재는 검수 우선순위에만 쓸 수 있다.
- category별 방향이 상식적으로 보이는 것은 관능 정확도의 증거가 아니다. 공식 사용법,
  처방량·phase·dry-down, 블라인드 패널 라벨이 없으므로 한 단계 오차를 정량화할 수 없다.

따라서 다음 보완 순서는 수분감 0/1 경계와 category 내 분산 검수, 빈출 미분류 성분 프로필,
공식 `application_type`, 공개 함량·제형 신호, 관능 calibration 순으로 둔다. 개선판은 같은 입력에
대해 v0와 전체 분포 및 제품별 diff를 만든 뒤, 특정 단계의 몰림을 줄였다는 이유만으로 채택하지
않고 관능 표본에서 category-only와 v0보다 나아졌을 때 교체한다.

## 모델 변경 diff 절차

제품별 baseline은 원본 catalog와 함께 저장소 밖에 보관한다. 제품명과 전성분은 snapshot에
복제하지 않으며 제품 ID, category ID, 두 레벨, confidence, 입력 내용 해시와 모델 버전만 남긴다.
현재 모델의 baseline 생성 명령은 다음과 같다.

```powershell
.\gradlew.bat catalogSensoryModelSnapshot -PcatalogDir="<catalog-directory>" -PcatalogModelSnapshotDir="<external-baseline-directory>"
```

모델 규칙과 해당 구성 버전을 바꾼 뒤 같은 catalog byte로 다음 명령을 실행한다.

```powershell
.\gradlew.bat catalogSensoryModelDiff -PcatalogDir="<catalog-directory>" -PcatalogModelBaseline="<baseline-directory>\catalog-sensory-model-snapshot.json" -PcatalogModelDiffDir="<external-diff-directory>"
```

도구는 세 입력의 파일명·크기·SHA-256, 제품 ID 집합과 category가 모두 같지 않으면 데이터
변경과 모델 변경을 섞지 않고 실패한다. 전 제품을 추론할 수 없는 catalog도 baseline으로
받지 않는다. diff에는 축별 증가·감소와 `-3~+3` 이동 분포, 2단계 이상 이동 수, confidence
변화 및 검수할 제품 ID가 담긴다. 결과가 달라졌는데 `SensoryModelVersion`의 다섯 구성 버전이
같으면 실패한다.

v0 baseline을 실제 외부 catalog 199제품으로 생성한 뒤 동일 모델에 대해 self-diff한 결과는
수분감·유분감·confidence 모두 199건 unchanged, changed product 0건이었다. 이는 정확도 검증이
아니라 snapshot 생성·역직렬화·동일 입력 비교가 손실 없이 이어진다는 도구 기준점이다. 외부에
보존한 v0.1 baseline 파일은 24,910 bytes이며 SHA-256은
`647d27157243d2ec56d9cfdb9f1ad71d8b4b479299bab21f4dff6201b1aa330f`다.

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
