# 제품 감각 원천 데이터 계약

상태: `0.1-draft`
계약 버전: `sensory-source-data-contract-v1`

이 문서는 제품 유수분 감각 추론에 쓰는 외부 자료를 어떤 관측값으로 보존할지 정의한다.
원천 문서와 관측값은 오프라인 수집·검수 영역에만 있고, 서버 런타임에는 검수된 성분
프로필, 카테고리 사전분포와 모델 파라미터만 전달한다. 원천 파일을
`src/main/resources`에 복사하거나 애플리케이션 classpath에 포함하지 않는다.

피부 수분량, TEWL, 장벽 개선처럼 임상 효능을 다루는 관측값은 도포 5분 후 감각 관측값과
저장 경로부터 분리한다. 두 값의 의미는
[관능평가 프로토콜](sensory-assessment-protocol.md)을 따른다.

## 공통 표현

### 식별자와 날짜

- 모든 observation, source, 원료, 처방과 제품 revision은 표시 이름과 별개인 nonblank 안정
  식별자를 가진다.
- URL이나 파일 경로를 식별자로 쓰지 않는다. 원천이 이동해도 같은 자료를 같은 것으로
  추적할 수 있어야 한다.
- 현재 builder의 안정 식별자는 `namespace:localValue`로 만들고 URL·저장소 locator
  namespace와 명백한 경로 표현을 거부한다. DOI, 특허 family와 공급사 revision처럼 `/`가
  식별자 자체의 일부인 표준 값은 명시적인 namespace 아래에서 보존한다.
- 날짜는 달력 날짜 `YYYY-MM-DD`로 저장한다. 시각이 증거의 일부라면 UTC offset이 있는
  별도 timestamp를 함께 보존한다.
- 원천에 공개일이 있으면 입수일보다 늦을 수 없다. 공개일이 없으면 임의 날짜를 채우지
  않고 결측 이유를 남긴다.

### 수치와 단위

- 계산 가능한 수치는 십진수 문자열을 `BigDecimal`로 읽는다. `double`의 반올림 오차를
  원천 값으로 만들지 않는다.
- 처방 질량 백분율은 `MassPercent`로 표현하고 범위는 `0 <= value <= 100`이다.
- 복합원료 내부 구성비는 `ComponentFraction`으로 표현하고 범위는
  `0 <= value <= 1`이다. 두 단위를 같은 값 타입으로 쓰지 않는다.
- ppm과 ppb는 원문 값과 단위를 보존하고, 계산용 질량 백분율을 만들 때 사용한 변환식과
  builder 버전을 함께 기록한다.
- 원천에 범위나 하한·상한만 있으면 `EXACT`로 바꾸지 않는다. `EXACT`, `RANGE`,
  `MINIMUM`, `MAXIMUM`을 구분한다.

### 결측과 검수 상태

알 수 없는 값을 `0`, 빈 문자열 또는 대표값으로 바꾸지 않는다. 선택 값은 값 또는 다음
결측 이유 중 정확히 하나를 가진 tagged union으로 표현한다.

```text
MissingReason
├─ NOT_PUBLISHED
├─ NOT_APPLICABLE
├─ CONFLICTING_SOURCES
├─ UNRESOLVED_IDENTITY
├─ NOT_COLLECTED
└─ OTHER_WITH_NOTE
```

관측값의 검수 상태는 `ACCEPTED`, `QUARANTINED`, `REJECTED`로 나눈다. 파싱 성공은
`ACCEPTED`를 뜻하지 않는다. 참조가 모호하거나 필수 근거가 없는 값은 원문과 함께
`QUARANTINED`에 남기고 학습·사전분포 생성에서 제외한다.

## SourceMetadata

`SourceMetadata`는 자료 한 건의 신원과 재사용 경계를 보존한다.

```text
SourceMetadata
├─ sourceId
├─ sourceFamilyId
├─ publisher
├─ documentTitle
├─ sourceType
├─ locator
│  ├─ PublicUrl(url)
│  └─ InternalDocumentRef(reference)
├─ publishedDate: value | MissingReason
├─ acquiredDate
├─ sourceRevision: value | MissingReason
├─ contentSha256
├─ redistributionPermission
├─ licenseNote
├─ redistributionReview: value | MissingReason
│  ├─ evidenceText
│  ├─ reviewer
│  └─ reviewedDate
└─ extraction
   ├─ method
   ├─ extractorVersion
   └─ extractionManifestId
```

