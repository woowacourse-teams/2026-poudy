# 제품 유수분 감각 추론 장기 계획

## 계획 상태

- 상태: **활성 장기 계획**
- 시작일: 2026-08-17
- 대상 브랜치: `product-sensory-inference`
- 소유 도메인: `product`
- 완료 시 이동 위치: `docs/exec-plans/completed/product-sensory-inference.md`
- 최근 진행: 0단계 완료, 카탈로그 감사·원천 계약·결정적 입력 manifest와 기초 원천·결과
  값 타입 구현 완료

이 문서는 제품별 `moisture_level`, `oil_level`을 원천 JSON에 사람이 미리 라벨링하는
방식을 대체한다. 정확한 함량이 공개된 화장품 배합, 시판 제품 전성분, 성분 물성 및
관능평가를 근거 데이터로 만들고, 서버가 `Product`를 생성할 때 유수분 레벨을 계산하는
전체 과정을 다룬다.

계획이 진행되는 동안 완료한 항목은 체크하고, 조사나 검증으로 결정이 달라지면 아래
`결정 기록`과 해당 단계에 이유를 남긴다. 구현을 완료했다고 해서 바로 이 계획을
완료 처리하지 않는다. 데이터 수집, 독립 검증, 운영 재현성까지 모든 완료 조건을
충족해야 한다.

## 목표

제품의 카테고리와 순서가 보존된 공식 전성분을 기본 입력으로 사용해 다음 값을
설명 가능하고 재현 가능한 도메인 규칙으로 계산한다.

- 도포 후 일정 시간이 지난 뒤 느껴지는 수분감 `0~3`
- 도포 후 일정 시간이 지난 뒤 느껴지는 유분감 `0~3`
- 계산 결과의 신뢰도
- 사용한 성분 프로필, 카테고리 사전분포와 모델 버전
- 결과에 가장 크게 기여한 근거

최종 제품 API의 `moistureLevel`, `oilLevel` 계약은 유지하되, 원천 `products.json`에서는
두 결과 필드를 제거한다. 계산 결과는 요청마다 다시 계산하지 않고 기동 시 완전한
`Product`를 만들 때 한 번 계산한다.

## 사용자에게 제공하는 값의 정의

초기 모델의 목표 변수는 임상적인 보습 효능이 아니라 사용 후 감각이다.

- `moistureLevel`: 정해진 양을 도포한 뒤 5분 후 느껴지는 촉촉한 잔여감
- `oilLevel`: 정해진 양을 도포한 뒤 5분 후 느껴지는 오일·그리스 잔여감
- `0`: 거의 없음
- `1`: 가벼움
- `2`: 중간
- `3`: 높음

각질층 수분량 증가, TEWL 감소, 장벽 회복, 장기 보습 지속력은 이 값에 섞지 않는다.
필요해지면 별도의 `HydrationPotential`로 확장한다. 관능평가를 시작하기 전에 평가 부위,
도포량, 대기 시간, 온도와 습도, 단계별 기준 제품을 포함한 프로토콜을 확정한다.

### 내부에서 분리할 세 관점

공개 유수분 레벨을 계산하기 전에 다음 세 관점을 명확히 구분한다.

| 층 | 의미 | 1% 이하 성분 처리 |
| --- | --- | --- |
| 실제 물리 조성 | 수상·유상·분산 고형물·미분류의 배타적 예상 질량 분할 | 실제 예상 함량만큼만 질량 보존 방식으로 반영 |
| 피부 보습 효능 근거 | 피부 수분 증가·TEWL 감소·장벽 유지에 관한 근거 | 초기 레벨에는 넣지 않고 조건과 농도 반응을 출처 데이터로만 보존 |
| 5분 후 사용감 | 촉촉함·유분감·슬립·점착·왁시함·드라이다운 | 레올로지·필름 등 저농도 비선형 효과까지 반영 |

`moistureLevel`, `oilLevel`은 세 번째 층의 공개 결과다. 첫 번째 층은 사용감 계산의
기초 특징이다. 두 번째 층은 현재 계산 대상이 아니라 잘못된 감각 가산을 막고 향후 별도
효능 모델을 만들 때 사용할 출처 근거다.

휘발성은 수상·유상과 배타적인 상이 아니다. 에탄올은 수상에 있으면서 휘발할 수 있고,
휘발성 실리콘은 유상에 있으면서 휘발할 수 있다. 따라서 실제 질량 분할은 합계가 100%인
배타적 값으로 만들고, 휘발량과 5분 후 잔존량은 별도의 `EstimatedDryDown`으로 계산한다.

따라서 `1% 이하`를 모든 성분에 동일한 감점으로 적용하지 않는다. 일반적인 오일과
습윤제는 상 조성에 실제 함량만큼 제한적으로 기여하지만, 카보머·검류·일부 필름 형성제는
상 조성에 거의 기여하지 않으면서 0.x%에서 사용감을 크게 바꿀 수 있다. 반대로 저농도
히알루론산이나 판테놀의 임상적 보습 가능성은 유수상 질량과 공개 감각 레벨에서 제외하고
별도의 효능 근거로만 관리한다.

## 범위

### 초기 범위

- leave-on 스킨케어
- 스킨/토너
- 에센스/세럼/앰플
- 로션/에멀션
- 크림
- 밤
- 선크림

### 초기 범위에서 제외

- 세정 후 씻어내는 제품
- 시트·워시오프·슬리핑 등 사용 방식이 다른 팩 전체
- 색조 화장품
- 헤어·두피 제품
- 실제 각질층 수분량이나 TEWL에 대한 효능 판정
- 사용자 피부 타입별 개인화

제외 범위는 같은 계산식에 억지로 포함하지 않는다. 데이터와 평가 프로토콜을 별도로
확보한 뒤 제형군 단위로 추가한다.

## 현재 상태와 제약

- 제품, 카테고리, 성분과 성분 태그처럼 현재 Domain에 적재되는 원천 값 외에는
  유수분 추론용 데이터가 없다.
- 외부 카탈로그 snapshot은 저장소와 runtime classpath에 복사하지 않고
  [감각 준비도 보고서](../../product/catalog-sensory-readiness-report.md) 생성기에 경로로만
  전달한다. 보고서는 입력 hash와 집계·검수 식별자만 보존한다.
- 공식 처방 원천군과 pilot 검수 상태는
  [감각 원천 수집 후보 register](../../product/sensory-source-acquisition-register.md)에
  기록한다. URL 발견은 원문 수집·라이선스 승인·코퍼스 포함으로 세지 않는다.
- 감사한 snapshot은 제품 199개, 성분 참조 7,623개이며 원천 `moisture_level`과
  `oil_level`은 전 제품에서 null이 아니라 필드 자체가 없다. 미해결 성분 참조는 0개지만
  제품 내부 중복 참조가 2개 있다.
- 초기 감각 역할 6종의 커버리지는 참조 고유 성분 기준 278/1,009(27.55%), 출현 기준
  2,480/7,623(32.53%)다. `ABSORBENT` 참조는 0건이고 `HUMECTANT`는 고유 성분 3개뿐이라
  기존 역할 태그를 감각 프로필로 간주할 수 없다.
- 카테고리만 보면 초기 범위 후보는 175개지만 `application_type`, `usage_variant`, 공식
  제형과 source URL이 모두 0건이다. 공식 사용법에 근거해 `LEAVE_ON`으로 확정한 제품은
  아직 0개이며 카테고리나 제품명으로 값을 채우지 않는다. 전성분 배열의 구조와 내부
  참조는 감사했지만 공식 원문이 없어 순서·누락·완전성 대조는 아직 하지 못했다.
- 현재 `Product`는 `Integer moistureLevel`, `Integer oilLevel`을 갖고 null과 범위 밖 값을
  거부한다.
- 현재 `ProductRepository`는 `products.json`에서 두 필드를 정수로 직접 읽는다.
- `Ingredients`는 제품 전성분의 입력 순서를 보존하므로 위치 제약의 입력으로 사용할 수 있다.
- 기존 `FormulationRole`에는 `HUMECTANT`, `MOISTURISING`, `EMOLLIENT`, `ABSORBENT`,
  `FILM_FORMING`, `VISCOSITY_CONTROLLING` 등 초기 분류에 쓸 수 있는 값이 있다.
- 현재 성분 태그만으로는 에몰리언트 종류별 잔여감, 휘발성, 피막, 흡유, 왁시함,
  점착성과 일반 사용 농도를 표현할 수 없다.
- 런타임에서는 Excel이나 외부 웹 자원을 읽지 않는다. 수집과 통계 생성은 오프라인에서
  끝내고, 런타임은 검증된 파생 데이터만 읽는다.
- Domain과 Repository는 서로의 Repository를 참조하지 않는다. 여러 원천 Domain 값의
  조립은 `config`가 맡는 기존 아키텍처를 유지한다.

