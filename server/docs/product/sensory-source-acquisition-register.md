# 감각 원천 수집 후보 register

- 상태: discovery only
- 마지막 공식 페이지 확인일: 2026-08-18
- 적용 계약: [감각 원천 데이터 계약](sensory-source-data-contract.md)
- 원문 저장 위치: 저장소와 서버 runtime 밖의 접근 통제된 저장소

이 문서는 정확 처방과 공식 사용법을 찾을 수 있는 원천군을 기록한다. 여기에 URL이 있다는
사실은 원문 수집, 라이선스 승인, 구조화 완료 또는 학습 코퍼스 포함을 뜻하지 않는다.
실제 원문 byte를 한 번 읽어 content SHA-256을 계산하고 `SourceMetadata`, observation과
validation 결과를 만든 뒤에만 수집 건수로 센다.

## 공통 판정

- 아래 원천의 재배포 상태는 모두 `UNKNOWN`이다. 공개 접근 가능성을 재배포 허용으로
  해석하지 않는다.
- 원료사의 제품 효능·감각 설명은 정답 라벨이 아니다. 정확한 배합, 물리 측정, 공식 사용
  절차와 분리해 보존한다.
- 검색 결과나 index의 요약문을 원문 snapshot으로 사용하지 않는다. 최종 HTML 또는 PDF
  byte와 문서 내부 revision을 확보한다.
- 같은 회사의 번역·재게시·concept brochure 안 여러 처방은 독립 출처 수를 부풀리지 않게
  같은 `sourceFamilyId` 규칙으로 검토한다.
- `q.s.`, `ad 100`, 원료사 trade blend와 PDF 표 추출 오류는 조용히 정확 수치로 바꾸지
  않는다.

## 공식 원천군