불변조건은 다음과 같다.

- `sourceId`, `sourceFamilyId`, 발행처, 문서명과 `licenseNote`는 nonblank다.
- public URL과 내부 문서 참조 중 정확히 하나를 가진다.
- 재배포 상태는 `ALLOWED`, `RESTRICTED`, `UNKNOWN` 중 하나다. `UNKNOWN`은 허용으로
  해석하지 않는다.
- `ALLOWED`는 근거 문구, 검수자와 검수일을 가진 `redistributionReview`가 반드시 있어야
  한다. 다른 상태에서도 검수 결과가 없다면 임의 값을 채우지 않고 결측 이유를 남긴다.
- normalized corpus에 넣을 observation은 저장 여부와 무관하게 실제로 읽은 원문 byte
  stream의 SHA-256을 필수로 기록한다. 저장이 금지된 웹 자료도 추출 중 digest는 계산한다.
  불변 snapshot이나 content digest를 얻을 수 없는 동적 원천은 다시 실행했을 때 같은
  입력임을 증명할 수 없으므로 `QUARANTINED`한다.
- `extractionManifestId`는 실행 시각이 아니라 입력 manifest와 extractor version으로 만든
  안정 식별자다. 실행 시각과 작업자 로그는 deterministic normalized output 밖의 감사
  ledger에 둔다.
- `sourceFamilyId`는 같은 특허 패밀리, 같은 원료사 자료의 번역·재게시처럼 독립 증거로
  중복 집계하면 안 되는 자료를 묶는다.

출처 신원과 증거 품질은 분리한다. 같은 문서도 성분 존재 확인에는 직접 근거지만 관능
강도에는 마케팅 주장일 수 있으므로 다음 평가는 observation마다 둔다.

```text
EvidenceAssessment
├─ purpose
├─ authorityGrade
├─ directnessGrade
├─ independenceGroup
├─ reviewer
├─ reviewedDate
└─ limitationNote
```

`EvidenceAssessment`는 부모 observation의 `sourceMetadataId`에만 적용된다. 별도 source ID를
중복 저장하지 않으며, 부모의 source 참조가 존재하지 않으면 observation을
`QUARANTINED`한다. 서로 다른 원천의 평가는 observation을 분리해 기록한다.

## FormulaObservation

`FormulaObservation`은 원료 투입량이 공개된 처방 한 revision을 보존한다.

```text
FormulaObservation
├─ formulaObservationId
├─ formulaRevisionId
├─ sourceMetadataId
├─ evidenceAssessment
├─ canonicalCategoryMapping
├─ usageVariant
├─ applicationTypeDecision
├─ usageInstructionText: value | MissingReason
├─ canonicalUsageFormMapping
├─ canonicalFormulationMapping
├─ orderedRawMaterialInputs
├─ manufacturingProcess: value | MissingReason
├─ physicalPropertyMeasurements
├─ claimedSensoryTerms
└─ validationStatus
```

- `applicationTypeDecision`은 `LEAVE_ON`, `RINSE_OFF`, `UNKNOWN` 값과 공식 정상 사용
  절차의 판정 근거, rule/version과 resolution을 함께 가진다.
- 처방 문서의 사용 절차와 사용 형태도 category와 분리해 보존한다. 사용 절차가 없으면
  `applicationTypeDecision`과 usage-form mapping을 unresolved로 두며, 이 observation은
  leave-on 범위의 category prior 표본에 넣지 않는다.
- `canonicalFormulationMapping`은 원문 제형 표현, 제형 유형, mapping rule/version과
  resolution을 함께 가지며 이 문서의 canonical mapping 절을 따른다.
- 원료 입력은 nonempty이고 원문 순서를 보존한다. 정렬한 사본이 필요하면 파생 데이터로
  별도 생성한다.
- 정확 처방 코퍼스에 들어가는 원료 투입량 합은 정확히 `100%`여야 한다. 공개 자료의
  반올림 때문에 합이 다르면 조용히 재정규화하지 않고 `QUARANTINED`로 두며 원문 합계와
  차이를 기록한다.
