# CodeBuild·CodeDeploy 배포 구성

운영 배포 흐름은 `poudy-pipeline`에서 GitHub `main` → CodeBuild →
`backend`/`frontend` artifacts → CodeDeploy 배포 그룹 → EC2 파일 교체 및
systemd 재시작 순서로 실행됩니다.

이 흐름은 현재 AWS CodePipeline으로 연결되어 있습니다. 저장소에는 파이프라인
정의나 IaC를 두지 않으므로 파이프라인 이름, webhook/실행 조건, 승인 단계, artifact
store와 각 action의 세부 설정은 AWS 콘솔 구성이 기준입니다.

현재 콘솔에서 확인된 Pipeline 구성은 다음과 같습니다.

- Pipeline: `poudy-pipeline`
- Source: GitHub OAuth, `woowacourse-teams/2026-poudy`, `main` 브랜치
- Source output artifact: `SourceArtifact`
- Trigger: CodePipeline webhook, source polling 비활성화
- Build: AWS CodeBuild 프로젝트 `poudy-codebuild`
- Build input artifact: `SourceArtifact`
- Build output artifacts: `backend`, `frontend`
- Deploy action `fe-deploy`: CodeDeploy 애플리케이션 `poudy-codedeploy`,
  배포 그룹 `poudy-frontend-dg`, input artifact `frontend`
- Deploy action `be-deploy`: CodeDeploy 애플리케이션 `poudy-codedeploy`,
  배포 그룹 `poudy-backend-dg`, input artifact `backend`

> 배포용 GitHub Actions 워크플로는 사용하지 않습니다. GitHub Actions에는 PR 검증만
> 남기고, 운영 산출물 생성과 EC2 배포는 CodeBuild·CodeDeploy가 담당합니다.

## CodeBuild

CodeBuild 프로젝트는 다음 기준으로 생성합니다.

- 소스: GitHub OAuth(GitHub 버전 1), `woowacourse-teams/2026-poudy`의 `main` 브랜치
- 소스 아티팩트: Git 히스토리와 태그를 포함하지 않는 ZIP
- 환경: 관리형 이미지, ARM64, Java 21·Node.js 22 지원 이미지
- CodeBuild 프로젝트: `poudy-codebuild`
- 로그 그룹: "/aws/codebuild/project-2026"
- 빌드 명령: 저장소 루트의 "buildspec.yml"
- secondary artifacts: "backend", "frontend"

secondary artifact의 저장 위치는 AWS 콘솔에서 각각 지정합니다.

- backend: "s3://techcourse-project-2026-artifacts/poudy/backend/"
- frontend: "s3://techcourse-project-2026/poudy/frontend/"

운영 artifact에는 애플리케이션과 함께 호스트 설정도 포함합니다. backend artifact는
`poudy-backend.service`와 backend hook을, frontend artifact는 `ec2-nginx.conf`,
HTTP·HTTPS 서버 설정, `poudy-frontend.service`와 frontend hook을 포함합니다.
CodeDeploy hook은 파일을 각 호스트 경로에 반영한 뒤 `daemon-reload`, Nginx 검증 및
서비스 재시작을 수행합니다.

staging 백엔드 파이프라인은 운영용 전체 빌드와 분리된 CodeBuild 프로젝트를 사용합니다.

- Pipeline: `poudy-staging-pipeline`
- Source: GitHub OAuth, `woowacourse-teams/2026-poudy`, `dev` 브랜치
- CodeBuild 프로젝트: `poudy-staging-codebuild`
- CodeBuild 소스 공급자: CodePipeline
- 빌드 명령: 저장소 루트의 `buildspec-staging-backend.yml`
- Build input artifact: `SourceArtifact`
- Build output artifact: `BuildArtifact`
- Deploy input artifact: `BuildArtifact`

`buildspec-staging-backend.yml`은 백엔드 JAR, systemd unit, 백엔드 `appspec.yml`,
CodeDeploy hook을 포함하는 단일 배포 패키지를 생성합니다. CodeDeploy는 buildspec을 사용하지 않으며,
패키지 루트의 `appspec.yml`은 기존 `deploy/codedeploy/backend/appspec.yml`을 그대로
사용합니다.

## Staging 운영 상태

