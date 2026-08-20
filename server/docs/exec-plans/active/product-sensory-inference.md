# 제품 유수분 감각 추론 고도화 계획

## 상태

- 상태: **활성 장기 계획**
- 시작일: 2026-08-17
- 추적 이슈: [#68 유수분 감각 추론 고도화](https://github.com/woowacourse-teams/2026-poudy/issues/68)
- 소유 도메인: `product`
- 현재 기준선: [감각 추론 v0 기준과 한계](../../product/sensory-inference-v0.md)

이 문서는 v0 이후의 기술 맥락과 진행 상태를 소유한다. 이슈는 상위 작업 상태를 추적하고,
현재 동작은 코드와 v0 문서가 소유한다. 완료된 조사 결과와 미구현 설계를 현재 사실처럼
섞지 않는다.

## 목표

category와 순서가 보존된 공식 전성분을 기본 입력으로 삼되, 가능한 경우 정확 함량과 제형
근거를 결합해 다음 값을 설명 가능하고 재현 가능하게 계산한다.

- 도포 5분 후 수분감과 유분감 `0~3`
- 농도, 상 조성, dry-down과 제형 modifier의 중간 결과
- 결과의 불확실성과 confidence
- 사용한 원천·프로필·prior·모델 버전과 주요 기여 근거

API의 정수 계약은 유지한다. 임상 보습 효능, TEWL, 장벽 개선과 마케팅 표현은 5분 사용감
라벨이나 런타임 입력으로 사용하지 않는다.

## 현재 상태

### 구현된 기준선

- `ProductFactory`가 category와 순서가 보존된 전성분으로 v0 `ProductSensory`를 한 번 계산한다.
- 수분감과 유분감은 독립 축이며 confidence와 세 모델 버전을 함께 보관한다.
- 목록·상세·filter·count는 같은 계산 결과를 사용한다.
- 원천 `products.json`에는 완성된 유수분 레벨을 저장하지 않는다.
- 현재 계산과 한계는 v0 문서와 도메인 테스트가 소유한다.

### 보존한 조사·설계 결과

- 2026-08-17 외부 snapshot 199제품의 감사와 v0 분포는
  [카탈로그 감각 준비도 결과](../../product/catalog-sensory-readiness-report.md)에 남긴다.
- 원천 후보와 저장소 밖 pilot PDF의 hash·검수 상태는
  [감각 원천 수집 기록](../../product/sensory-source-acquisition-register.md)에 남긴다.
- 아직 구현되지 않은 오프라인 observation의 최소 불변식은
  [감각 원천 데이터 계약](../../product/sensory-source-data-contract.md)에 남긴다.

위 결과는 현재 runtime 입력이나 정확도 증거가 아니다. 입력 hash가 다른 카탈로그에 과거
집계를 그대로 적용하지 않고, 외부 원문 파일이 실제 source store에 남아 있는지도 수집 재개
전에 다시 확인한다.

## 범위와 핵심 결정

초기 범위는 공식 사용법으로 `LEAVE_ON`을 확인한 스킨/토너, 에센스/세럼/앰플, 로션,
크림, 밤과 선크림이다. 세정 제품, 시트·워시오프·슬리핑 팩, 색조, 헤어·두피와 피부 타입별
개인화는 별도 데이터와 프로토콜 전까지 제외한다.

1. category는 최종 점수의 고정 가산점이 아니라 제형과 가능한 함량의 prior다.
2. 전성분 순서는 정확 함량이 아니라 1% 초과 구간의 상대 순서 제약이다.
3. 정확 함량이 없으면 하나의 값으로 단정하지 않고 가능한 조성과 불확실성을 보존한다.
4. 상 조성은 수상·유상·분산 고형물·미분류의 배타적 질량이며 합계가 100%여야 한다.
5. 휘발성과 5분 잔존량은 상 조성과 직교하는 dry-down으로 계산한다.
6. 저농도 성분은 일괄 무시하거나 일괄 가산하지 않고 감각·레올로지·필름 채널별 농도 반응을 쓴다.
7. 미공개 분자량, 원료 등급, pH와 중화 상태는 추측하지 않고 시나리오와 confidence 하락으로 표현한다.
8. confidence는 입력 완전성과 추론 근거의 강도를 나타내며 정확도 확률로 표현하지 않는다.
9. 수집·정규화는 오프라인에서 수행하고 runtime은 검증된 버전 산출물만 읽는다.
10. 같은 처방 revision과 모델 버전은 제품 ID와 무관하게 같은 결과를 만들어야 한다.

## 목표 데이터 흐름

```text
공식 원천·정확 처방·시판 전성분
  → 출처·라이선스·revision 기록
  → FormulaObservation / MarketProductObservation
  → 성분 해석·제형 mapping·중복 제거·품질 격리
  → IngredientSensoryProfiles / CategoryFormulationPriors
  → 농도 → 상 조성 → dry-down → 감각 feature
  → 독립 수분·유분 ordinal model + confidence
  → ProductSensory → 기존 API
```

## 단계별 작업

### 0. v0 기준선 — 완료

- [x] 수분감·유분감의 5분 after-feel 정의와 독립 축을 확정한다.
- [x] category·전성분 순서 기반 결정적 estimator를 runtime에 연결한다.
- [x] 레벨, confidence와 모델 버전 도메인 타입을 구현한다.
- [x] 외부 199제품 snapshot에서 전체 계산과 분포를 확인한다.
- [x] 알려진 한계와 입력 경계를 문서화한다.

### 1. 원천과 정규화 기반 — 진행 중

- [x] 카탈로그 준비도와 기존 역할 태그 커버리지를 감사한다.
- [x] 원천 observation, provenance, 결측, 격리와 버전의 초안 계약을 정한다.
- [x] 공식 원천 후보와 첫 pilot 파일의 hash·검수 상태를 기록한다.
- [ ] 외부 source store의 pilot byte 존재와 hash를 재확인한다.
- [ ] 최소 importer가 같은 byte를 parser와 input manifest에 한 번만 전달하게 한다.
- [ ] `FormulaObservation`과 `MarketProductObservation` schema validation을 구현한다.
- [ ] 성분 exact resolver와 category·usage form·application type·formulation mapping을 구현한다.
- [ ] accepted/quarantined/rejected 결과와 이유를 결정적으로 보고한다.

이 단계의 첫 완료 단위는 카테고리 전체 수집이 아니라, 공식 처방 하나를 원문 byte부터
normalized observation까지 재현하고 결함을 격리하는 end-to-end vertical slice다.

### 2. 코퍼스와 감각 프로필

- [ ] 초기 category마다 독립 source family 세 개 이상을 목표로 정확 처방을 수집한다.
- [ ] 특정 원료사 표본 비중과 동일·유사 처방 중복을 통제한다.
- [ ] 시판 공식 전성분, 공개 함량, 공식 사용법과 제형 표현을 revision별로 수집한다.
- [ ] phase allocation, 휘발성, 잔류 유분감, slip, tack, wax, absorbency와 rheology를
      출처·적용 조건·검수 상태가 있는 성분 프로필로 만든다.
- [ ] 일반 성분군 fallback과 미해결 성분 검수 큐를 만든다.
- [ ] 정확 처방에서 category별 제형과 함량 prior를 생성하고 표본 수·독립 출처 수를 함께 남긴다.

### 3. 물리·감각 추론 파이프라인

- [ ] `FormulaArchetypeClassifier`와 1% 경계 후보 확률을 구현한다.
- [ ] 성분별 가능한 함량과 합계 100%의 결정적 조성을 생성한다.
- [ ] 질량 보존형 `PhaseCompositionEstimator`를 구현한다.
- [ ] 휘발량과 5분 잔존량을 계산하는 `DryDownEstimator`를 구현한다.
- [ ] 선형·포화·임계·근거 구간 한정 농도 반응을 감각 채널별로 적용한다.
- [ ] 상 조성, dry-down, rheology와 film modifier를 하나의 feature pipeline으로 결합한다.
- [ ] 독립 수분·유분 ordinal model, fallback과 상위 기여 근거를 구현한다.
- [ ] 단순 category baseline 및 현재 v0와 동일 snapshot diff를 비교한다.

### 4. runtime과 운영 반영

- [ ] 버전된 성분 프로필·category prior·모델 snapshot repository를 추가한다.
- [ ] 모델 변경 diff에 2단계 이상 변화, 낮은 confidence와 신규 fallback을 표시한다.
- [ ] 운영 전체 제품을 계산하고 검수 큐와 데이터 품질 gate를 연결한다.
- [ ] runtime artifact에 외부 원문·Excel·normalized observation이 포함되지 않는지 검증한다.
- [ ] API 계약과 목록·상세·filter·count의 동일 결과를 회귀 검증한다.

## 검증과 완료 조건

각 단계는 좁은 단위 테스트 뒤 `sh ./scripts/verify.sh`를 통과한다. 오프라인 빌더가 생기면
동일 input manifest와 버전 묶음에서 byte-identical 산출물을 만들고, 변경 시 diff 원인을
설명해야 한다.

장기 계획은 다음을 모두 만족할 때만 완료한다.

- 공식 사용법과 원천 provenance가 있는 초기 범위 코퍼스를 확보했다.
- 농도·상 조성·dry-down 중간 결과가 질량 보존과 결정성을 만족한다.
- 동일 snapshot에서 현재 v0/category baseline과의 변경 근거를 설명할 수 있다.
- 모델·프로필·prior·입력 manifest 버전을 결과에서 추적할 수 있다.
- 운영 변경 diff와 검수 큐가 배포 절차에 연결됐다.

## 진행 기록

- 2026-08-17: 장기 계획, 카탈로그 감사, 원천 계약과 pilot 수집 기록을 시작했다.
- 2026-08-18: v0 runtime estimator와 외부 199제품 분포 확인을 완료했다.
- 2026-08-18: 장기 계획을 이슈 #68의 짧은 체크리스트로만 대체했던 결정을 되돌리고,
  현재 사실·진행 계획·보존 결과를 분리한 축약 계획으로 복원했다.
- 2026-08-18: 사용자 직접 도포·감각 평가 단계와 프로토콜을 범위에서 제거했다.
