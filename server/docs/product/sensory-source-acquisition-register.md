# 감각 원천 수집 기록

## 문서 지위

- 상태: **discovery 및 pilot 기록**
- 원문 위치: 저장소 밖 접근 통제 source store
- runtime 사용: 없음

아래 내용은 2026-08-18까지 확인한 후보와 당시 확보 기록이다. URL 발견은 수집 완료가
아니며, 원문 byte·revision·라이선스·사용법·성분 해석을 다시 검증하기 전 accepted corpus로
세지 않는다.

## 공식 원천 후보

| source family | 확인된 자료 | 초기 후보 | 차단 조건 |
| --- | --- | --- | --- |
| `evonik-formulations` | phase, `%W/W`, 공정·물성을 가진 공식 formulation | 토너·로션·크림 | `q.s.`·`ad 100`, trade blend, 사용법과 재배포 검수 |
| `dow-personal-care-formulations` | W/O 유형과 phase별 함량을 가진 공식 PDF | 크림 | 표의 원료명/INCI 불일치와 사용법 결측 검수 |
| `lubrizol-beauty-formulations` | formulation detail과 별도 문서 후보 | 로션·크림·젤 | 동적 페이지가 아닌 안정 byte와 revision 확보 |
| `hallstar-skin-care-formulations` | 여러 formulation 번호와 형태를 제공하는 index | 토너·세럼·크림·밤·선크림 | 개별 원문 표 확보, 제외 범위 분리, 마케팅 문구 배제 |
| `clariant-concept-formulations` | 하나의 brochure에 여러 formulation | 미스트·선크림 | brochure를 여러 독립 출처로 중복 계산하지 않음 |

## pilot byte 기록

다음은 당시 저장소 밖에 확보하고 렌더링 검수했다고 기록한 PDF다. 현재 파일 존재와 hash는
수집 재개 시 다시 확인한다.

| 논리 입력 | bytes | SHA-256 | 당시 판정 |
| --- | ---: | --- | --- |
| `evonik-FORM_3694726.pdf` | 54,746 | `80eab460957c70e2b2444a4a44442999d143f69b116a182deb5cf8c6653c6bfb` | `GM 4/7/2`; `ad 100`, cotton pad와 leave-on 근거를 구조화하기 전 후보 |
| `evonik-FORM_2321731.pdf` | 58,774 | `5258ae03b9bb4ee071aa7429f0563d14c377762a9296f6c99b9a68bdd3be63bc` | `MKM 6142-022`; 수치 합계 100이나 사용법과 한 성분 해석이 미해결이라 격리 |
| `evonik-FORM_504642.pdf` | 50,868 | `a848002f4e20cd83ff7f9527a2721ebfee2af30324f7f01b10a1d33200eb18b8` | `H 23/16-1`; O/W이나 수치 합계 100과 perfume `q.s.`가 함께 있어 격리 |
| `dow-formulation-01419.pdf` | 56,294 | `538fc3743bfcc41a752aa882b8dac71aed9fb7b34fb08cb9160e2076f9ca5186` | W/O·합계 100이나 Water 행의 INCI 불일치로 격리 |

`MKM 6142-022`의 공개 INCI 고유 이름 19건 중 18건은 당시 외부 성분 snapshot에서 exact
resolve됐고 `Lauryl Oleate`는 미해결이었다. slash가 포함된
`Polyglyceryl-4 Diisostearate/Polyhydroxystearate/Sebacate`는 분리하지 않고 하나의 공식
이름으로 해석했다.

## 다음 수집 순서

1. source store의 byte 존재와 위 digest를 재확인한다.
2. source metadata에 revision, 접근일, source family와 재배포 상태를 기록한다.
3. 동일 byte를 한 번 읽어 parser와 input manifest에 함께 전달한다.
4. phase, 원료명, 원문 함량·한정자, 공정, 물성, 사용법을 분리 추출한다.
5. 질량 합계, 복합원료, 성분 해석과 각 canonical mapping을 독립 검증한다.
6. 결함을 격리한 vertical slice가 재현된 뒤에만 수집 범위를 넓힌다.

다음은 완료로 세지 않는다: URL만 있는 후보, index 요약, 라이선스 미검수 원문,
`q.s.`·`ad 100`의 임의 수치화, trade blend 함량 복제, 공식 사용법 없는 leave-on 추정.