- 측정 물성은 값뿐 아니라 단위, 측정법, 장비, 온도 등 공개된 조건을 함께 보존한다.
- `claimedSensoryTerms`는 원문 마케팅·기술 표현이며 관능 정답 라벨이 아니다.

### 복합원료

원료 한 건은 투입량을 한 번만 가진다.

```text
RawMaterialInput
├─ rawMaterialId
├─ rawMaterialNameAsPublished
├─ formulaAmount: MassPercent
└─ composition
   ├─ KnownComposition
   │  └─ components[]
   │     ├─ ingredientResolution
   │     ├─ nameAsPublished
   │     └─ fraction: ComponentFraction
   └─ UnquantifiedComposition
      └─ components[]
         ├─ ingredientResolution
         └─ nameAsPublished
```

- `KnownComposition`의 fraction은 모두 nonnegative이고 합이 정확히 `1`이다.
- 정확한 fraction과 성분 identity 해석 성공 여부는 서로 다른 사실이다.
  `ingredientResolution`은 `Resolved`, `Unresolved`, `Ambiguous` 중 하나이며, 뒤의 성분
  식별 절과 같은 구조를 쓴다. 미해결·모호 identity는 fraction과 원문 이름을 버리지 않고
  observation을 `QUARANTINED`한다.
- 구성 성분 질량은 `raw material formula amount * component fraction`으로 계산한다.
- `UnquantifiedComposition`은 각 INCI에 원료 전체 투입량을 복제하지 않는다. 정확 함량
  학습에는 쓰지 않고 존재·순서·가능 범위 근거로만 쓴다.
- 일부 구성비만 알려진 자료는 현재 두 variant 어디에도 억지로 맞추지 않고
  `QUARANTINED`한다. 잔여 fraction 계약을 추가할 때 계약 버전을 올린다.
- canonicalization 결과 같은 성분이 여러 구성에서 나오면 계산용 질량은 합치되 각 원천
  원료와 원문 이름의 lineage는 보존한다.

## MarketProductObservation

`MarketProductObservation`은 시판 제품의 공식 전성분 한 revision과 한 공식 사용 절차를
보존한다.

```text
MarketProductObservation
├─ observationId
├─ sourceProductId
├─ formulationRevisionId
├─ usageVariant
├─ sourceMetadataId
├─ evidenceAssessment
├─ productNameAsPublished
├─ canonicalCategoryMapping
├─ applicationTypeDecision
├─ canonicalUsageFormMapping
├─ canonicalFormulationMapping
├─ officialUsageText: value | MissingReason
├─ orderedIngredients
├─ disclosedAmounts
└─ validationStatus
```

표본 키는 `sourceProductId + formulationRevisionId + usageVariant`다. 복수 공식 사용법은
각각 observation으로 보존하지만 공통 제품·처방 식별자로 연결한다. 제품 수, 독립 출처 수,
처방 분포와 holdout에서는 같은 `formulationRevisionId`를 독립 처방으로 중복 집계하지
않는다.

각 ordered ingredient는 원문 position, 원문 이름과 다음 해석 결과 중 하나를 가진다.

```text
IngredientResolution
├─ Resolved(canonicalIngredientId, matchRule, resolverVersion)
├─ Unresolved(reason, resolverVersion)
└─ Ambiguous(candidateIngredientIds, reason, resolverVersion)
```

- 원문 순서와 중복을 그대로 보존한다. 중복을 수집 단계에서 자동 제거하지 않는다.
- `Unresolved`와 `Ambiguous`를 목록에서 누락하지 않는다. 계산 코퍼스 포함 여부는 별도
  validation 결과로 결정한다.
- 원문 전성분, 공식 URL과 revision 근거가 없으면 구조적으로 배열 순서를 보존했더라도
  “공식 순서 검증 완료”로 표시하지 않는다.
- 공식 제형 표현은 원문을 보존하고 별도 `CanonicalFormulationMapping`으로 해석한다.
  제형 표현이 없거나 해석이 모호하면 category나 제품명으로 확정하지 않는다.
