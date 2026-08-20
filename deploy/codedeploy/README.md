# CodeBuild·CodeDeploy 배포 구성

운영 배포 흐름은 GitHub dev → CodeBuild ARM64 → backend/frontend secondary
artifacts → S3 → CodeDeploy 배포 그룹 → EC2 파일 교체 및 systemd 재시작입니다.

> 배포용 GitHub Actions 워크플로는 사용하지 않습니다. GitHub Actions에는 PR 검증만
> 남기고, 운영 산출물 생성과 EC2 배포는 CodeBuild·CodeDeploy가 담당합니다.

## CodeBuild

CodeBuild 프로젝트는 다음 기준으로 생성합니다.

- 소스: GitHub 버전 1, "dev" 브랜치
- 환경: 관리형 이미지, ARM64, Java 21·Node.js 22 지원 이미지
- 서비스 역할: 제공된 "codebuild-project"
- 로그 그룹: "/aws/codebuild/project-2026"
- 빌드 명령: 저장소 루트의 "buildspec.yml"
- secondary artifacts: "backend", "frontend"

secondary artifact의 저장 위치는 AWS 콘솔에서 각각 지정합니다.

- backend: "s3://techcourse-project-2026-artifacts/poudy/backend/"
- frontend: "s3://techcourse-project-2026/poudy/frontend/"

현재 buildspec은 두 산출물을 같은 빌드에서 생성하지만, CodeBuild 프로젝트 설정에서
각 산출물의 S3 위치를 분리해야 합니다. 최상위 primary artifact는 CodeBuild 규격상
필요한 빌드 식별 marker만 담으며, 실제 배포에는 사용하지 않습니다.

`buildspec.yml`에서 Next.js 빌드 시 운영 환경을 명시합니다. `NEXT_PUBLIC_API_BASE_URL`은
비워 두어 브라우저가 현재 프론트 origin을 사용하게 하며, 프론트 EC2 Nginx가 `/api/*`를
백엔드 EC2의 사설 IP로 전달합니다. `NEXT_PUBLIC_POSTHOG_KEY`처럼 값이 필요한 비밀·환경값은
저장소에 적지 말고 CodeBuild 프로젝트 환경 변수 또는 Secrets Manager 연동으로 주입합니다.

## CodeDeploy

프론트엔드와 백엔드는 배포 대상과 재시작 서비스가 다르므로 배포 그룹을 분리합니다.

- 애플리케이션: "poudy-backend", 배포 그룹: "poudy-backend-ec2"
- 애플리케이션: "poudy-frontend", 배포 그룹: "poudy-frontend-ec2"
- 배포 방식: In-place
- 서비스 역할: 제공된 "codedeploy-project"
- 대상: 각 EC2의 "ProjectTeam=poudy" 태그와 역할 태그 조합

CodeDeploy Agent는 두 EC2에 설치되어 있어야 하며, EC2 IAM role "ec2-project"가
CodeDeploy와 S3에 접근할 수 있어야 합니다. 배포 그룹의 대상은 FE와 BE를 섞지
않도록 별도 태그 또는 인스턴스 ID로 분리합니다.

## 현재 범위

- 무중단·blue/green 배포는 제외합니다.
- 배포 실패 시 우선 CodeDeploy 콘솔에서 동일 아티팩트를 재배포합니다.
- CodePipeline은 CodeBuild와 CodeDeploy 연결을 한 곳에서 관리할 필요가 생길 때만
  추가합니다.