| source family 후보 | 공식 진입점과 확인된 내용 | 초기 범위 후보 | 수집 전 차단 조건 |
| --- | --- | --- | --- |
| `source-family:evonik-formulations` | [Evonik Formulations](https://personal-care.evonik.com/en/formulations)은 sample formulation 검색을 제공한다. 개별 페이지에는 phase, 원료, `%W/W`, 공정과 물성이 있고 일부에는 사용법이 있다. | 토너, 로션, 크림 | HTML/PDF 최종 byte 확보, revision 변화 감지, `q.s.`·`ad 100`과 trade blend 구성 검수, 재배포 검수 |
| `source-family:dow-personal-care-formulations` | [Dow Facial Cream 01419](https://www.dow.com/documents/27/27-1/27-1768-01-facial-creamwater-in-oil-emulsion.pdf?iframe=true)은 W/O 유형, phase별 `Wt%`, 공정과 안정성 정보를 가진 공식 PDF다. | 크림 | 공식 PDF 표 자체의 `Distilled Water` 행과 INCI가 불일치한다. 발행처 수정본이나 별도 공식 근거 없이 자동 교정하지 않으며 공식 사용 절차와 재배포 상태도 별도 검수한다. |
| `source-family:lubrizol-beauty-formulations` | [Lubrizol Skin Barrier Booster Face Lotion](https://www.lubrizol.com/solutions/products/beauty/formulations/detail-pages/facial-care-formulations/f0167ap-skin-barrier-booster-face-lotion)처럼 formulation detail page가 있고 별도 formulation 문서를 제공할 수 있다. | 로션, 크림, 젤 | 동적 페이지가 제목만 노출할 수 있고 과거 PDF URL은 이동·삭제될 수 있다. 안정적인 최종 문서와 revision을 확보하기 전에는 수집하지 않는다. |
| `source-family:hallstar-skin-care-formulations` | [Hallstar Skin Care Formulations](https://www.hallstarbeauty.com/products/skin-care/skin-care-formulations/) index는 toner, serum, cream, balm, sunscreen 등 다수 formulation number와 형태·감각 설명을 제공한다. | 토너, 세럼, 크림, 밤, 선스크린 | index 설명만으로 정확 처방을 만들지 않는다. 개별 원문 표와 공식 사용법을 확보하고 cleanser·팩·색조·body 범위를 분리하며 감각 marketing 문구를 라벨에서 제외한다. |
| `source-family:clariant-concept-formulations` | [Clariant Radiance Me](https://www.clariant.com/en/Business-Units/Care-Chemicals/Personal-Care/Beauty-and-Personal-Care-Trends/RadianceMe)는 하나의 공식 brochure에 여러 formulation을 묶어 제공한다. | 미스트, 선스크린 후보 | brochure 하나의 여러 처방을 독립 출처로 세지 않는다. sheet mask와 highlighter 등 초기 제외 범위를 걸러내고 최종 PDF byte·formula revision·재배포 상태를 검수한다. |

## 첫 pilot 검수 큐

| 공식 식별자 | 확인된 사실 | 현재 판정 |
| --- | --- | --- |
| Evonik `GM 4/7/2` | [Moisturizing milky toner](https://personal-care.evonik.com/pim/fragment/personal-care/en/formulation/FORM_3694726)는 phase와 `%W/W`, 공정, cotton pad 사용 및 leave-on 문구를 제공한다. | 공식 사용법을 가진 토너 후보. `Water ad 100`과 복합 trade blend를 구조화한 뒤 검증한다. |
| Evonik `MKM 6142-022` | [Instant Wrinkle Reducer](https://personal-care.evonik.com/pim/fragment/personal-care/en/formulation/FORM_2321731)는 합계 100인 phase별 `%W/W`, 공정과 물성을 제공한다. | 크림 처방 후보. 정상 사용 절차가 페이지에 없어 `applicationTypeDecision`은 추측하지 않는다. |
| Evonik `H 23/16-1` | [Natural O/W Cream](https://personal-care.evonik.com/pim/fragment/personal-care/en/formulation/FORM_504642)은 O/W 처방과 phase별 함량을 제공하지만 perfume가 `q.s.`다. | 제형 관측 후보. 정확 처방 코퍼스에는 `q.s.`를 해결하기 전 포함하지 않는다. |
| Dow `01419` | 위 공식 PDF는 `W-in-O Emulsion`과 phase별 함량을 명시한다. | W/O 크림 후보. PDF 표를 렌더링 대조하고 공식 사용 절차 부재를 별도 결측으로 남긴다. |

## 확보한 pilot byte snapshot

아래 파일은 2026-08-18에 저장소 밖 source store로 받은 최종 PDF byte다. hash와 크기만
저장소에 기록하며 원문은 커밋하거나 runtime에 복사하지 않는다. 재배포 상태가
`UNKNOWN`이므로 아직 reference-data 산출물에도 넣지 않는다.

| 논리 입력명 | byte 크기 | SHA-256 | 원문·렌더링 검수 결과 |
| --- | ---: | --- | --- |
| `evonik-FORM_3694726.pdf` | 54,746 | `80eab460957c70e2b2444a4a44442999d143f69b116a182deb5cf8c6653c6bfb` | 2쪽 모두 렌더링 확인. `GM 4/7/2`, PDF 생성일 2026-08-17, `ad 100`, cotton pad 사용과 leave-on 문구를 확인했다. |
| `evonik-FORM_2321731.pdf` | 58,774 | `5258ae03b9bb4ee071aa7429f0563d14c377762a9296f6c99b9a68bdd3be63bc` | 2쪽 모두 렌더링 확인. `MKM 6142-022`, PDF 생성일 2026-08-17, 수치 함량 합계 100과 공정·물성을 확인했지만 정상 사용 절차는 없다. |
| `evonik-FORM_504642.pdf` | 50,868 | `a848002f4e20cd83ff7f9527a2721ebfee2af30324f7f01b10a1d33200eb18b8` | 1쪽 렌더링 확인. `H 23/16-1`, PDF 생성일 2026-08-17, O/W 표기를 확인했다. 수치 항목 합계가 이미 100인데 perfume가 `q.s.`여서 정확 질량 처방으로 승인하지 않는다. |
| `dow-formulation-01419.pdf` | 56,294 | `538fc3743bfcc41a752aa882b8dac71aed9fb7b34fb08cb9160e2076f9ca5186` | 2쪽 모두 렌더링 확인. `W-in-O Emulsion`과 수치 합계 100을 확인했지만 공식 표에서 `Distilled Water`의 INCI가 `Persea Gratissima (Avocado) Oil`로 표시돼 source defect로 `QUARANTINED`한다. |

Evonik HTML detail 응답도 외부 source store에 discovery snapshot으로 보관했지만 위 PDF와
중복되는 현재 pilot normalized input에는 아직 넣지 않는다. Dow의 query 없는 `.pdf` URL은
HTML을 반환하므로 content magic을 확인한 query URL의 PDF byte만 위 표에 기록했다.

`MKM 6142-022`의 공개 INCI 구성 20건(고유 이름 19건)을 외부 catalog
`ingredients.json` 31,441,501 byte, SHA-256
`f5d771e588d13d86161b06a46d4c35245e92f5ab21b62ab79a64a205d82a5c7d`와
`ingredient-identity-resolver-v1`으로 예행 해석했다. 고유 이름 18건은 exact resolve됐고
`Lauryl Oleate` 한 건은 vocabulary에 없어 `Unresolved`로 남았다.
`Polyglyceryl-4 Diisostearate/Polyhydroxystearate/Sebacate`는 slash를 분리하지 않은 공식 이름
전체로 canonical ID 한 건에 resolve됐다. 따라서 이 pilot은 질량 합계 100이어도 정상 사용
절차 결측과 미해결 성분을 숨기지 않고 현재 `QUARANTINED`한다.

## 다음 수집 순서

1. 확보한 PDF byte와 위 digest를 대조해 source revision을 고정한다.
2. normalized importer가 같은 byte를 한 번 읽어 parser와 `InputManifest`에 함께 전달한다.
3. 원문 재배포 상태를 `UNKNOWN`으로 등록한 뒤 근거 문구·검수자·검수일이 있을 때만
   `ALLOWED`로 바꾼다.
4. 원료명, phase, 원문 함량·한정자, 공정, 물성, 사용법을 서로 다른 필드로 추출한다.
5. 합계 100, 복합원료 구성, category·usage form·application type·formulation mapping을
   독립 검증하고 결함은 `QUARANTINED`한다.
6. pilot 결과가 재현된 뒤에만 카테고리별 30~50개와 독립 source family 세 개 이상을 향해
   수집 범위를 확장한다.

## 아직 완료로 세지 않는 항목

- 원문 byte와 content hash가 없는 URL 후보
- index·검색 요약만 확인한 formulation
- 라이선스 판정이 없는 원문 또는 원문을 복원할 수 있는 파생 데이터
- `q.s.`나 `ad 100`을 근거 없이 수치화한 처방
- trade blend의 전체 투입량을 각 표시 INCI에 중복 배정한 처방
- 공식 사용법 없이 category나 제품명으로 leave-on을 추정한 observation