- 공개 함량은 대상 ingredient position, 원문 수치·단위·한정자와 변환된 `MassPercent`,
  변환 버전을 함께 가진다. 이 observation 계약은 런타임 `products.json`의 최종 저장
  모양을 선결정하지 않는다.

`applicationTypeDecision`은 다음 구조를 사용한다.

```text
ApplicationTypeDecision
├─ value: LEAVE_ON | RINSE_OFF | UNKNOWN
├─ evidenceLocation: value | MissingReason
├─ decisionRuleId
├─ decisionRuleVersion
├─ resolution: EXACT | REVIEWED | UNRESOLVED | CONFLICTING
└─ limitationNote
```

- 시판 제품의 `LEAVE_ON` 또는 `RINSE_OFF`는 공식 사용법 원문과 그 안의 근거 위치가
  있어야 한다. 공개 샘플 처방은 원료사·논문 등 source 문서가 선언한 정상 사용 절차와
  근거 위치가 있어야 하며, 시판 제품의 공식 사용법으로 승격하지 않는다.
- 공식 근거가 없으면 `UNKNOWN + UNRESOLVED`, 출처가 상충하면
  `UNKNOWN + CONFLICTING`으로 두고 `QUARANTINED`한다.
- `UNKNOWN`을 category, 제품명이나 전성분으로 채우지 않는다.
- `FormulaObservation`도 같은 decision 구조를 사용한다. 샘플 처방 문서에 정상 사용
  절차가 없다면 공식 제품처럼 가정하지 않는다.

사용 형태는 application type 및 category와 다른 축이다.

```text
CanonicalUsageFormMapping
├─ observedExpression: value | MissingReason
├─ canonicalUsageFormId: value | MissingReason
├─ mappingRuleId
├─ mappingVersion
├─ resolution: EXACT | REVIEWED | UNRESOLVED | AMBIGUOUS
└─ candidateUsageFormIds
```

usage-form vocabulary와 초기 포함 집합은 mapping version별 데이터로 관리한다. 시트,
워시오프 팩, 슬리핑 팩, 패드, 패치와 스틱처럼 프로토콜 범위를 바꾸는 형태를 적어도 서로
다른 ID로 유지한다. 예를 들어 슬리핑 팩을 `LEAVE_ON`이라는 이유로 일반 leave-on
스킨케어 형태에 합치지 않는다. 공식 원문이 없으면 category에서 usage form을 추측하지
않고 `UNRESOLVED`로 둔다.

## EfficacyEvidenceObservation

`EfficacyEvidenceObservation`은 임상·기기 측정 효능 근거이며 감각 profile source set과
물리적으로 다른 오프라인 저장 경로에 둔다.

```text
EfficacyEvidenceObservation
├─ observationId
├─ subject
│  ├─ CanonicalIngredient
│  └─ RawMaterial
├─ concentrationAndVehicle
├─ molecularWeight: value | MissingReason
├─ grade: value | MissingReason
├─ pH: value | MissingReason
├─ neutralization: value | MissingReason
├─ endpoint
├─ measurementMethod
├─ applicationAmountAndArea
├─ frequencyAndDuration
├─ comparator
├─ samplePopulation
├─ result
├─ uncertainty
├─ applicabilityLimits
├─ sourceMetadataId
└─ evidenceAssessment
```

- subject는 canonical ingredient와 raw material 중 정확히 하나다.
- 농도만 있고 vehicle이 없으면 대표 vehicle을 추측하지 않는다.
- 결과는 수치, 단위, 변화 방향, 비교 기준과 불확실성을 함께 보존한다.
- 분자량, 원료 등급, pH와 중화 상태가 없으면 기본값 대신 결측 이유를 쓴다.
- `ProductSensoryEstimator`, `IngredientSensoryProfileRepository`와 감각 reference-data
  builder는 이 타입이나 저장 경로를 의존할 수 없다.

## Canonical mapping

### 카테고리와 제형

관측한 카테고리 문자열과 탐색 카테고리 ID를 물리적 제형으로 곧바로 바꾸지 않는다.

```text
CanonicalCategoryMapping
├─ observedValue
├─ canonicalCategoryId: value | MissingReason
├─ mappingRuleId
├─ mappingVersion
└─ resolution: EXACT | REVIEWED | UNRESOLVED | AMBIGUOUS
```