현재 staging 백엔드 배포와 외부 접근 검증까지 완료된 상태입니다.

- 실행 환경: Amazon Linux 2023 ARM64 EC2
- 배포 Pipeline: `poudy-staging-pipeline`
- Source: GitHub `woowacourse-teams/2026-poudy`의 `dev`
- Build: `poudy-staging-codebuild`
- Deploy: `poudy-codedeploy`의 `poudy-backend-staging-dg`
- 배포 방식: CodeDeploy In-place
- 프론트엔드: 기존 GitHub Actions를 통한 Vercel staging 배포
- Vercel staging: `https://poudy-staging.vercel.app`
- 백엔드 staging: `https://staging.poudy.site`
- CORS 허용 origin: `https://poudy-staging.vercel.app`

staging 백엔드는 다음 검증을 완료했습니다.

- `/actuator/health` → `200 / UP`
- `/api/categories` → `200`
- Vercel staging에서 실제 API 호출 확인
- Nginx HTTPS 및 Let’s Encrypt 자동 갱신 확인
- CodeDeploy Agent 정상 실행 확인

### Staging 데이터 동기화

staging EC2의 `poudy-data-sync.timer`가 다음 위치의 JSON을 `/opt/poudy/data`로
동기화합니다.

```text
s3://techcourse-project-2026/poudy/staging/
  → /opt/poudy/data
```

운영과 staging의 피드백·제품 등록 요청 데이터는 팀 결정에 따라 별도 분리하지 않습니다.
피드백 S3 설정은 허용된 `techcourse-project-2026` 버킷을 사용하며, 현재 애플리케이션의
피드백 prefix도 운영과 같은 `poudy/feedback/`을 사용합니다.

### Staging 보류 사항

- Spring Boot `:8080` 외부 직접 접근 차단은 후순위로 보류합니다.
- staging의 피드백 이미지 기능은 운영과 데이터를 공유하므로, 테스트 데이터도 운영
  피드백 저장소에 남을 수 있습니다.
- staging Pipeline은 `dev` 변경 시 백엔드 CodeDeploy를 실행하고, 프론트엔드는 Vercel
  staging workflow가 별도로 배포합니다.

현재 buildspec은 두 산출물을 같은 빌드에서 생성하지만, CodeBuild 프로젝트 설정에서
각 산출물의 S3 위치를 분리해야 합니다. 최상위 primary artifact는 CodeBuild 규격상
필요한 빌드 식별 marker만 담으며, 실제 배포에는 사용하지 않습니다.

배포 산출물은 `CODEBUILD_RESOLVED_SOURCE_VERSION` 커밋으로 식별합니다.
`buildspec.yml`은 primary artifact의 `build-metadata.txt`에 이 커밋을 기록합니다. GitHub
OAuth Source가 전달하는 ZIP에는 Git 히스토리와 태그가 없으므로 빌드 중 릴리스 버전을
계산하지 않습니다.

버전 태그와 GitHub Release는 `dev` → `main` PR에 붙인 `major`·`minor`·`patch` 레이블을
보고 `.github/workflows/release-tag.yml`이 만듭니다. 운영 Pipeline은 `main` 변경을 별도로
감지하므로 태그 생성보다 먼저 시작될 수 있지만, 두 흐름 모두 같은 머지 커밋을 기준으로
합니다. 릴리스가 배포됐는지는 태그가 가리키는 커밋과 CodePipeline Source revision 또는
`build-metadata.txt`의 `commit`을 대조해 확인합니다.

`buildspec.yml`에서 Next.js 빌드 시 운영 환경을 명시합니다. 브라우저 번들의
`NEXT_PUBLIC_API_BASE_URL`은 `https://poudy.site`로 고정하고, 서버 컴포넌트와
런타임 sitemap은 systemd의 `POUDY_SERVER_API_BASE_URL=http://127.0.0.1:8081`을
사용합니다. `NEXT_PUBLIC_POSTHOG_KEY`와 `NEXT_PUBLIC_GA_MEASUREMENT_ID`처럼 값이
필요한 환경값은 저장소에 적지 말고 CodeBuild 프로젝트 환경 변수 또는 Secrets Manager
연동으로 주입합니다.