## 핵심 설계 결정

1. 제품별 완성 레벨은 저장하지 않고 `Product` 생성 시 계산한다.
2. 계산 알고리즘은 Java Domain 코드가 소유하고, 성분별 물성·일반 사용 범위와
   카테고리 통계는 버전이 있는 참조 데이터로 관리한다.
3. 카테고리는 최종 점수에 고정 가산점을 주지 않는다. 제형 유형과 가능한 함량의
   사전확률을 바꾸는 데 사용한다.
4. 전성분 순서는 정확한 함량으로 취급하지 않는다. 1% 초과 구간의 상대 순서에 대한
   제약으로만 사용한다.
5. 1% 경계는 하나로 단정하지 않고 여러 후보와 확률로 표현한다.
6. 알려지지 않은 성분은 기여도 0이 아니라 불확실성으로 처리한다.
7. 수분감과 유분감은 서로 반대인 하나의 축이 아니라 독립된 두 축으로 계산한다.
8. 제품 ID가 다른 동일 처방은 동일한 결과를 받아야 한다.
9. 초기에는 설명 가능한 규칙·순서형 모델을 사용한다. 충분한 관능 라벨 없이
   딥러닝이나 성분 순서 Transformer를 도입하지 않는다.
10. 관능 데이터는 계산 규칙 보정과 검증에 쓰지만 제품 원천 JSON의 수동 라벨로 쓰지 않는다.
11. 1% 이하 성분은 일괄 무시하거나 일괄 감점하지 않고 효과 채널별 농도 반응을 적용한다.
12. 레올로지 modifier의 실제 배합 질량은 배타적 상 분할에 보존하되, 레올로지 효과는
    상 질량에 다시 가산하지 않고 제형 구조와 사용감 modifier로 처리한다.
13. 저농도 active의 피부 보습 근거는 공개 수분감과 분리한 `EfficacyEvidenceObservation`으로
    관리하고 초기 런타임 점수 계산에서는 제외한다.
14. 분자량, 원료 등급, pH, 중화 상태처럼 전성분에서 알 수 없는 조건은 고정값으로
    추측하지 않고 가능한 시나리오와 신뢰도 하락으로 표현한다.

## 전체 데이터 흐름

```text
외부 원천 문서·정확한 배합·공식 전성분
    ↓ 수집, 출처·라이선스 기록
표준화된 FormulaObservation / MarketProductObservation
    ↓ 성분명 해석, 복합원료 보존, 카테고리·제형 매핑
성분별 물성 프로필 + 카테고리별 배합 사전분포
    ↓ 버전이 있는 파생 데이터 생성
IngredientSensoryProfiles / CategoryFormulationPriors / ModelParameters
    ↓ 서버 기동 시 Repository가 읽고 config가 조립
ProductSensoryEstimator
    ↓ Category + 순서가 보존된 Ingredients
ProductSensory
    ↓ ProductFactory
완전한 Product
    ↓
목록·상세·필터·count에서 같은 결과 사용
```

## 필요한 원천 데이터

### 1. 현재 제품 카탈로그

필수 입력은 다음과 같다.

- 제품 ID
- 소분류와 부모 카테고리
- 공식 전성분
- 전성분 순서
- 제품명
- 공개된 성분 함량이 있으면 해당 값과 출처
- leave-on/rinse-off 구분
- 제형이 공식적으로 공개됐으면 해당 값

제품명에 포함된 `젤`, `오일`, `밤` 같은 표현은 제형 분류의 약한 보조 근거로만 쓴다.
제품명만으로 제형을 확정하지 않는다.

### 2. 성분 감각 프로필

성분마다 다음 속성을 수집하거나 성분군 기본값으로 추론한다.

| 속성 | 의미 |
| --- | --- |
| phase allocation | 수상·오일상·분산 고형물·미분류로 나눌 질량 배분 |
| ingredient family | 폴리올, 에스터, 식물유, 실리콘, 왁스 등 물성군 |
| humectancy | 수분을 끌어당기고 유지하는 성향 |
| aqueous retention | 사용 후 촉촉한 수상 감각을 남기는 성향 |
| residual oiliness | 휘발 후 남는 유분감 |
| occlusivity | 피막과 수분 증발 억제 성향 |
| volatility | 도포 후 휘발해 잔여감을 줄이는 성향 |
| powder absorbency | 유분 흡수·매트화 성향 |
| slip | 미끄러짐과 실키함 |
| tack | 끈적임 |
| wax structure | 왁시함·리치함·구조감 |
| rheology impact | 점도와 마찰을 바꾸는 정도 |
| sensory effect channels | 사용감·레올로지·필름 중 어느 감각 채널에 기여하는지 |
| concentration response | 선형·임계값·포화형 등 채널별 농도 반응 |
| molecular weight dependency | 분자량에 따라 작용이 달라지는지 |
| grade dependency | 원료 등급·가교도 등에 따라 작용이 달라지는지 |
| pH dependency | pH에 따라 점도·전하·기능이 달라지는지 |
| neutralization dependency | 중화 여부와 중화제에 따라 구조가 달라지는지 |
| interaction requirements | 효과에 필요한 공존 성분이나 상 조건 |
| typical use range | 제형별 통상 사용 범위 |
| evidence | 출처, 신뢰 등급, 검수 상태와 버전 |

성분 역할 하나를 곧바로 점수로 바꾸지 않는다. 같은 `EMOLLIENT`라도 가벼운 에스터,
식물유, 미네랄오일, 휘발성 실리콘, 고점도 실리콘과 버터는 다른 프로필을 가진다.

프로필은 하나의 `oiliness score`가 아니라 감각 효과 채널별 반응을 가진다.

```text
SensoryEffectChannel
├─ AFTERFEEL_MOISTURE
├─ AFTERFEEL_OILINESS
├─ RHEOLOGY
└─ FILM_FORMATION
```

실제 상 조성은 효과 채널이 아니며 `PhaseCompositionEstimator` 하나가 예상 함량과
`phase allocation`을 이용해 질량 보존 방식으로 계산한다. 일반 오일의 유상 질량은 예상
함량을 넘을 수 없다.
카보머와 검류의 `RHEOLOGY`는 특정 농도부터 빠르게 커지고 포화되는 임계값 반응을
사용할 수 있다. 히알루론산·판테놀 같은 성분의 임상 결과는 감각 채널과 분리한
`EfficacyEvidenceObservation`에 근거 농도와 조건을 기록한다.

저농도 예외 규칙을 만들 때 다음 근거를 초기 검토 자료로 포함한다.