category, usage form과 formulation의 원문 표현은 각각의 canonical mapping 안에 한 번만
저장한다. observation 최상위에 같은 문자열을 중복하지 않으며, mapping이 원문·해석 결과·
rule/version의 단일 진실 원천이다.

제형 canonical 값은 다음 아홉 개다.

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

제형 관측과 해석 provenance는 다음 구조로 보존한다. `FormulaObservation`과
`MarketProductObservation`이 같은 구조를 사용한다.

```text
CanonicalFormulationMapping
├─ observedExpression: value | MissingReason
├─ formulaArchetype
├─ mappingRuleId
├─ mappingVersion
├─ resolution: EXACT | REVIEWED | UNRESOLVED | AMBIGUOUS
└─ candidateArchetypes
```

`UNRESOLVED`와 `AMBIGUOUS`에서는 `formulaArchetype`을 `UNKNOWN`으로 두고, 후자는 가능한
후보들을 잃지 않는다. 두 observation은 이 mapping의 결과를 원문 표현과 rule/version 없이
별도 필드로 중복 저장하지 않는다.

공식 제형 표현은 강한 관측 근거지만 category mapping과 동일하지 않다. 공식 표현이 없으면
제품명만으로 확정하지 않고 `UNKNOWN` 또는 여러 제형 확률의 입력으로 남긴다. mapping
table은 입력 category vocabulary hash, mapping version, 검수자와 검수일을 가진다.

### 성분 식별

현재 성분 카탈로그의 ID, 한글명, 영문명과 별칭을 재사용하되 소비자 검색용 fuzzy match를
수집 canonicalization에 사용하지 않는다.

1. Unicode와 공백·대소문자만 계약된 방식으로 정규화한다.
2. canonical ID의 직접 참조를 먼저 확인한다.
3. 한글명, 영문명과 alias의 정규화된 exact match를 찾는다.
4. 후보가 하나면 `Resolved`, 없으면 `Unresolved`, 둘 이상이면 `Ambiguous`를 반환한다.
5. `Ambiguous`에서 가장 작은 ID를 자동 선택하지 않는다.

resolver 결과에는 match rule과 resolver version을 기록한다. 수동 해석은 원문, 후보,
선택 ID, 이유, 검수자와 검수일을 override ledger에 남긴다.

## 라이선스와 원천 보관 절차

1. 수집 전에 `SourceMetadata`와 예상 재배포 상태를 등록한다.
2. 원문 byte와 접근 토큰은 저장소 및 서버 런타임 밖의 접근 통제된 원천 저장소에 둔다.
3. `ALLOWED` 근거가 검수되기 전에는 원문, 표, 이미지나 장문 발췌를 커밋·배포하지 않는다.
4. `RESTRICTED`와 `UNKNOWN` 자료는 내부 변환·검증에만 쓰고, 외부로 나갈 파생 데이터가
   원문을 실질적으로 재구성하지 못하는지 검수한다.
5. 저장소에는 재배포가 허용된 reference data와 원문을 복원할 수 없는 집계·해시만 둔다.
6. 라이선스 상태나 사용 목적이 바뀌면 영향받는 파생 데이터 ID와 모델 버전을 찾아
   재검수한다.

법률 판단을 자동화하지 않는다. `ALLOWED` 전환에는 근거 문구, 검수자와 검수일이 필요하다.

## 중복 제거와 독립 출처 계산

- byte hash가 같은 문서는 같은 source revision이다.
- 번역, 재게시, 같은 원료사 문서의 지역별 사본과 특허 family는 같은 `sourceFamilyId`로
  묶는다.
- exact formula signature는 canonical raw material identity와 질량, composition 내용만으로
  만든다. source, observation, product와 formula revision ID는 signature에 넣지 않고
  lineage로 보존한다. 원문 순서는 lineage에 보존하되 signature의 정렬 규칙은 builder
  version으로 고정한다.
- 같은 exact signature는 여러 URL에 있어도 처방 표본 수에는 한 번만 세고 출처 lineage는
  모두 보존한다.
