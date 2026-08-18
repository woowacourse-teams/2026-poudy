# 제품 감각 원천 데이터 계약

## 문서 지위

상세 고도화에 필요한 **오프라인 데이터 계약 초안**이다. 현재 runtime 코드나 JSON 계약이
아니며, 실제 importer와 consumer를 구현하는 vertical slice에서 필요한 타입부터 코드화한다.
미래 구조를 선제 구현하지 않되 아래 provenance·질량 보존·격리 불변식은 유지한다.

## 공통 원칙

- ID, 날짜, 수치와 단위는 원문 표현과 canonical 표현을 구분한다.
- 모르는 값을 빈 문자열·0·대표값으로 채우지 않고 값 또는 `MissingReason`으로 표현한다.
- 검수 상태는 `ACCEPTED`, `QUARANTINED`, `REJECTED`로 구분하고 이유를 보존한다.
- 원문 byte는 저장소와 runtime 밖에 두고 source metadata와 content hash로 연결한다.
- 동일 input manifest와 버전 묶음은 byte-identical normalized output을 만들어야 한다.

## SourceMetadata

원천마다 최소한 다음을 보존한다.

```text
sourceId, sourceFamilyId, publisher, title, canonicalUrl
revisionId, accessedAt, contentSha256, byteSize
licenseStatus, allowedUse, reviewer, reviewedAt
```

`licenseStatus`가 `ALLOWED`로 검수되기 전에는 원문이나 복원 가능한 파생 데이터를
커밋·배포하지 않는다. 같은 문서의 지역별 사본, 번역과 특허 family는 독립 출처로 중복
계산하지 않는다.

## FormulaObservation

정확 처방 한 revision과 사용 절차를 표현한다.

```text
FormulaObservation
├─ observationId / sourceMetadataId / formulaRevisionId
├─ canonicalCategoryMapping
├─ applicationTypeDecision
├─ canonicalUsageFormMapping
├─ canonicalFormulationMapping
├─ orderedRawMaterialInputs
├─ physicalPropertyMeasurements
└─ validationStatus
```

- 원료 순서를 보존한다.
- 정확 처방의 수치 투입량 합은 100%여야 한다. 다르면 재정규화하지 않고 격리한다.
- `q.s.`, `ad 100`, 범위와 부등호를 임의 단일값으로 바꾸지 않는다.
- 물성은 값·단위·측정법·장비·온도·경과 시간 등 공개된 조건을 함께 보존한다.
- 공식 사용 절차가 없으면 application type을 category나 제품명으로 추정하지 않는다.

### 복합원료

원료 투입량은 raw material에 한 번만 둔다. 구성비를 알면 component fraction 합이 1이어야
하며 성분 질량은 `raw material amount × fraction`으로 계산한다. 구성비를 모르면 각 INCI에
원료 전체 투입량을 복제하지 않고 `UnquantifiedComposition`으로 보존해 정확 함량 학습에서
제외한다.

## MarketProductObservation

시판 제품의 공식 전성분 한 revision과 하나의 공식 사용 절차를 표현한다.

```text
MarketProductObservation
├─ sourceProductId / formulationRevisionId / usageVariant
├─ sourceMetadataId / productNameAsPublished
├─ category / application type / usage form / formulation mappings
├─ officialUsageText
├─ orderedIngredients
├─ disclosedAmounts
└─ validationStatus
```

- 원문 position, 이름과 중복을 그대로 보존한다.
- 성분 해석은 `Resolved`, `Unresolved`, `Ambiguous` 중 하나이며 미해결 항목을 삭제하지 않는다.
- 공개 함량은 대상 position, 원문 수치·단위·한정자와 변환 버전을 보존한다.
- 복수 usage variant는 별도 observation으로 두되 같은 formulation revision을 독립 처방으로
  중복 계산하지 않는다.

## Canonical mapping

category, usage form, application type과 formulation은 서로 다른 축이다. 각 mapping은 원문,
canonical 값 또는 결측, rule/version과 `EXACT`, `REVIEWED`, `UNRESOLVED`, `AMBIGUOUS` 상태를
보존한다.

초기 formulation vocabulary는 다음을 후보로 한다.

```text
AQUEOUS_SOLUTION, HYDROGEL, O_W_EMULSION, W_O_EMULSION
ALCOHOL_RICH_SOLUTION, ANHYDROUS_OIL, BALM_OR_WAX
POWDER_RICH_SUSPENSION, UNKNOWN
```

공식 제형 표현이 없으면 제품명이나 탐색 category로 확정하지 않는다.

### 성분 식별

1. canonical ID 직접 참조를 먼저 확인한다.
2. Unicode NFC, 공백과 대소문자만 계약된 방식으로 정규화한다.
3. 한글명·영문명·별칭의 exact match를 찾는다.
4. 후보가 하나면 `Resolved`, 없으면 `Unresolved`, 둘 이상이면 `Ambiguous`다.
5. 모호할 때 최소 ID를 자동 선택하지 않는다.

소비자 검색용 부분 일치와 초성 검색은 수집 canonicalization에 사용하지 않는다. slash와
숫자·문자 locant의 쉼표는 공식 이름의 일부일 수 있으므로 근거 없이 분리하지 않는다.

## EfficacyEvidenceObservation

임상 수분 증가, TEWL과 장벽 근거는 감각 원천과 분리한다. 농도와 vehicle, 분자량, 등급,
pH, 중화 상태, endpoint, 측정법, 적용량·기간, 비교군, 결과와 불확실성을 보존한다.
`ProductSensoryEstimator`와 감각 reference-data builder는 이 저장 경로를 입력으로 사용하지
않는다.

## 중복 제거와 버전

- byte hash가 같은 문서는 같은 revision이다.
- exact formula signature는 canonical raw material identity, 질량과 알려진 composition으로
  만들고 source·observation·product ID는 넣지 않는다.
- near-duplicate는 자동 병합하지 않고 차이를 검수 큐에 보낸다.
- normalized batch는 source contract, resolver, category/application/usage/formulation mapping,
  deduplication, builder 버전과 input manifest hash를 함께 가진다.
- manifest에는 실제로 읽은 모든 byte 입력과 mapping table·override ledger의 안정 ID, 크기와
  SHA-256을 포함하고 절대 경로·실행 시각·원문 byte는 넣지 않는다.

runtime은 normalized observation을 직접 읽지 않는다. 이후 생성할 버전된 성분 프로필,
category prior와 모델 parameter만 검증해 배포한다.

## 구현을 미루는 값

농도 반응 계수, 불확실성 시나리오 표현, formulation modifier의 범위, 공개 함량의 최종
runtime JSON 모양과 source store 접근 제어 기술은 실제 입력·consumer와 검증 fixture가
준비될 때 결정한다.