- [0.1% 히알루론산 제형의 피부 수분·탄력 임상 결과와 분자량 차이](https://pubmed.ncbi.nlm.nih.gov/22052267/)
- [판테놀 0.5%, 1%, 5% 제형의 농도별 수분·TEWL 비교](https://pubmed.ncbi.nlm.nih.gov/21982351/)
- [Carbopol 2984의 0.1~1.0% 권장량과 농도별 점도 특성](https://www.lubrizol.com/Personal-Care/Products/Product-Finder/Products-Data/Carbopol-2984-polymer)
- [카보머 기반 네트워크와 제형 레올로지·피부 감각의 상관](https://pubmed.ncbi.nlm.nih.gov/34208474/)

이 자료의 특정 결과를 모든 동명 INCI에 그대로 일반화하지 않는다. 예를 들어
`Sodium Hyaluronate`라는 표시만으로 분자량을 알 수 없고, `Carbomer`라는 표시만으로
등급·중화 상태·pH·전해질 조건을 알 수 없다. 공개되지 않은 조건은 여러 시나리오로
계산하고 관련 감각 채널의 신뢰도를 낮춘다. HA·판테놀 임상 결과는 저농도라는 이유만으로
효과를 0으로 둘 수 없다는 근거지만, 5분 후 촉촉함을 측정한 연구가 아니므로 공개
`moistureLevel`의 가중치 근거로 쓰지 않는다.

### 3. 정확한 함량이 있는 배합 코퍼스

다음 출처에서 완성 처방의 실제 함량을 수집한다.

- 내부에서 확보할 수 있는 실제 제조 처방
- 독립 학술 연구의 실험 처방
- 복수 원료사의 공개 샘플 포뮬러
- 특허 실시예
- 제조사나 브랜드가 공개한 주요 성분 함량
- CIR의 카테고리별 사용 농도 자료
- 규제상 최대 사용 농도

정확한 처방은 카테고리·제형별 성분 함량, 배타적 상 질량 분포와 직교하는 휘발 물성
분포를 만드는 데 쓴다. 원료사의 감각 설명은 보조 메타데이터로만 저장하고 정답 라벨로
쓰지 않는다.

### 4. 시판 제품 전성분 코퍼스

제조사 공식 사이트와 현재 카탈로그에서 다음을 수집한다.

- 공식 제품명과 카테고리
- 공식 전성분과 순서
- 제조사 URL과 수집일
- 리뉴얼 여부와 버전
- 공개 함량
- 공식 제형 표현

이 자료는 성분 등장 빈도, 위치, 동시 출현, 유화제·오일·폴리머 조합과 실제 시장의
제형 분포를 추정하는 데 쓴다. 정확한 함량의 정답으로는 사용하지 않는다.

### 5. 복합원료

완성 처방에서 투입한 raw material과 표시되는 개별 INCI를 분리해 보존한다.

```json
{
  "raw_material_name": "Botanical Extract BG",
  "formula_amount": 1.0,
  "inci_components": [
    {"ingredient_id": 1, "active_fraction": null},
    {"ingredient_id": 2, "active_fraction": null},
    {"ingredient_id": 3, "active_fraction": null}
  ],
  "component_fraction_known": false
}
```

복합원료 1%를 구성 INCI 각각 1%로 펼치지 않는다. 구성비를 모르면 개별 성분의 정확한
함량 학습에는 사용하지 않고 범위와 출현 근거로만 사용한다.

### 6. 관능평가 데이터

모델 보정용 평가 데이터는 제품 카탈로그와 분리한다.

- 익명 평가자 ID
- 제품 ID와 배치 또는 리뉴얼 버전
- 평가 프로토콜 버전
- 도포량과 평가 면적
- 평가 부위
- 온도와 습도
- 도포 후 평가 시간
- 반복 회차
- 수분감 0~3
- 유분감 0~3
- 평가 일시

이 데이터는 순서형 모델의 계수와 경계를 보정하고 신뢰도를 검증하는 데만 사용한다.

## 원천 자료의 신뢰 등급과 사용 원칙

| 등급 | 자료 | 주된 용도 |
| --- | --- | --- |
| A | 내부 실제 제조 처방 | 함량 분포의 강한 근거 |
| B | 독립 학술 연구의 정확한 처방 | 함량과 물성의 강한 근거 |
| C | 복수 원료사의 샘플 포뮬러 | 중간 가중치의 함량 근거 |
| D | 특허 실시예 | 낮은 가중치의 배합 근거 |
| E | CIR 사용 농도·규제 범위 | 상한·하한 제약 |
| F | 시판 제품 공식 전성분 | 출현·위치·조합 통계 |
| G | 마케팅 문구와 후기 | 정답이나 함량 근거로 사용하지 않음 |

한 원료사나 하나의 특허 패밀리가 카테고리 통계를 지배하지 않게 출처별 최대 가중치를
둔다. 같은 기본 처방의 파생 버전은 독립 표본으로 중복 집계하지 않는다. 평가 때는
특정 원료사나 출처군 전체를 holdout해 일반화 여부를 확인한다.

원천 문서는 URL, 발행처, 문서명, 공개일, 수집일, 라이선스 메모와 함께 등록한다.
재배포가 불명확한 문서는 원문을 제품에 포함하지 않고 허용되는 구조화 사실과 출처만
보존한다.

초기 참고 출처는 다음을 포함하되 여기에 한정하지 않는다.

- 국가법령정보센터 화장품 표시기준
- EU Commission CosIng 성분 기능 데이터
- Cosmetic Ingredient Review의 사용 농도 자료
- ASTM E1490 스킨필 평가 지침
- 독립 학술 논문의 에멀션·에몰리언트 관능 연구
- 서로 독립된 원료사의 카테고리별 공개 포뮬러

## 수집 및 표준화 데이터 모델

### FormulaObservation

정확한 함량이 공개된 처방 한 건을 나타낸다.

```text
FormulaObservation
├─ formula ID
├─ source metadata
├─ product category
├─ application type
├─ formula archetype
├─ raw material inputs
│  ├─ raw material name
│  ├─ formula amount
│  └─ INCI components and known fractions
├─ manufacturing process summary
├─ measured physical properties when available
└─ claimed sensory terms, not ground truth
```

### MarketProductObservation

시판 제품의 공식 전성분 관측값을 나타낸다.

```text
MarketProductObservation
├─ source product identifier
├─ source and retrieval date
├─ category
├─ application type
├─ ordered canonical ingredient IDs
├─ disclosed amounts
└─ product revision
```

### IngredientSensoryProfile

성분이 특정 제품 처방에서 감각에 기여하는 방식을 나타낸다. 성분 자체의 절대적인
제품 점수가 아니며 함량과 제형에 따라 적용된다.

### EfficacyEvidenceObservation

저농도 active의 임상 근거를 감각 프로필과 분리해 보존한다. 초기 런타임 추론 데이터가
아니며 향후 별도 효능 모델의 입력 후보이다.

```text
EfficacyEvidenceObservation
├─ ingredient or raw material identity
├─ concentration and vehicle formula
├─ molecular weight, grade, pH and neutralization when relevant
├─ endpoint and measurement method
├─ application amount, frequency and duration
├─ comparator and sample population
├─ result and uncertainty
└─ source metadata and applicability limits
```

### CategoryFormulationPrior

카테고리와 제형에 조건을 둔 일반 배합 분포를 나타낸다.

```text
CategoryFormulationPrior
├─ category
├─ sample size and independent source count
├─ formula archetype probabilities
├─ phase load distributions
├─ ingredient occurrence probabilities
├─ concentration distributions when present
├─ rank distributions
├─ parent and archetype fallbacks
└─ source quality and version
```

## 카테고리와 제형 분리

사용자 탐색 카테고리와 물리적 제형을 같은 값으로 취급하지 않는다.

초기 제형 유형은 다음과 같다.

```text
AQUEOUS_SOLUTION
HYDROGEL
O_W_EMULSION
W_O_EMULSION
ALCOHOL_RICH_SOLUTION
ANHYDROUS_OIL
BALM_OR_WAX
POWDER_RICH_SUSPENSION
UNKNOWN
```

카테고리는 제형의 사전확률을 제공하고, 전성분의 물·유화제·오일·왁스·실리콘·폴리머·
파우더 조합이 그 확률을 갱신한다. 선크림이나 토너라는 이유만으로 특정 제형을 확정하지 않는다.

## 계산 알고리즘

### 1. 제형 유형 확률 계산

`FormulaArchetypeClassifier`는 카테고리 사전분포와 전성분 신호를 사용해 제형별 확률을
반환한다.

입력 신호는 다음과 같다.

- 물의 존재와 위치
- 유화제 조합
- 오일·왁스·버터·지방알코올
- 실리콘 조합
- 증점제와 폴리머
- 파우더와 무기 자외선 차단 성분
- 고순위 휘발성 알코올
- 공식 제형 표현이 있으면 해당 값

출력 예시는 다음과 같다.

```text
O_W_EMULSION        0.72
HYDROGEL            0.18
AQUEOUS_SOLUTION    0.08
UNKNOWN             0.02
```

초기에는 설명 가능한 규칙으로 구현한다. 정확한 제형 라벨이 충분히 쌓이면 분류 모델로
교체할 수 있지만 Domain 인터페이스는 유지한다.

### 2. 1% 경계 확률 계산

표시 순서에서 1% 이하 구간의 시작점을 하나로 확정하지 않는다. 각 후보 경계에 확률을
둔다. 보존제, 향료, 킬레이트제, 색소, 고활성 저함량 성분, 카테고리별 위치 분포와
성분별 통상 사용 상한은 경계의 근거지만 어느 하나를 절대 기준으로 쓰지 않는다.

### 3. 가능한 함량 조성 생성

`IngredientConcentrationEstimator`는 제형과 1% 경계 후보별로 가능한 여러 조성을 만든다.
각 조성은 다음을 만족해야 한다.

- 모든 성분 함량 합계가 100%다.
- 각 함량은 음수가 아니다.
- 1% 초과로 추정한 구간은 전성분 순서와 모순되지 않는다.
- 1% 이하 구간에는 순서 제약을 적용하지 않는다.
- 성분별 통상 사용 범위와 규제 상한을 지킨다.
- 공개 함량은 가장 강한 제약으로 사용한다.
- 카테고리와 제형별 수상·오일상·분산 고형물·미분류 질량 분포와 모순되지 않는다.
- 휘발량은 상 질량과 별도의 직교 제약으로 적용한다.

계산이 샘플링을 사용해도 결과는 결정적이어야 한다. 시드는 제품 ID가 아니라 카테고리,
순서가 보존된 성분 ID와 estimator 버전으로 만든다. 동일한 처방은 제품 ID와 관계없이
동일한 결과를 받는다.

### 4. 실제 상 조성 계산

각 가능한 조성에서 먼저 배타적인 물리 질량 비율을 계산한다.

```text
aqueousPhaseMass
oilPhaseMass
dispersedSolidMass
unclassifiedMass

aqueousPhaseMass + oilPhaseMass + dispersedSolidMass + unclassifiedMass = 100%
```

이 단계는 성분의 효능이나 소비자 감각을 계산하지 않는다. 0.3% 비휘발성 오일은
유상에 최대 0.3%만 더하고, 0.1% 히알루론산이 수상 전체를 크게 늘리는 것으로 보지 않는다.
성분별 예상 함량은 `phase allocation` 비율로 나누되 각 성분의 배분 합도 100%여야 한다.
카보머·검류처럼 구조를 만드는 고분자의 실제 질량도 어느 한 상 또는 미분류 질량에
보존하지만, 그 질량을 보습감·유분감으로 직접 변환하지 않는다.

휘발성은 다음처럼 별도 직교 값으로 계산한다.

```text
EstimatedDryDown
├─ volatileMassAtApplication
└─ estimatedEvaporatedMassAtFiveMinutes
```

`volatileMassAtApplication`은 수상·유상 질량과 중복될 수 있으므로 상 질량 합계에 더하지
않는다. 5분 후 잔존량은 원료의 증기압·분자량, 제형, 도포량과 환경을 전성분만으로 모두
알 수 없으므로 범위와 신뢰도를 함께 가진다.

### 5. 효과 채널별 농도 반응 계산

성분마다 같은 위치 가중치를 적용하지 않고, 가능한 조성의 예상 함량을 각 효과 채널의
농도 반응 함수에 넣는다.

```text
SensoryEffectChannel
├─ AFTERFEEL_MOISTURE
├─ AFTERFEEL_OILINESS
├─ RHEOLOGY
└─ FILM_FORMATION
```

지원할 초기 반응 형태는 다음과 같다.

| 반응 | 용도 | 예시 |
| --- | --- | --- |
| linear | 일반 감각 특성의 함량 비례 기여 | 비휘발성 오일의 잔여감 |
| saturating | 농도 증가에 따라 커지지만 점차 포화 | 글리세린 등 일반 습윤제 |
| threshold/sigmoid | 낮은 농도에서는 작고 임계 구간에서 빠르게 증가 | 카보머·검류의 레올로지 |
| evidence bounded | 근거가 있는 농도·제형 조건 안에서만 감각 반응을 부여 | 특정 필름 형성제의 관능 연구 |
| none | 해당 감각 채널에는 기여하지 않음 | 감각 근거가 없는 저농도 active |

정확한 반응 계수는 원천 근거와 관능 보정으로 정한다. 근거 없이 `1% 이하 = 0.1배` 같은
공통 계수를 두지 않는다.

### 6. 제형 modifier와 감각 특징 생성

상 조성과 채널별 반응을 합쳐 다음 중간 특징을 만든다.

```text
EstimatedPhaseComposition
├─ aqueousPhaseMass
├─ oilPhaseMass
├─ dispersedSolidMass
└─ unclassifiedMass

EstimatedDryDown
├─ volatileMassAtApplication
└─ estimatedEvaporatedMassAtFiveMinutes

FormulationModifiers
├─ humectantResponse
├─ aqueousRetentionResponse
├─ residualOilResponse
├─ occlusiveResponse
├─ rheologyResponse
├─ filmResponse
├─ slipResponse
├─ tackResponse
├─ waxStructureResponse
└─ powderAbsorbencyResponse
```

기본 합산에도 미량 성분이 많다는 이유만으로 점수가 계속 커지지 않게 포화 함수를 적용한다.

```text
saturated(x) = 1 - exp(-x / scale)
```

`EfficacyEvidenceObservation`은 이 런타임 계산에 들어오지 않는다. 별도의 제품 효능
요구와 검증 프로토콜이 확정되면 새 계획에서 효능 모델을 설계한다.

### 7. 상호작용 적용

다음 조합을 개별 성분 합산과 별도로 반영한다.

- 습윤제 × 친수성 폴리머: 촉촉함과 점착 증가 가능성
- 습윤제 × 피막제: 수분 유지 성향 증가
- 비휘발성 오일 × 왁스: 리치함과 잔여 유분 증가
- 가벼운 에스터 × 휘발성 실리콘: 초기 슬립과 빠른 드라이다운
- 오일 × 흡유 파우더: 표면 유분감 감소
- 고순위 알코올 × 수상 제형: 초기 젖음과 5분 후 감각 분리
- W/O 확률 × 높은 오일상: 피막과 잔여 유분 증가

레올로지·필름·슬립은 실제 유상 질량을 변경하지 않는다. 다만 소비자가 기름지거나
무겁다고 느끼는 정도에는 간접적으로 기여할 수 있으므로 `oilPhaseMass`와
`afterfeelOiliness` 사이의 modifier로만 적용한다.

### 8. 카테고리 사전분포 적용

카테고리는 최종 점수에 직접 가산하지 않는다. 카테고리로 제형 가능성, 성분별 포함 시
함량과 상 총량의 분포가 달라지고, 바뀐 가능한 조성이 최종 점수를 바꾸게 한다.

세부 카테고리 표본이 부족하면 다음 순서로 축소 추정한다.

```text
세부 카테고리
→ 부모 카테고리
→ 동일 제형 유형
→ leave-on 전체
→ 전역 성분 사용 범위
```

### 9. 독립된 두 레벨 확률 계산

`SensoryLevelModel`은 수분감과 유분감에 대해 각각 레벨 확률을 반환한다.

```text
moisture: [0.05, 0.18, 0.62, 0.15]
oil:      [0.51, 0.37, 0.10, 0.02]
```

가장 확률이 높은 값을 공개 레벨로 선택한다. 초기에는 전문가 규칙과 기준 제품으로
계수와 경계를 설정하고, 관능 데이터가 쌓이면 누적 로짓과 같은 순서형 모델로 보정한다.

개념적인 입력 관계는 다음과 같다.

```text
afterfeel moisture =
    f(water phase,
      humectant response,
      aqueous retention,
      hydrophilic film,
      rheology,
      tack,
      volatility)

afterfeel oiliness =
    f(oil phase,
      residual oil,
      wax structure,
      nonvolatile film,
      slip,
      rheology,
      powder absorbency)
```

이 관계는 카보머를 유상 성분으로 계산하거나 HA 0.1%를 수상 총량 증가로 계산하는 오류를
막는다.

### 10. 신뢰도 계산

신뢰도는 다음 요소로 구성한다.

- 상위 영향 성분의 프로필 커버리지
- 프로필과 함량 근거의 출처 품질
- 제형 유형 판정의 확실성
- 가능한 조성별 결과의 안정성
- 선택한 레벨의 확률 우위
- 카테고리 사전분포의 표본 수와 독립 출처 수
- 분자량·원료 등급·pH·중화 상태 등 필요한 조건의 공개 여부
- 효과 채널별 농도 반응 근거의 직접성

하나의 매우 낮은 요소가 단순 평균에 가려지지 않게 기하평균과 최소값 제한을 사용한다.
알려지지 않은 성분은 0점 처리하지 않고 커버리지와 신뢰도를 낮춘다.

## 런타임 도메인 구조

수분·유분은 제품 안에서의 조성과 감각을 평가한 결과이므로 `ingredient`가 아니라
`product`가 소유한다.

```text
product/domain/
├─ Product
├─ Products
├─ ProductFactory
└─ sensory/
   ├─ ProductSensory
   ├─ MoistureLevel
   ├─ OilLevel
   ├─ SensoryConfidence
   ├─ SensoryModelVersion
   ├─ ProductSensoryEstimator
   ├─ FormulaArchetype
   ├─ FormulaArchetypeProbabilities
   ├─ FormulaArchetypeClassifier
   ├─ IngredientConcentrationEstimator
   ├─ EstimatedComposition
   ├─ EstimatedCompositions
   ├─ SensoryEffectChannel
   ├─ ConcentrationResponse
   ├─ PhaseCompositionEstimator
   ├─ EstimatedPhaseComposition
   ├─ DryDownEstimator
   ├─ EstimatedDryDown
   ├─ SensoryEffectChannelEvaluator
   ├─ FormulationModifiers
   ├─ SensoryFeatureExtractor
   ├─ SensoryFeatures
   ├─ SensoryLevelModel
   ├─ IngredientSensoryProfile
   ├─ IngredientSensoryProfiles
   ├─ CategoryFormulationPrior
   └─ CategoryFormulationPriors

product/repository/
├─ ProductRepository
├─ IngredientSensoryProfileRepository
├─ CategoryFormulationPriorRepository
└─ SensoryModelParameterRepository
```

### ProductSensory

두 의미가 다른 값을 같은 `Integer`로 두지 않는다.

```java
public record ProductSensory(
        MoistureLevel moisture,
        OilLevel oil,
        SensoryConfidence confidence,
        SensoryModelVersion modelVersion) {
}
```

`MoistureLevel`과 `OilLevel`은 각각 `0~3` 값을 가진 별도 타입으로 만들어 생성자 인수나
필터에서 서로 바뀌는 오류를 막는다.

### 상 조성, 드라이다운, 제형 modifier와 효능 근거 경계

중간 계산 결과도 의미별 타입으로 분리한다.

- `EstimatedPhaseComposition`은 합계가 100%인 수상·유상·분산 고형물·미분류 질량과
  불확실성을 보관한다. 모든 추정 성분 질량은 정확히 한 번 보존한다.
- `EstimatedDryDown`은 상 분할과 직교하는 초기 휘발 질량과 5분 후 예상 증발 질량을
  보관한다.
- `FormulationModifiers`는 습윤, 잔여 유분, 레올로지, 피막, 슬립, 점착, 흡유처럼
  도포 후 감각을 바꾸는 반응을 보관한다. 상 질량을 수정할 수 없다.
- `ConcentrationResponse`는 성분과 `SensoryEffectChannel` 조합별 농도–반응 함수를 값으로
  표현한다. 선형, 포화, 임계형, 근거 구간 한정형을 지원하되 임의의 실행 코드를
  참조 데이터에서 주입하지 않는다.

이 경계 덕분에 0.3% 오일은 실제 유상에 0.3%만 기여하면서도 잔여감 특성을 별도로
가질 수 있고, 0.1% HA는 수상 질량을 부풀리지 않으면서 근거 범위 안에서만 보습 효능
근거로 기록될 수 있다. 카보머 질량은 상 분할에 보존되고 낮은 농도에서도 별도 레올로지
modifier로 작동할 수 있다.

### ProductSensoryEstimator

카테고리와 성분 목록을 받아 순수한 Domain 계산만 수행한다.

```java
public ProductSensory estimate(Category category, Ingredients ingredients) {
    FormulaArchetypeProbabilities archetypes =
            archetypeClassifier.classify(category, ingredients);
    EstimatedCompositions compositions =
            concentrationEstimator.estimate(
                    category,
                    ingredients,
                    archetypes,
                    ingredientProfiles,
                    categoryPriors);
    EstimatedPhaseComposition phaseComposition =
            phaseCompositionEstimator.estimate(compositions);
    EstimatedDryDown dryDown =
            dryDownEstimator.estimate(compositions, archetypes);
    FormulationModifiers modifiers =
            sensoryEffectChannelEvaluator.evaluate(compositions, ingredientProfiles);
    SensoryFeatures features =
            featureExtractor.extract(phaseComposition, dryDown, modifiers, archetypes);
    return levelModel.evaluate(features);
}
```

이 객체는 Spring, Repository, JSON, HTTP를 알지 않는다. 동일 입력과 동일 버전에 항상
동일 결과를 돌려야 한다.

`EfficacyEvidenceObservation`을 읽는 의존성은 `ProductSensoryEstimator`에 두지 않는다.
피부 보습 효능 근거가 도포 5분 후 수분감 레벨에 잘못 가산되는 것을 타입과 조립 단계에서
막기 위한 의존성 방향이다.

### ProductFactory

`ProductRepository`가 참조를 해석한 뒤 `ProductFactory`에 생성을 위임한다.
`ProductFactory`가 `ProductSensoryEstimator`로 값을 계산해 완전한 `Product`를 만든다.
`Product`는 계산 방법을 모르고 완성된 `ProductSensory`만 자신의 상태로 가진다.

### Config 조립

각 Repository가 읽은 매핑을 `ProductSensoryConfig`가 `Ingredients`, `Categories`와 함께
도메인 컬렉션으로 조립한다. Domain은 Repository를 직접 참조하지 않는다.

## 데이터 저장 경계

### products.json에서 제거

- `moisture_level`
- `oil_level`

### products.json에 유지하거나 향후 추가

- 카테고리 참조
- 순서가 보존된 성분 참조
- 공개 함량이 생기면 제품과 성분 관계의 값
- 공식 적용 방식이나 제형이 원천 데이터에 있으면 해당 참조

### 별도 참조 데이터

- ingredient sensory profiles
- category formulation priors
- sensory model parameters
- source registry and versions

참조 데이터는 JSON, YAML 또는 이후 DB로 저장할 수 있다. 저장 형식은 Domain 계약이
아니다. 초기 저장 형식은 라이선스, CI 재현성과 운영 데이터 배포 방식을 확인한 뒤
결정한다. 깨끗한 CI에서는 작고 대표적인 테스트 fixture로 애플리케이션을 기동한다.

## 서버 기동 흐름

```text
IngredientRepository → Ingredients
CategoryRepository → Categories
감각 참조 Repository → 원천 매핑
ProductSensoryConfig → 도메인 프로필·사전분포·모델 조립
ProductRepository → 제품 참조 해석
ProductFactory → ProductSensory 계산
Product → Products에 저장
API 요청 → 이미 계산된 값을 조회·필터
```

응답 DTO에서 계산하거나 API 요청마다 전성분을 다시 순회하지 않는다. 목록, 상세,
필터와 count가 모두 `Product`가 가진 동일 값을 사용한다.

## API와 필터

외부 API의 `0~3` 정수 계약은 유지할 수 있다. DTO 경계에서 `MoistureLevel.value()`와
`OilLevel.value()`로 변환한다. 요청 DTO는 정수를 받되 `ProductFilter`를 만들 때
별도 레벨 타입으로 변환해 Domain 안에서는 `Integer` 두 목록을 혼동하지 않게 한다.

신뢰도와 모델 버전은 초기 공개 API에 바로 추가하지 않는다. 내부 품질 리포트와 검수에
먼저 사용하고 사용자 가치와 계약이 확정된 뒤 별도 API 변경으로 진행한다.

## 오프라인 데이터 빌더

런타임과 분리된 도구가 다음 책임을 가진다.

```text
source importer
efficacy evidence importer
ingredient canonicalizer
raw material decomposer
category mapper
formula archetype mapper
formula deduplicator
source quality assessor
concentration statistics builder
category prior builder
profile coverage reporter
source bias reporter
provenance reporter
```

출력은 성분 감각 프로필, 카테고리 사전분포, 모델 파라미터, 품질 리포트,
미해결 성분 리포트, 출처 편향 리포트와 런타임에서 분리된 효능 근거 레지스트리다.
같은 원천과 빌더 버전으로 같은 결과를 재생성할 수 있어야 한다.

## 관능평가 및 모델 보정

초기 목표는 제품 80~120개, 평가자 8~12명, 제품당 2회 반복이다. 실제 카테고리 분포를
보고 표본 수는 조정하되 각 주요 카테고리와 제형이 포함돼야 한다.

평가 조건은 다음을 통제한다.

- 제품명과 브랜드를 가린다.
- 동일 도포량과 면적을 사용한다.
- 동일 평가 부위와 대기 시간을 사용한다.
- 가능한 범위에서 온도와 습도를 통제한다.
- 평가자에게 단계별 기준 제품을 제공한다.
- 제품 순서를 무작위화한다.
- 같은 평가자가 반복 평가한다.

평가자 간 일치도를 확인하고 중앙값 또는 합의 규칙으로 제품별 보정 라벨을 만든다.
브랜드, 제품군, 원료사와 출처 단위로 holdout해 데이터 누수를 막는다.

다음 세 베이스라인을 동일한 검증 세트에서 비교한다.

1. 카테고리만 사용하는 모델
2. 성분 역할과 고정 위치 가중치 모델
3. 제형·함량 제약과 카테고리 사전분포를 사용하는 목표 모델

평가 지표는 정확히 같은 레벨 비율, 1단계 이내 비율, 평균 절대 오차, quadratic weighted
kappa, 카테고리별 성능, 신뢰도별 실제 오류율이다. 절대 수치 목표는 초기 데이터로
베이스라인을 만든 뒤 결정하되, 목표 모델이 단순 베이스라인보다 개선되지 않으면
복잡한 모델을 채택하지 않는다.

## 검증 전략

### Domain 단위 테스트

- 레벨 값과 모델 버전의 불변조건
- 프로필 중복과 존재하지 않는 성분 참조
- 성분별 `phase allocation` 합계 100%
- 카테고리 사전분포 중복과 fallback
- 제형 확률 합계와 UNKNOWN 처리
- 1% 경계 후보와 확률 합계
- 가능한 조성의 함량 합계 100%
- 배타적 상 질량 합계 100%와 성분 질량의 중복·누락 금지
- 휘발량이 배타적 상 질량 합계에 더해지지 않음
- 공개 함량의 우선 적용
- 미분류 성분의 신뢰도 하락
- 임상 효능 근거가 감각 estimator에 조립되지 않음
- 동일 입력과 버전의 결정성

### 성질 기반 테스트

다른 조건이 같을 때 다음 성질을 검증한다.

- 습윤제 예상 함량 증가가 수분감을 낮추지 않는다.
- 비휘발성 오일 증가가 유분감을 낮추지 않는다.
- 흡유 파우더 증가가 유분감을 높이지 않는다.
- 휘발성 성분 증가가 최종 잔여 유분감을 높이지 않는다.
- 같은 총량의 미량 오일을 여러 INCI로 나눠도 유상 질량이 증가하지 않는다.
- 레올로지 반응만 바꿔도 배타적 상 질량은 바뀌지 않는다.
- 휘발성 추정만 바꿔도 배타적 상 질량 합계는 바뀌지 않는다.
- 임상 효능 근거의 추가·삭제만으로 공개 유수분 레벨이 바뀌지 않는다.
- 제품 ID만 다른 동일 처방은 동일 결과를 낸다.

상호작용 때문에 단조성이 성립하지 않는 조건은 예외를 암묵적으로 두지 않고 테스트 이름과
Domain 규칙으로 명시한다.

### Repository 테스트

- 제품 JSON에 유수분 필드가 없어도 `Product`가 생성된다.
- 전성분 순서가 보존된다.
- 감각 참조 데이터가 Domain 객체로 해석된다.
- 중복·범위 오류·잘못된 참조에서 기동이 실패한다.
- 프로필이 없는 정상 성분은 기동 실패가 아니라 낮은 신뢰도로 처리된다.

### API 회귀 테스트

- 목록과 상세가 같은 레벨을 반환한다.
- 목록과 count가 같은 필터 판정을 사용한다.
- 수분·유분 요청 값의 `0~3` 계약이 유지된다.
- 생성 OpenAPI와 TypeScript 산출물이 계약과 일치한다.

### 전체 검증

- `sh ./scripts/test.sh`
- `sh ./scripts/verify.sh`
- 실제 운영 데이터에 대한 커버리지·결정성·변경 diff 리포트

## 버전과 운영 관리

다음 버전을 독립 관리한다.

```text
ingredientProfileVersion
categoryPriorVersion
levelModelVersion
assessmentProtocolVersion
dataBuilderVersion
```

최종 결과에는 이 조합을 식별하는 `SensoryModelVersion`을 보관한다. 규칙이나 데이터가
바뀌면 전체 제품을 새 버전으로 다시 계산하고 다음 diff를 검토한다.

- 전체 제품 수
- 레벨이 바뀐 제품 수
- 1단계 변경 제품
- 2단계 이상 변경 제품
- 신뢰도가 낮아진 제품
- 새롭게 미분류된 고영향 성분
- 카테고리별 레벨 분포 변화

2단계 이상 바뀐 제품은 자동 승인하지 않고 검수 큐에 넣는다. 새 자료를 수집했다고
운영 모델이 자동 학습하거나 조용히 결과를 바꾸지 않는다. 자료 수집, 빌드, 보정,
독립 검증, 버전 승인과 배포 순서를 지킨다.

## 수동 보정

초기에는 수동 보정을 만들지 않는다. 실제 관능 결과나 명백한 모델 결함 때문에 필요해지면
제품 JSON의 레벨 필드를 되살리지 않고 별도 `ProductSensoryOverride`를 둔다.

```text
ProductSensoryOverride
├─ product ID
├─ moisture level
├─ oil level
├─ reason
├─ reviewer
├─ reviewed at
└─ applicable model version
```

모델 버전이 바뀌면 기존 override를 자동 영구 적용하지 않고 재검토한다.

## 단계별 작업

### 0. 목표 정의와 프로토콜

- [x] 수분감과 유분감의 소비자 문구를 확정한다.
- [x] 5분 after-feel을 초기 목표 시점으로 확정하거나 근거와 함께 변경한다.
- [x] 초기 대상과 제외 카테고리를 확정한다.
- [x] leave-on/rinse-off를 표현할 원천 계약을 정한다.
- [x] [관능평가 프로토콜 초안](../../product/sensory-assessment-protocol.md)과 단계별 기준 제품
  선정 원칙을 작성한다.

### 1. 현재 카탈로그 데이터 감사

- [x] 운영 제품 수와 카테고리별 분포를 집계한다.
- [x] 유수분 null과 기존 임시값 상태를 확인한다.
- [x] 카탈로그 JSON의 전성분 배열·빈 목록·중복·미해결 참조 품질을 확인한다.
- [ ] 공식 원문과 대조해 전성분 순서·누락·완전성을 검증한다.
- [x] 제품별 성분 수 분포를 확인한다.
- [x] 기존 성분 역할 태그 커버리지를 계산한다.
- [x] 상위 빈출 성분과 유수분 고영향 후보를 분리한다.
- [x] 공개 함량과 공식 제형 데이터의 존재 여부를 확인한다.
- [x] [catalog-sensory-readiness-report](../../product/catalog-sensory-readiness-report.md)를
  남긴다.

### 2. 수집 스키마와 출처 관리

- [x] [감각 원천 데이터 계약](../../product/sensory-source-data-contract.md)에
  `SourceMetadata` 계약을 정의한다.
- [x] `FormulaObservation` 계약을 정의한다.
- [x] `MarketProductObservation` 계약을 정의한다.
- [x] 런타임 감각 입력과 분리된 `EfficacyEvidenceObservation` 계약을 정의한다.
- [x] 복합원료와 미상 구성비의 표현을 정의한다.
- [x] 카테고리와 제형 canonical 매핑을 정의한다.
- [x] 성분 ID·한글명·영문명·별칭 해석 규칙을 재사용한다.
- [x] 원천 자료의 라이선스와 재배포 가능 여부 기록 절차를 정한다.
- [x] 유사 처방과 특허 패밀리의 중복 제거 기준을 정한다.

### 3. 초기 원천 데이터 수집

- [ ] 각 주요 카테고리에서 정확한 함량 처방을 수집한다.
- [ ] 카테고리마다 세 개 이상의 독립 출처군을 확보한다.
- [ ] 특정 원료사의 최대 표본 비중을 제한한다.
- [ ] 시판 공식 전성분 코퍼스를 구축한다.
- [ ] 공개 함량과 공식 제형 표현을 별도로 수집한다.
- [ ] 학술 물성·관능 연구에서 성분군 근거를 수집한다.
- [ ] 저농도 active 임상 자료는 농도·vehicle·분자량·기간·endpoint 조건과 함께 감각
  근거와 분리해 수집한다.
- [ ] CIR와 규제 자료는 통상값이 아니라 상한·범위로 구분한다.
- [ ] 출처 품질과 미해결 복합원료 리포트를 생성한다.

초기 수집 목표는 주요 카테고리별 정확한 함량 처방 30~50개와 시판 공식 전성분
200개 이상이다. 이는 고정 완료 기준이 아니라 계층형 사전분포를 독립적으로 세울 수 있는지
판단할 출발점이다. 확보하지 못한 카테고리는 상위 카테고리·제형 분포로 fallback한다.

### 4. 성분 감각 프로필 구축

- [ ] 성분 감각 특성과 단위·범위를 정의한다.
- [ ] 상 질량 배분과 도포 후 수분감·유분감·레올로지·피막 감각 채널을 나눈다.
- [ ] 모든 성분·성분군 `phase allocation` 합계가 100%가 되게 검증한다.
- [ ] 채널별 농도–반응을 선형, 포화, 임계형, 근거 구간 한정형 또는 없음으로 정의한다.
- [ ] 폴리올과 주요 습윤제 프로필을 작성한다.
- [ ] 에스터·식물유·미네랄오일·실리콘을 분리한다.
- [ ] 왁스·버터·지방알코올 프로필을 작성한다.
- [ ] 휘발성 알코올·실리콘·탄화수소를 분리한다.
- [ ] 파우더·실리카·전분·클레이의 흡유 특성을 작성한다.
- [ ] 검·카보머·셀룰로오스·아크릴레이트의 점도·점착 특성을 작성한다.
- [ ] 카보머와 검류는 유상 기여 없이 레올로지 임계 반응만 갖도록 검증한다.
- [ ] HA는 분자량과 근거 농도, 카보머는 원료 등급·pH·중화 상태를 조건으로 기록한다.
- [ ] HA·판테놀 등 저농도 active의 임상 근거를 감각 프로필과 분리해 보존한다.
- [ ] 개별 프로필이 없는 성분을 위한 성분군 fallback을 정의한다.
- [ ] 각 프로필에 출처·신뢰 등급·검수자·버전을 기록한다.
- [ ] 실제 카탈로그 상위 영향 성분의 프로필 커버리지를 보고한다.

### 5. 카테고리 배합 사전분포 생성기

- [ ] 정확한 처방에서 상별 총량을 계산한다.
- [ ] 성분별 출현 확률과 포함 시 함량 분포를 계산한다.
- [ ] 시판 전성분의 위치·동시 출현 통계를 계산한다.
- [ ] 카테고리별 제형 유형 확률을 계산한다.
- [ ] 세부·부모·제형·전역 계층 fallback을 구현한다.
- [ ] 출처 품질과 출처별 최대 가중치를 적용한다.
- [ ] 표본 수·독립 출처 수·분포 폭을 품질 지표로 남긴다.
- [ ] 동일 원천과 빌더 버전의 재현성을 검증한다.

### 6. Domain 값과 컬렉션

- [x] `MoistureLevel`을 만든다.
- [x] `OilLevel`을 만든다.
- [x] `SensoryConfidence`를 만든다.
- [x] `SensoryModelVersion`을 만든다.
- [x] `ProductSensory`를 만든다.
- [x] `ApplicationType`과 `FormulaArchetype`을 만든다.
- [x] `FormulaArchetypeProbabilities`를 만든다.
- [x] `SensoryEffectChannel`을 만든다.
- [ ] `ConcentrationResponse`를 만든다.
- [ ] `EstimatedPhaseComposition`을 만든다.
- [ ] `EstimatedDryDown`을 만든다.
- [ ] `FormulationModifiers`를 만든다.
- [ ] `IngredientSensoryProfile(s)`를 만든다.
- [ ] `CategoryFormulationPrior(s)`를 만든다.
- [ ] 모든 불변조건과 잘못된 참조 테스트를 추가한다.

### 7. 추론 파이프라인

- [ ] `FormulaArchetypeClassifier`와 규칙 테스트를 구현한다.
- [ ] 1% 경계 후보와 확률 계산을 구현한다.
- [ ] `IngredientConcentrationEstimator`를 구현한다.
- [ ] 결정적 조성 생성과 100% 합계 검증을 구현한다.
- [ ] `PhaseCompositionEstimator` 하나가 배타적인 수상·유상·분산 고형물·미분류 질량을
  계산하게 한다.
- [ ] 상 질량 합계 100%, 성분별 질량 보존과 중복 배정 금지를 검증한다.
- [ ] `DryDownEstimator`로 상 분할과 직교하는 초기 휘발량과 5분 후 증발량을 계산한다.
- [ ] `SensoryEffectChannelEvaluator`로 감각 채널별 농도–반응과 근거 적용 범위를 계산한다.
- [ ] `SensoryFeatureExtractor`를 구현한다.
- [ ] 포화 함수와 상호작용을 구현한다.
- [ ] 분자량·원료 등급·pH·중화 상태가 없을 때 시나리오 범위와 신뢰도 하락을 적용한다.
- [ ] 일반 미량 오일, 저농도 active, 저농도 레올로지 modifier의 기여 채널 분리 테스트를
  추가한다.
- [ ] 임상 효능 근거가 공개 감각 추론의 입력으로 조립되지 않는지 테스트한다.
- [ ] 독립된 수분·유분 순서형 모델을 구현한다.
- [ ] 신뢰도와 상위 기여 근거 계산을 구현한다.
- [ ] 단순 베이스라인 두 개를 비교용으로 구현한다.

### 8. Product 생성과 API 연결

- [ ] `ProductFactory`를 만든다.
- [ ] `Product`가 `ProductSensory`를 소유하게 바꾼다.
- [ ] `ProductRepository`에서 원천 유수분 필드 읽기를 제거한다.
- [ ] 감각 참조 Repository와 `ProductSensoryConfig`를 추가한다.
- [ ] 제품 fixture에서 유수분 필드를 제거한다.
- [ ] DTO 경계에서 레벨 타입을 정수로 변환한다.
- [ ] `ProductFilter` 내부를 가능한 범위에서 강타입으로 바꾼다.
- [ ] 목록·상세·filter·count 회귀 테스트를 추가한다.
- [ ] OpenAPI와 TypeScript 생성물을 갱신·검증한다.

### 9. 관능평가와 모델 보정

- [ ] 카테고리·제형별 평가 제품을 층화 표집한다.
- [ ] 평가자 교육과 기준 제품을 확정한다.
- [ ] 반복 관능평가를 수행한다.
- [ ] 평가자 간 일치도를 분석한다.
- [ ] 제품군·브랜드·출처 단위 holdout을 만든다.
- [ ] 순서형 모델 계수와 경계를 보정한다.
- [ ] 베이스라인 대비 성능을 비교한다.
- [ ] 정확한 처방의 상 조성·휘발 물성은 물리 특징에, 관능평가는 도포 후 감각에만
  맞춰지는지 검증한다.
- [ ] 신뢰도와 실제 오류율의 상관을 검증한다.
- [ ] 결과와 한계를 문서화한다.

### 10. 운영 반영

- [ ] 모델·프로필·사전분포·프로토콜 버전을 고정한다.
- [ ] 운영 전체 제품을 계산한다.
- [ ] 2단계 이상 변경과 낮은 신뢰도 제품을 검수한다.
- [ ] 배포 전 데이터 품질 게이트를 추가한다.
- [ ] 모델 변경 diff 리포트를 자동화한다.
- [ ] 신규 성분·카테고리의 fallback과 검수 큐를 운영한다.
- [ ] `ARCHITECTURE.md`와 제품 컨텍스트 문서를 갱신한다.
- [ ] 전체 테스트와 `verify.sh`를 통과시킨다.

## 완료 조건

다음을 모두 만족해야 계획을 완료 처리한다.

- 원천 `products.json`에 제품별 유수분 결과가 없다.
- 모든 초기 범위 제품이 기동 시 유효한 `ProductSensory`를 가진다.
- 동일 입력과 동일 버전의 결과가 재현된다.
- 계산 규칙, 성분 프로필과 카테고리 사전분포의 출처·버전이 추적된다.
- 미분류 성분이 결과 0점으로 조용히 흡수되지 않는다.
- 실제 상 조성, 직교하는 휘발 특성과 도포 후 감각이 서로 다른 타입과 계산 경로로
  분리돼 있다.
- 임상 효능 근거는 공개 감각 추론의 런타임 의존성에 포함되지 않는다.
- 1% 이하 일반 성분은 개수로 누적 가산되지 않고 추정 함량만큼 상 조성에 기여한다.
- 저농도 active는 도포 후 감각 근거가 있는 경우에만 해당 감각 채널에 기여하고,
  레올로지 modifier는 상 질량을 부풀리지 않고 레올로지 채널에만 추가 기여한다.
- 목록·상세·필터·count가 같은 계산 결과를 사용한다.
- 실제 관능평가에서 목표 모델이 단순 베이스라인보다 낫다.
- 신뢰도가 낮은 결과에서 실제 오류도 더 높아 신뢰도가 의미 있게 보정돼 있다.
- 깨끗한 CI와 운영 데이터 환경에서 기동·검증 절차가 재현된다.
- 모델 변경 시 전체 제품 diff와 대규모 변경 검수 절차가 작동한다.
- 관련 동작과 데이터 계약이 `ARCHITECTURE.md`에 반영돼 있다.
- `sh ./scripts/test.sh`와 `sh ./scripts/verify.sh`가 통과한다.

## 주요 위험과 대응

| 위험 | 대응 |
| --- | --- |
| 정확한 처방 자료 부족 | 세부 카테고리를 억지로 학습하지 않고 제형·상위 카테고리로 fallback |
| 원료사 샘플 편향 | 독립 출처 수, 출처별 최대 가중치와 출처군 holdout |
| 1% 경계 오판 | 단일 경계가 아닌 여러 후보와 확률로 계산 |
| 복합원료 함량 부풀림 | raw material과 표시 INCI를 분리 보존 |
| 카테고리 선입견 | 카테고리를 최종 가점이 아니라 함량 사전분포에만 사용 |
| 모든 1% 이하 성분의 일괄 축소 | 실제 질량과 감각 채널별 농도–반응을 구분하고 근거 없는 공통 계수를 금지 |
| 미량 오일 개수로 인한 유분 과대평가 | 성분 수가 아니라 가능한 조성의 실제 유상 질량과 포화된 modifier로 계산 |
| 휘발성을 배타적 상으로 취급 | 질량 보존형 상 분할과 직교하는 `EstimatedDryDown`으로 분리 |
| 레올로지를 유분 함량으로 오인 | 실제 질량은 상 분할에 한 번 보존하고 레올로지 반응은 `FormulationModifiers`로 분리 |
| HA 분자량, 카보머 등급·pH·중화 상태 미상 | 감각 관련 조건은 시나리오와 신뢰도에 반영하고 임상 효능은 근거 적용 범위를 단정하지 않음 |
| 미분류 성분 | 0점 대신 신뢰도 하락과 고영향 미분류 리포트 |
| 동일 처방 결과 변동 | 처방 시그니처와 버전에 기반한 결정적 계산 |
| 관능 데이터 과적합 | 브랜드·제품군·출처 단위 holdout과 단순 모델 비교 |
| 기동 시간 증가 | 계산을 한 번만 수행하고 결과를 `Product`에 보관, 성능 기준 측정 |
| 모델 갱신의 대규모 결과 변화 | 버전 고정, 전체 diff, 2단계 이상 변경 수동 검수 |
| 감각과 효능의 혼동 | after-feel 정의를 API·문서·평가 프로토콜에서 일관되게 사용 |

## 결정 기록

- 2026-08-17: 제품별 유수분 레벨을 원천 JSON에 저장하지 않고 Domain 생성 시 계산하기로 했다.
- 2026-08-17: 수분감과 유분감을 임상 효능이 아닌 도포 5분 후의 독립된 감각 축으로
  시작하기로 했다. 실제 관능 프로토콜 확정 시 시간은 근거와 함께 조정할 수 있다.
- 2026-08-17: 카테고리 빈도는 성분 자체의 감각 가중치를 올리는 데 쓰지 않고 제형과
  함량 사전분포에 사용하기로 했다.
- 2026-08-17: 고정 위치 가중치보다 1% 경계, 성분 사용 범위와 카테고리 배합 통계를
  제약으로 사용하는 가능한 조성 추론을 목표 모델로 정했다.
- 2026-08-17: 계산은 `Product`나 DTO가 직접 수행하지 않고 순수 Domain 서비스와
  `ProductFactory`가 담당하며, `Product`는 완성된 `ProductSensory`를 소유하기로 했다.
- 2026-08-17: 1% 이하 성분에 공통 감쇠 계수를 적용하지 않고 실제 상 조성은 질량 보존으로,
  도포 후 감각·레올로지·피막은 감각 채널별 농도–반응으로 계산하기로 했다. 피부 보습
  효능 근거는 이 계산에서 분리한다.
- 2026-08-17: 저농도 HA·판테놀의 효능 가능성과 카보머의 레올로지 효과는 인정하되,
  HA·판테놀 임상 근거는 초기 런타임 점수에서 제외하고 카보머의 실제 질량과 레올로지
  반응은 서로 다른 계산에 한 번씩만 반영하기로 했다.
- 2026-08-17: 분자량·원료 등급·pH·중화 상태처럼 전성분에서 알 수 없는 조건은 대표값으로
  숨기지 않고 시나리오 범위와 신뢰도에 반영하기로 했다.
- 2026-08-17: 휘발성은 수상·유상과 배타적인 상이 아니므로 합계 100%의 질량 분할과
  직교하는 드라이다운 추정을 별도 타입으로 계산하기로 했다.
- 2026-08-17: 초기 공개 문구와 훈련 패널의 목표를 도포 5분 후 독립된 수분감·유분감
  `0~3` 순서형 단계로 확정하고 `0.1-draft` 관능평가 프로토콜에 기록했다. 정확한 도포량,
  부위, 환경과 기준 제품은 파일럿 뒤 새 프로토콜 버전으로 승인한다.
- 2026-08-17: `application_type`은 5분 평가 시점이 아니라 공식 정상 사용 절차의 제거
  여부로 판정한다. 복수 공식 절차는 `usage_variant`별 관찰로 보존하되 동일 제품과 처방을
  독립 표본으로 중복 집계하지 않는다.
- 2026-08-17: 공개 레벨을 `MoistureLevel`과 `OilLevel`로 분리하고, 내부 신뢰도는
  `0~1`의 정규화된 `SensoryConfidence`로 표현한다. 최종 모델 버전은 성분 프로필,
  카테고리 사전분포, 레벨 모델, 평가 프로토콜과 데이터 빌더의 다섯 버전을 함께 보관한다.
- 2026-08-17: 외부 카탈로그 원본은 저장소나 runtime classpath에 복사하지 않고 명시적인
  오프라인 감사 입력으로만 읽는다. 보고서 schema·도구 버전, 입력 SHA-256과 결정적 집계를
  커밋해 같은 snapshot의 결과를 재현한다.
- 2026-08-17: canonical 감사 입력은 배포 산출물인 `products.json`, `ingredients.json`,
  `categories.json`으로 제한했다. 보조 감사한 `.pipeline-state.json`
  (`1f51dced7070d57a5c4dcfed11e98eccdeb53df5d1ddb89a2f6b4a1151c886a8`)에서는 legacy
  `hydration_level`과 `oiliness_level`이 199건 모두 null이었고, `conversion-report.json`
  (`913c3f2bc74d126902dddec513730944194a292e3e61039555100e6d42ff686c`)은 parser version
  13, 성공 199건, 실패·경고 0건이었다. 내부 pipeline cache 계약은 서버 감사 도구에
  결합하지 않는다.
- 2026-08-17: 제품 사용 방식, 물리적 제형과 감각 효과 채널을 각각 `ApplicationType`,
  `FormulaArchetype`, `SensoryEffectChannel` enum으로 고정했다. 농도 반응의 단위·계수와
  불확실성 표현은 근거 없이 선결정하지 않는다.
- 2026-08-17: 원천 observation, 임상 효능 분리, 복합원료, canonical 해석, 라이선스와
  중복 제거를 `sensory-source-data-contract-v1`로 정의했다. 결정적 normalized output의
  manifest에는 원문뿐 아니라 mapping·판정 규칙·vocabulary·수동 override와 evidence
  assessment의 content hash까지 포함한다.
- 2026-08-17: 공통 원천 provenance, 정확 질량 백분율·복합원료와 성분 identity 해석을
  런타임과 분리된 `offlineTools` 타입으로 구현했다. 재배포 `ALLOWED`에는 구조화된 검수
  근거가 필요하고, resolver v1은 ID 직접 참조와 정규화 exact match만 사용하며 모호한
  후보를 자동 선택하지 않는다.
- 2026-08-17: catalog의 복수 영문명은 locant 쉼표를 보존한 뒤 남은 쉼표만 경계로
  해석하고 `/`는 절대 분리하지 않는다. producer가 이미 잘라 놓은 alias는 추측 복원하지
  않고 diagnostic으로 격리한다. 22,013개 성분 snapshot에서 의심 locant 분리 30건과
  지원하지 않는 `^` separator 6건을 격리했으며, 정상 이름과 alias만 exact index에 넣었다.
- 2026-08-17: normalized batch의 모든 원천·mapping·rule·vocabulary·override·evidence byte
  입력을 논리 식별자, 크기와 content hash로 묶는 결정적 `InputManifest`를 구현했다. 절대
  경로·실행 시각·원문 byte는 보존하지 않고, versioned binary hash와 여덟 독립 버전을
  `NormalizedObservationBatchMetadata`에 기록한다. importer는 한 번 읽은 동일 byte snapshot을
  parser와 manifest에 전달한다.
- 2026-08-17: `ApplicationTypeDecision`은 공식 근거가 있는 `LEAVE_ON`·`RINSE_OFF`와
  근거 부족·상충에 따른 `UNKNOWN`의 허용 조합을 값 타입에서 강제한다. category나 제품명으로
  미확정 사용 방식을 채우지 않고, 상충 근거와 limitation을 잃지 않는다.
- 2026-08-17: 제형 확률은 아홉 `FormulaArchetype`을 모두 명시한 불변 분포로 보관하고,
  각 값은 `0~1`, 전체 합은 정확히 `1`로 검증한다. 누락된 유형을 암묵적인 0으로 바꾸지
  않는다.
- 2026-08-18: category, usage form과 formulation canonical mapping의 해석 상태와 허용
  조합을 값 타입으로 구현했다. 확정 상태만 canonical 값을 가지며 미해결 값을 category나
  제품명으로 채우지 않는다. 모호한 usage form과 formulation 후보는 결정적으로 정렬해
  보존하고 category mapping table에는 입력 vocabulary hash와 검수 provenance를 기록한다.
- 2026-08-18: Evonik, Dow, Lubrizol, Hallstar와 Clariant의 공식 formulation 진입점을 초기
  수집 후보로 확인했다. 원문 byte·hash·revision·라이선스 검수 전에는 수집 건수로 세지
  않으며, `q.s.`·`ad 100`, 복합 trade blend와 PDF 표 추출은 pilot 검수 대상으로 남겼다.

## 아직 확정하지 않은 사항

- 초기 운영 참조 데이터의 저장 형식과 배포 위치
- 원천 문서와 구조화 사실의 저장·재배포 범위
- 관능평가 기준 제품과 정확한 도포량·부위·환경
- 제형별 조성 샘플 수와 계산 비용의 균형
- 초기 순서형 모델의 구체적인 계수와 레벨 경계
- 효과 채널별 농도–반응 곡선의 계수, 임계값과 외삽 허용 범위
- 별도 제품 보습 효능 요구와 검증 프로토콜이 생겨 효능 모델 계획을 시작할 조건
- 공개 API에 신뢰도와 계산 근거를 노출할지 여부
- 실제 공개 함량을 제품-성분 관계에 저장할 최종 데이터 계약
- 수동 override가 실제로 필요한지와 승인 주체