- 질량 반올림, 이름 치환 또는 소수 원료만 다른 near-duplicate는 자동 병합하지 않는다.
  차이 목록, 같은 family 여부와 제조 공정 근거를 검수 큐에 보내 사람이 결정한다.
- 독립 출처 수와 출처별 최대 가중치는 `sourceId`가 아니라 `sourceFamilyId`와
  `independenceGroup`으로 계산한다.
- 같은 시판 처방의 usage variant와 제품 ID만 다른 동일 처방도 독립 처방 표본으로 세지
  않는다.

## 버전과 산출물 경계

모든 normalized observation batch는 다음 값을 함께 가진다.

```text
sourceDataContractVersion
ingredientResolverVersion
categoryMappingVersion
applicationTypeDecisionRuleVersion
usageFormMappingVersion
formulationMappingVersion
formulaDeduplicationVersion
dataBuilderVersion
inputManifestSha256
```

input manifest는 normalized observation을 만드는 데 실제로 읽은 모든 byte 입력의
파일명 또는 안정 ID, 크기와 SHA-256을 포함한다. 여기에는 source content뿐 아니라 category,
usage form과 formulation mapping table, application-type 판정 규칙, ingredient vocabulary와
수동 override ledger, `EvidenceAssessment` 입력도 들어간다. 어느 하나라도 바뀌면 manifest
hash 또는 해당 버전이 반드시 바뀐다. 같은 입력 manifest와 같은 버전 묶음은
byte-identical normalized output을 만들어야 한다.
현재 시각, 절대 경로와 실행 순서는 파생 데이터에 넣지 않는다. 품질 결함은 조용히
삭제하지 않고 accepted/quarantined/rejected 개수와 이유별 목록으로 보고한다.

런타임은 normalized observation을 직접 읽지 않는다. 이후 빌더가 생성할
`IngredientSensoryProfiles`, `CategoryFormulationPriors`와 모델 파라미터만 별도 버전으로
검증해 배포한다.

현재 이 계약에서 코드화한 공통 provenance, 정확 수치, 복합원료와 성분 해석 타입은
`offlineTools` source set에만 있다. 성분 resolver v1은 canonical ID 직접 참조를 먼저
확인하고, 그다음 Unicode NFC·공백·대소문자만 정규화한 한글명·영문명·별칭 exact match를
사용한다. 후보가 여러 개면 최소 ID를 고르지 않고 결정적으로 정렬한 `Ambiguous`를
반환한다.

현재 catalog의 `english_name`은 복수 공식 표기를 쉼표로 연결할 수 있다. resolver v1은
숫자 locant(`1,2-`)와 ASCII letter/prime locant(`N,N-`, `C,C'-`)의 쉼표를 이름 내부에
보존하고, 그 밖의 catalog 쉼표만 복수 표기 경계로 해석한다. `/`는 길이나 위치와 무관하게
항상 공식 성분명 내부 문자로 보존하며 분리 기준으로 사용하지 않는다.

`aliases` 배열은 upstream producer가 locant 쉼표나 지원하지 않는 `^`에서 이미 잘라 놓은
파편을 포함할 수 있다. 원형을 확정할 수 없으므로 resolver는 이를 추측해 재결합하거나
정상 alias로 인덱싱하지 않는다. 확인된 파편은 원문 그대로 immutable diagnostic에 남기고
quarantine한다. readiness report에 기록한 22,013개 성분 snapshot에서는 이 규칙으로
diagnostic 36건(의심 locant 분리 30건, 지원하지 않는 separator 6건)을 보존했으며, 정상
한글명·영문명·별칭 해석과 별개로 후속 원천 정제 대상으로 다룬다.

## 아직 코드화하지 않는 부분

다음은 근거 데이터와 보정 프로토콜이 확정되기 전까지 Java 값 타입으로 고정하지 않는다.

- 농도 반응 함수의 구체적인 계수, 단위와 근거 구간 밖 처리
- 상 조성과 드라이다운 불확실성의 범위·시나리오 표현
- formulation modifier의 범위, 부호와 포화 전후 의미
- runtime `products.json`의 공개 함량 최종 저장 모양
- 원천 저장소 제품과 실제 접근 제어 기술

이 값들이 확정되면 계약 버전을 올리고 fixture, schema validation과 builder 테스트를 함께
추가한다.
