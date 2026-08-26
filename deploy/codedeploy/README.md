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
- git clone depth: 릴리스 태그를 읽어야 하므로 전체 클론
- 환경: 관리형 이미지, ARM64, Java 21·Node.js 22 지원 이미지
- CodeBuild 프로젝트: `poudy-codebuild`
- 로그 그룹: "/aws/codebuild/project-2026"
- 빌드 명령: 저장소 루트의 "buildspec.yml"
- secondary artifacts: "backend", "frontend"

secondary artifact의 저장 위치는 AWS 콘솔에서 각각 지정합니다.

- backend: "s3://techcourse-project-2026-artifacts/poudy/backend/"
- frontend: "s3://techcourse-project-2026/poudy/frontend/"

staging 백엔드 파이프라인은 운영용 전체 빌드와 분리된 CodeBuild 프로젝트를 사용합니다.

- Pipeline: `poudy-staging-pipeline`
- Source: GitHub OAuth, `woowacourse-teams/2026-poudy`, `dev` 브랜치
- CodeBuild 프로젝트: `poudy-staging-codebuild`
- CodeBuild 소스 공급자: CodePipeline
- 빌드 명령: 저장소 루트의 `buildspec-staging-backend.yml`
- Build input artifact: `SourceArtifact`
- Build output artifact: `BuildArtifact`
- Deploy input artifact: `BuildArtifact`

`buildspec-staging-backend.yml`은 백엔드 JAR, 백엔드 `appspec.yml`, CodeDeploy hook만
포함하는 단일 배포 패키지를 생성합니다. CodeDeploy는 buildspec을 사용하지 않으며,
패키지 루트의 `appspec.yml`은 기존 `deploy/codedeploy/backend/appspec.yml`을 그대로
사용합니다.

현재 buildspec은 두 산출물을 같은 빌드에서 생성하지만, CodeBuild 프로젝트 설정에서
각 산출물의 S3 위치를 분리해야 합니다. 최상위 primary artifact는 CodeBuild 규격상
필요한 빌드 식별 marker만 담으며, 실제 배포에는 사용하지 않습니다.

산출물의 버전은 `main`에 붙은 릴리스 태그에서 옵니다. `buildspec.yml`이 `git describe`로
태그를 읽어 `APP_VERSION`으로 넘기고, 서버 JAR 버전과 `build-metadata.txt`의 `version`에
같은 값이 들어갑니다. 태그를 찾지 못하면 커밋 SHA로 대체하고 그 사실을 빌드 로그에
남기므로, 버전이 커밋으로 찍혀 있다면 clone depth부터 확인합니다.

버전 태그는 `dev` → `main` PR에 붙인 `major`·`minor`·`patch` 레이블을 보고
`.github/workflows/release-tag.yml`이 만듭니다. 브랜치 push를 빌드 트리거로 쓰면 태그가
만들어지기 전에 빌드가 시작될 수 있으므로, 트리거는 태그 push를 기준으로 둡니다.

무엇을 언제 내보냈는지는 GitHub Release가 기록합니다. 배포 이력을 위한 별도 파일이나
엔드포인트를 두지 않습니다. 다만 릴리스는 "냈다"의 기록이지 "떠 있다"의 기록이 아니므로,
배포가 실패하면 릴리스와 실제가 어긋납니다. 트리거를 태그 push로 두어야 릴리스와 배포
시도가 1:1로 붙고, 어긋났을 때 대조할 근거는 배포된 `app.jar` 매니페스트의
`Implementation-Version`입니다.

`buildspec.yml`에서 Next.js 빌드 시 운영 환경을 명시합니다. `NEXT_PUBLIC_API_BASE_URL`은
비워 두어 브라우저가 현재 프론트 origin을 사용하게 하며, 프론트 EC2 Nginx가 `/api/*`를
백엔드 EC2의 사설 IP로 전달합니다. `NEXT_PUBLIC_POSTHOG_KEY`처럼 값이 필요한 비밀·환경값은
저장소에 적지 말고 CodeBuild 프로젝트 환경 변수 또는 Secrets Manager 연동으로 주입합니다.

프론트엔드 secondary artifact에는 `nginx/` 설정 템플릿도 포함됩니다. CodeDeploy
`ApplicationStart` 훅은 인증서 두 파일이 모두 존재할 때만 HTTPS 템플릿을 활성화하고,
그 외에는 HTTP bootstrap 템플릿을 활성화합니다. 따라서 인증서가 아직 없는 신규
인스턴스나 인증서가 제거된 인스턴스에 재배포해도 `nginx -t`가 존재하지 않는
`/etc/letsencrypt/live/poudy.site` 경로 때문에 실패하지 않습니다.

인증서 발급 후에는 프론트 EC2에서 다음을 실행합니다.

```bash
cd /opt/poudy/repository
sudo ./deploy/scripts/enable-frontend-https.sh
```

이후 HTTP `:80`은 ACME challenge를 제외하고 HTTPS `:443`으로 리다이렉트하며,
HTTPS 서버의 `/api/*`와 `/` 프록시 경로는 각각 기존 백엔드 사설 IP와 Next.js
standalone을 유지합니다.

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
