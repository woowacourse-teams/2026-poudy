# 피드백 HEIC 이미지 지원 구현 계획

## 상태

- 상태: 구현 완료, 실제 배포 호스트 검증 대기
- 시작일: 2026-09-04
- 완료일: 2026-09-04
- 추적 이슈: [#388 피드백 이미지 업로드에 HEIC 형식을 지원한다](https://github.com/woowacourse-teams/2026-poudy/issues/388)
- 소유 도메인: `feedback`

## 목표와 결과

`POST /api/feedback/images`가 JPEG, PNG와 함께 아이폰에서 생성되는 HEIC 정지 이미지를
받도록 했다. 외부 API는 `imageIds`를 넘기는 기존 2단계 구조를 유지한다. HEIC는 입력
형식으로만 다루고, 디코딩한 픽셀을 `FeedbackImageFormat.JPEG`로 재인코딩한다. 따라서 S3
키, pending/claim/commit 상태와 피드백 JSON의 외부 계약은 바뀌지 않았다.

## 구현 경계

- 파일명과 Content-Type은 판정에 사용하지 않는다. ISO BMFF의 첫 `ftyp` box에
  `heic` 또는 `heix` brand가 있는 입력만 HEIC 후보로 분류하고, AVIF 같은 다른 ISO BMFF
  형식을 HEIC로 오인하지 않는다.
- 후보 입력은 호스트의 `/usr/bin/heif-convert`로 실제 디코딩한다. 자식 프로세스의 환경
  변수를 모두 제거하고 `/usr/bin/prlimit`로 384 MiB 주소 공간, 32 MiB 출력 파일, 15초
  CPU·실행 시간 상한을 적용한다.
- 원본과 중간 JPEG는 요청별 임시 디렉터리에만 쓰고 성공·실패와 관계없이 삭제한다.
  디코더가 만든 JPEG 파일이 정확히 하나일 때만 다음 단계로 넘긴다.
- 중간 JPEG를 ImageIO가 다시 읽어 각 축 4,096px, 총 16MP, 완전 디코딩 여부를 확인한다.
  픽셀은 RGB JPEG로 재인코딩하므로 EXIF, ICC, 썸네일과 원본 컨테이너 데이터가 저장
  결과에 남지 않는다. 기존 5 MiB 입력·출력 상한도 유지한다.
- HEIC 컨테이너의 프레임 수를 애플리케이션이 별도 파싱하지 않는다. 다만 현재 외부 디코더가
  JPEG를 여러 개 만들면 단일 결과 계약에 맞지 않아 거절한다.

## 운영 의존성과 라이선스

`bootstrap-backend.sh`는 Amazon Linux의 `libheif-tools`, `libde265`, `util-linux-core`를
설치하고 `/usr/bin/heif-convert`, `/usr/bin/prlimit`을 확인한다.

운영에서는 다음을 확인한다.

1. 배포판 보안 공지와 RPM changelog·빌드 정보로 현재 `libheif`·HEVC 디코더 패키지에
   필요한 수정이 backport되었는지 확인한다. 배포판은 상위 버전 문자열을 바꾸지 않고도
   보안 수정을 역이식할 수 있으므로 upstream semver만으로 안전 여부를 판단하지 않는다.
2. `/usr/bin/prlimit`과 `/usr/bin/heif-convert`가 일반 파일이고 백엔드 실행 계정이 실행할 수
   있는지 확인한다.
3. OS 패키지가 제공하는 LGPL 고지와 해당 소스 제공 경로를 보존한다. 애플리케이션은
   `libheif`·`libde265` 바이너리를 번들하거나 링크하지 않고 OS 실행 파일로만 호출한다.
4. LGPL 같은 오픈소스 라이선스는 HEVC/H.265 특허권을 허여하지 않으므로 서비스
   국가·제공 방식·사업 범위에 맞는 특허 정책을 조직에서 별도로 확인한다.
이 기능은 사용자가 피드백에 첨부한 이미지를 내부에서 검증·정규화하는 용도지만,
그 사실만으로 특허 의무가 없다고 단정하지 않는다.

## 검증 결과

- 외부 라이선스가 적용되는 HEIC fixture는 저장소에 포함하지 않았다. 단위 테스트는 mock
  디코더가 반환한 JPEG와 애플리케이션 경계를 검증한다.
- `heic`/`heix` 식별, HEIC가 아닌 ISO BMFF 오인 방지, 손상 후보 거절과 JPEG 정규화를
  검증했다.
- 실행 파일 확인, `prlimit` 명령, 빈 자식 환경과 JPEG/PNG에 영향이 없는 경계를 테스트했다.
- 실제 변환은 팀이 직접 촬영한 HEIC로 bootstrap을 실행한 Amazon Linux 호스트에서
  배포 전 확인한다.
- APNG/MPO/연결 JPEG 수동 파서, reader warning 거절, writer 결과 재디코딩과 중복 배치
  합계 계산은 픽셀 정규화 경계에 필요한 보안 효과를 더하지 않아 제거했다.