프론트엔드 secondary artifact에는 Nginx main 설정·서버 설정 템플릿과 systemd unit이
포함됩니다. CodeDeploy
`ApplicationStart` 훅은 인증서 두 파일이 모두 존재할 때만 HTTPS 템플릿을 활성화하고,
그 외에는 HTTP bootstrap 템플릿을 활성화합니다. 따라서 인증서가 아직 없는 신규
인스턴스나 인증서가 제거된 인스턴스에 재배포해도 `nginx -t`가 존재하지 않는
`/etc/letsencrypt/live/poudy.site` 경로 때문에 실패하지 않습니다.

이번 Nginx 템플릿에는 `/_next/static/` 정적 자산 캐시와 정확히
`GET /api/categories`에만 적용되는 30초 캐시가 포함됩니다. 공개 cache key는 `Origin`을
포함하고 Cookie·Authorization 요청은 우회하며, 로컬 listener는 별도의 `internal:`
cache key를 사용합니다. 세 runtime sitemap은 별도의 `poudy_sitemaps` 파일 캐시에서
제품 12시간, 페이지·성분 24시간 동안 완성된 200 XML만 보관합니다. query·Host·Cookie·
Authorization·RSC 헤더는 cache variant를 만들지 않으며 만료 갱신과 일시적인 5xx에는
기존 정상 XML을 제공합니다. CodeDeploy의 `ApplicationStart` 훅은 Nginx main 설정·
server 설정·캐시 디렉터리·systemd unit을 설치하고 `nginx -t`를 통과시킨 뒤 Nginx를
먼저, Next.js를 나중에 재시작합니다. Nginx 검증 실패 시 기존 설정을 복구합니다.

`ValidateService`는 실행 중인 Node MainPID 환경에서 로컬 API origin이 최종 강제됐는지,
`:8081`이 loopback에만 열렸는지 확인합니다. 이어서 가장 작은 페이지 sitemap을 한 번만
warm-up하고 query·Cookie·Authorization·RSC 헤더를 바꾼 요청이 같은 cache entry를
재사용하는지 확인합니다. 운영 캐시를 삭제하거나 제품·성분 전체를 매 배포마다 다시
생성하지 않습니다.

인증서 발급 후에는 프론트 EC2에서 다음을 실행합니다.

```bash
cd /opt/poudy/repository
sudo ./deploy/scripts/enable-frontend-https.sh
```

이후 HTTP `:80`은 ACME challenge를 제외하고 HTTPS `:443`으로 리다이렉트하며,
HTTPS 서버의 `/api/*`와 `/` 프록시 경로는 각각 기존 백엔드 사설 IP와 Next.js
standalone을 유지합니다. 같은 Nginx 프로세스의 `127.0.0.1:8081` listener는
Next.js 서버 요청만 `poudy_backend` upstream으로 전달합니다.

## CodeDeploy

프론트엔드와 백엔드는 배포 대상과 재시작 서비스가 다르므로 하나의 CodeDeploy
애플리케이션 아래 배포 그룹을 분리합니다.

- 애플리케이션: `poudy-codedeploy`
- 프론트엔드 배포 그룹: `poudy-frontend-dg`
- 백엔드 배포 그룹: `poudy-backend-dg`
- staging 백엔드 배포 그룹: `poudy-backend-staging-dg`
- 배포 방식: In-place
- 서비스 역할: 제공된 "codedeploy-project"
- 운영 대상: 각 EC2의 `ProjectTeam=poudy` 태그와 역할 태그 조합
- staging 대상: `Environment=staging` 및 `Component=backend` 태그 조합

CodeDeploy Agent는 두 EC2에 설치되어 있어야 하며, EC2 IAM role "ec2-project"가
CodeDeploy와 S3에 접근할 수 있어야 합니다. 배포 그룹의 대상은 FE와 BE를 섞지
않도록 별도 태그 또는 인스턴스 ID로 분리합니다.

## 현재 범위

- 무중단·blue/green 배포는 제외합니다.
- 배포 실패 시 우선 CodeDeploy 콘솔에서 동일 아티팩트를 재배포합니다.
- CodePipeline이 CodeBuild와 CodeDeploy 연결 및 운영 배포 실행을 관리합니다.
