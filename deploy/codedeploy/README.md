# CodeBuild·CodeDeploy 배포 구성

운영 배포 흐름은 `poudy-pipeline`에서 GitHub `main` → 백엔드 CodeBuild → 백엔드
CodeDeploy → 프론트 CodeBuild → 프론트 CodeDeploy 순서로 실행됩니다. 각 CodeDeploy는
EC2 파일을 교체하고 systemd를 재시작합니다.

이 흐름은 현재 AWS CodePipeline으로 연결되어 있습니다. 저장소에는 파이프라인
정의나 IaC를 두지 않으므로 파이프라인 이름, webhook/실행 조건, 승인 단계, artifact
store와 각 action의 세부 설정은 AWS 콘솔 구성이 기준입니다.

Pipeline 구성은 다음과 같습니다.

- Pipeline: `poudy-pipeline` (CodePipeline V2)
- Source: GitHub OAuth, `woowacourse-teams/2026-poudy`, `main` 브랜치
- Source output artifact: `SourceArtifact`
- Trigger: CodePipeline webhook, source polling 비활성화
- `BuildBackend`: CodeBuild 프로젝트 `poudy-codebuild`, input artifact `SourceArtifact`,
  output artifact `backend`
- `DeployBackend`: CodeDeploy action `be-deploy`, 애플리케이션 `poudy-codedeploy`,
  배포 그룹 `poudy-backend-dg`, input artifact `backend`
- `BuildFrontend`: CodeBuild 프로젝트 `poudy-frontend-codebuild`, input artifact
  `SourceArtifact`, output artifact `frontend`
- `DeployFrontend`: CodeDeploy action `fe-deploy`, 애플리케이션 `poudy-codedeploy`,
  배포 그룹 `poudy-frontend-dg`, input artifact `frontend`
- `DeployBackend`와 `DeployFrontend`는 각각 실패 시 stage 자동 롤백을 켭니다. 한쪽 롤백은
  다른 단계를 다시 실행하지 않습니다. 롤백 대상은 현재 파이프라인 구조에서 성공한
  실행이어야 하므로, 구조를 바꾼 뒤에는 첫 성공 실행이 생겨야 자동 롤백이 동작합니다.
- CodeDeploy 배포 그룹의 자동 롤백은 쓰지 않습니다.

프론트 빌드는 Next.js prerender 중 `https://poudy.site/api`를 부릅니다. 백엔드와 같은
빌드에서 만들면 아직 배포되지 않은 API를 이전 백엔드에 요청해 빌드가 실패하고, 새
백엔드도 그 빌드가 끝나야 배포되므로 재시도로 풀리지 않습니다. 그래서 프론트 빌드를
백엔드 배포 다음 단계에 둡니다. staging도 같은 순서입니다. 백엔드가 먼저 뜨는 동안에는
이전 프론트가 새 백엔드를 부르므로, 응답 필드를 빼는 변경은 두 번에 나눠 배포합니다.
V37·V38·V39의 관리자 처리 이력·월별 집계 제거 및 회원 복구 정보 이관은 사용자 요청에 따라 화면과 API를 같은
revision의 한 릴리스로 교체합니다. 이 경우 관리자 탭을 모두 닫고 사용을 중단한 상태에서
백엔드와 프론트 배포를 모두 완료한 뒤 새 탭으로 검증하고 사용을 재개합니다.
프론트 배포 실패 시에도 관리자 사용 중단을 유지합니다. 세부 절차는
[관리자 화면·API 동시 교체](../../server/docs/exec-plans/active/admin-notices/README.md#관리자-화면api-동시-교체-v37v38v39)를 따릅니다.
백엔드 단계가 실패하면 프론트 단계는 실행되지 않고, 프론트 단계가 실패하면 백엔드는 새
버전으로 남습니다. 두 단계를 모두 손으로 되돌릴 때는 프론트를 먼저 롤백합니다.

프론트 `BeforeInstall`은 서비스를 멈춘 뒤 `.next/cache`를 비웁니다. Next fetch
캐시 키에는 빌드 ID가 없고 CodeDeploy는 실행 중에 생긴 파일을 지우지 않아, 그대로 두면 새
빌드가 응답 모양이 바뀌기 전의 API 응답을 `revalidate` 기간 동안 읽습니다. 이미지 최적화를
끈 뒤로는 `.next/cache/images`도 읽히지 않아 디렉터리째 비웁니다. 빌드의 fetch
캐시는 산출물에 넣지 않습니다. 빌드는 `https://poudy.site/api`를, 운영 서버는
`http://127.0.0.1:8081/api`를 불러 캐시 키가 달라서입니다.

> 배포용 GitHub Actions 워크플로는 사용하지 않습니다. GitHub Actions에는 PR 검증만
> 남기고, 운영 산출물 생성과 EC2 배포는 CodeBuild·CodeDeploy가 담당합니다.

## CodeBuild

운영 CodeBuild 프로젝트는 백엔드와 프론트를 따로 둡니다. staging과 같은 구조입니다.

- 환경: 관리형 이미지, ARM64
- 로그 그룹: "/aws/codebuild/project-2026"
- 백엔드: 프로젝트 `poudy-codebuild`, 소스 공급자 GitHub OAuth, Java 21 지원 이미지,
  빌드 명령은 저장소 루트의 `buildspec-backend.yml`
- 프론트: 프로젝트 `poudy-frontend-codebuild`, 소스 공급자 CodePipeline, Node.js 22 지원
  이미지, 빌드 명령은 저장소 루트의 `buildspec-frontend.yml`
- 프론트 CodeBuild 환경 변수: 프론트 빌드가 쓰는 `NEXT_PUBLIC_*` 값(저장소에 적지 않음).
  두 빌드를 한 프로젝트에서 돌리던 때 `poudy-codebuild`에 넣어 둔 값을 옮깁니다.
- 파이프라인에서 실행되면 두 프로젝트 모두 `SourceArtifact`(Git 히스토리와 태그를 포함하지
  않는 ZIP)를 소스로 받고, primary artifact 하나를 파이프라인 artifact store에 올립니다.
  프로젝트의 소스·artifact 설정은 콘솔에서 단독 실행할 때만 쓰입니다.

운영 artifact에는 애플리케이션과 함께 호스트 설정도 포함합니다. backend artifact는
`poudy-backend.service`와 backend hook을, frontend artifact는 `ec2-nginx.conf`,
HTTP·HTTPS 서버 설정, `poudy-frontend.service`와 frontend hook을 포함합니다.
CodeDeploy hook은 파일을 각 호스트 경로에 반영한 뒤 `daemon-reload`, Nginx 검증 및
서비스 재시작을 수행합니다.

staging 백엔드 파이프라인은 운영과 다른 CodeBuild 프로젝트를 사용합니다.

- Pipeline: `poudy-staging-pipeline`
- Source: GitHub OAuth, `woowacourse-teams/2026-poudy`, `dev` 브랜치
- CodeBuild 프로젝트: `poudy-staging-codebuild`
- CodeBuild 소스 공급자: GitHub OAuth (파이프라인에서는 `SourceArtifact` 사용)
- 빌드 명령: 저장소 루트의 `buildspec-staging-backend.yml`
- Build input artifact: `SourceArtifact`
- Build output artifact: `BuildArtifact`
- Deploy input artifact: `BuildArtifact`

`buildspec-staging-backend.yml`은 staging 백엔드 JAR로 ARM64 Docker image를 빌드한 뒤,
압축 image archive, systemd unit, staging 전용 `appspec.yml`과 CodeDeploy hook을 포함하는
단일 배포 패키지를 생성합니다. 기존 Pipeline과 S3 artifact 경로는 유지합니다. CodeDeploy는
buildspec을 사용하지 않으며 패키지 루트 `appspec.yml`이 컨테이너 적용 hook을 선택합니다.
이 변경은 staging 백엔드에만 적용하고 production은 기존 JAR 배포를 유지합니다.

staging 프론트 파이프라인은 같은 `poudy-staging-pipeline`에 붙이되, 백엔드와 다른 CodeBuild
프로젝트를 씁니다. 백엔드 staging 빌드는 Docker 권한과 단일 primary artifact를 쓰므로 그대로 두고,
프론트 빌드를 따로 둬 백엔드 배포 흐름을 건드리지 않습니다.

- CodeBuild 프로젝트: `poudy-staging-frontend-codebuild`. ARM64, Node.js 22 지원 관리형 이미지, CodePipeline 소스
- 빌드 명령: 저장소 루트의 `buildspec-staging-frontend.yml`
- CodeBuild 환경 변수: `NEXT_PUBLIC_POSTHOG_KEY` (저장소에 적지 않음)
- 배포 그룹: `poudy-codedeploy`의 `poudy-frontend-staging-dg`, 대상 태그 `Name=ec2-poudy-staging-fe` 하나
- 순서: 백엔드 배포(`poudy-backend-staging-dg`)가 끝난 다음 단계

프론트 빌드는 Next.js prerender 중 `https://staging.poudy.site/api`를 부릅니다. 빌드 단계도
백엔드 배포 다음에 두면 같은 커밋의 API 변경을 본 상태로 빌드합니다.

배포 그룹 대상은 `Name` 태그 하나로만 잡습니다. staging 프론트·백엔드 인스턴스는 `Environment`,
`ProjectTeam`, `Service`, `Role` 태그가 같아서 공통 태그로 잡으면 서로의 배포 대상이 됩니다.
2026-09-18에는 `poudy-backend-staging-dg` 배포가 운영 백엔드까지 대상으로 잡은 적이 있습니다.
프론트 `validate-service.sh`가 백엔드를 거쳐 `/api/categories`를 확인하므로 백엔드 다음에
배포합니다.

## Staging 운영 상태

현재 staging 백엔드 배포와 외부 접근 검증까지 완료된 상태입니다.

- 실행 환경: Amazon Linux 2023 ARM64 EC2
- 배포 Pipeline: `poudy-staging-pipeline`
- Source: GitHub `woowacourse-teams/2026-poudy`의 `dev`
- Build: `poudy-staging-codebuild`
- Deploy: `poudy-codedeploy`의 `poudy-backend-staging-dg`
- 배포 방식: CodeDeploy In-place
- 프론트엔드: 같은 파이프라인의 `poudy-frontend-staging-dg`가 staging 프론트 EC2에 배포
- staging 주소: `https://staging.poudy.site` (화면과 `/api`를 같은 출처로 제공)
- 백엔드 staging: `https://staging.poudy.site`
- CORS 허용 origin: PR preview `https://*.preview.poudy.site` (`application-staging.yml`, 컨테이너 프로필 `prod,staging`)

staging 백엔드는 다음 검증을 완료했습니다.

- `/actuator/health` → `200 / UP`
- `/api/categories` → `200`
- staging 프론트 EC2를 거친 화면·API 호출 확인
- Nginx HTTPS 및 Let’s Encrypt 자동 갱신 확인
- CodeDeploy Agent 정상 실행 확인

### Staging PostgreSQL

staging도 `/etc/poudy/backend.env`의 `POUDY_DB_*`로 별도 PostgreSQL DB에 연결합니다.
CodeDeploy `BeforeInstall`은 서비스 중지 전에 DB 연결,
스키마·검색 객체·카탈로그를 읽기 전용으로 검증합니다. 빈 DB를 자동 구성하지 않습니다.
검증을 통과하면 기존 JSON 동기화 timer를 끄고 배포를 계속합니다.

컨테이너 배포에서도 이 사전 검증과 timer 정리를 유지합니다. 새 image를 로드하고 참조가
확인된 다음 기존 백엔드 서비스를 정지하며, 컨테이너는 host networking으로 기존 `:8080`
API와 loopback `:8081` Actuator 주소를 유지합니다. health 검증이 성공하기 전까지는 전환
완료로 간주하지 않습니다.

운영과 staging은 별도 DB를 사용합니다. 의견 이미지 경로도 운영은 `poudy/feedback/images/`, staging은
`poudy/staging/feedback/images/`로 구분합니다. pending prefix(운영 `poudy/feedback/pending/`, staging
`poudy/staging/feedback/pending/`)는 이전 이미지를 옮기는 동안만 씁니다.

### Staging 외부 접근과 배포 경로

- Spring Boot `:8080`은 호스트 nftables로 staging 프론트 사설 IP `10.0.0.51`만 허용합니다.
  `install-staging-backend-firewall.sh`로 설치하며, 부팅 때 로드하고 백엔드 시작 전에 적용합니다.
- staging Pipeline은 `dev` 변경 시 백엔드 CodeDeploy 이후 프론트 EC2 빌드·배포를 실행합니다.
  PR preview는 Vercel에서 staging 프론트의 공개 HTTPS API를 사용합니다.

배포 산출물은 `CODEBUILD_RESOLVED_SOURCE_VERSION` 커밋으로 식별합니다.
`buildspec-backend.yml`과 `buildspec-frontend.yml`은 각 artifact의 `build-metadata.txt`에
이 커밋을 기록합니다. GitHub OAuth Source가 전달하는 ZIP에는 Git 히스토리와 태그가
없으므로 빌드 중 릴리스 버전을 계산하지 않습니다.

버전 태그와 GitHub Release는 `dev` → `main` PR에 붙인 `major`·`minor`·`patch` 레이블을
보고 `.github/workflows/release-tag.yml`이 만듭니다. 운영 Pipeline은 `main` 변경을 별도로
감지하므로 태그 생성보다 먼저 시작될 수 있지만, 두 흐름 모두 같은 머지 커밋을 기준으로
합니다. 릴리스가 배포됐는지는 태그가 가리키는 커밋과 CodePipeline Source revision 또는
`build-metadata.txt`의 `commit`을 대조해 확인합니다.

`buildspec-frontend.yml`에서 Next.js 빌드 시 운영 환경을 명시합니다. 브라우저 번들의
`NEXT_PUBLIC_API_BASE_URL`은 `https://poudy.site`로 고정하고, 서버 컴포넌트와
런타임 sitemap은 systemd의 `POUDY_SERVER_API_BASE_URL=http://127.0.0.1:8081`을
사용합니다. `NEXT_PUBLIC_POSTHOG_KEY`와 `NEXT_PUBLIC_GA_MEASUREMENT_ID`처럼 값이
필요한 환경값은 저장소에 적지 말고 CodeBuild 프로젝트 환경 변수 또는 Secrets Manager
연동으로 주입합니다.

프론트엔드 secondary artifact에는 Nginx main 설정·서버 설정 템플릿과 systemd unit이
포함됩니다. 서버 설정 템플릿의 도메인은 자리표시자이고, 산출물의 `nginx/frontend-site.env`
(운영은 `deploy/config/frontend-site-production.env`, staging은 `frontend-site-staging.env`)
값으로 hook이 채웁니다. 인증서 경로·검사 호스트·검증 주소도 이 파일을 따릅니다. CodeDeploy
`ApplicationStart` 훅은 인증서 두 파일이 모두 존재할 때만 HTTPS 템플릿을 활성화하고,
그 외에는 HTTP bootstrap 템플릿을 활성화합니다. 따라서 인증서가 아직 없는 신규
인스턴스나 인증서가 제거된 인스턴스에 재배포해도 `nginx -t`가 존재하지 않는
`/etc/letsencrypt/live/poudy.site` 경로 때문에 실패하지 않습니다.
인증서 파일이 존재하면 `poudy.site`와 `www.poudy.site`가 SAN에 모두 포함됐는지도
확인합니다. apex만 포함한 기존 인증서는 활성 설정을 교체하기 전에 배포를 실패시키므로,
운영자는 먼저 같은 Certbot lineage를 두 호스트로 확장해야 합니다.

이번 Nginx 템플릿에는 `/_next/static/` 정적 자산 캐시와 정확히
`GET /api/categories`에만 적용되는 30초 캐시가 포함됩니다. 공개 cache key는 `Origin`을
포함하고 Cookie·Authorization 요청은 우회하며, 로컬 listener는 별도의 `internal:`
cache key를 사용합니다. 세 runtime sitemap은 별도의 `poudy_sitemaps` 파일 캐시에서
제품 12시간, 페이지·성분 24시간 동안 완성된 200 XML만 보관합니다. query·Host·Cookie·
Authorization·RSC 헤더는 cache variant를 만들지 않으며 만료 갱신과 일시적인 5xx에는
기존 정상 XML을 제공합니다.

브라우저에 보내는 `Cache-Control`도 Nginx가 정합니다. Next.js가 미리 렌더링한 HTML·RSC에
붙이는 `s-maxage`·`stale-while-revalidate`는 CDN용인데, 브라우저가 받으면 배포 전 빌드의
RSC 응답을 서버에 묻지 않고 꺼내 써서 지난 빌드 chunk를 실행합니다. 그래서 `s-maxage=`로
시작하는 값은 `private, no-cache`로 바꿔 보냅니다(`poudy_browser_cache_control` map).
`/_next/static/`과 공개 파일의 캐시 헤더는 성공 응답에만 붙여, 없는 chunk의 404나
재시작 중의 502가 브라우저에 남지 않게 합니다.

CodeDeploy의 `ApplicationStart` 훅은 Nginx main 설정·
server 설정·캐시 디렉터리·systemd unit을 설치하고 `nginx -t`를 통과시킨 뒤 Nginx를
먼저, Next.js를 나중에 재시작합니다. Nginx 검증 실패 시 기존 설정을 복구합니다.
Nginx를 재시작하기 전에 `poudy_sitemaps` 캐시를 비웁니다. sitemap의 화면 기준일
(`SCREEN_UPDATED_AT`)은 빌드에 들어가므로, 남겨 두면 최대 24시간 동안 이전 빌드의 lastmod가
나가고 검색 엔진 알림(Client Search Engines)도 바뀐 URL을 찾지 못합니다. 기준일이 그대로인
배포에서 비워도 다시 만든 XML의 lastmod는 같습니다. Next.js는 `BeforeInstall`에서 멈춰 있어
비운 뒤 이전 빌드가 캐시를 다시 채우지 못합니다. 데이터(`updated_at`)로 바뀌는 lastmod는
배포와 무관해 캐시 TTL만큼 늦게 나갑니다.

`ValidateService`는 실행 중인 Node MainPID 환경에서 로컬 API origin이 최종 강제됐는지,
`:8081`이 loopback에만 열렸는지 확인합니다. 이어서 가장 작은 페이지 sitemap을 한 번만
warm-up하고 query·Cookie·Authorization·RSC 헤더를 바꾼 요청이 같은 cache entry를
재사용하는지 확인합니다. 제품·성분 sitemap은 미리 만들지 않고 첫 요청 때 생성합니다.

앱은 검색 엔진 색인을 허용하는 환경(production)에서만 runtime sitemap을 제공하고 그 밖에서는
404를 돌려줍니다. 그래서 도메인 파일의 `POUDY_SITE_INDEXED`가 `true`일 때만 위 sitemap 캐시
검사를 하고, `false`(staging)이면 `/sitemap-pages.xml`이 404인지만 확인합니다.

인증서 발급 후에는 프론트 EC2에서 다음을 실행합니다.

```bash
sudo certbot certonly --webroot \
  --webroot-path /var/www/letsencrypt \
  --cert-name poudy.site \
  --domain poudy.site \
  --domain www.poudy.site \
  --expand \
  --email <운영_이메일> \
  --agree-tos \
  --no-eff-email
cd /opt/poudy/repository
sudo ./deploy/scripts/enable-frontend-https.sh
```

이후 HTTP `:80`은 ACME challenge를 제외하고 HTTPS `:443`으로 리다이렉트하며,
HTTPS 서버의 `/api/*`와 `/` 프록시 경로는 각각 기존 백엔드 사설 IP와 Next.js
standalone을 유지합니다. 같은 Nginx 프로세스의 `127.0.0.1:8081` listener는
Next.js 서버 요청만 `poudy_backend` upstream으로 전달합니다.
`www.poudy.site`의 HTTP·HTTPS 요청은 경로와 query string을 유지한 채
`https://poudy.site`로 영구 리디렉션됩니다.

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

### HTTPS의 HTTP/2 설정과 배포 검증

`deploy/nginx/ec2-frontend-https.conf`의 두 HTTPS server block은 `http2 on;`을
사용합니다. Nginx 1.25.1 이상과 `--with-http_v2_module` 지원이 필요하며,
#411에서 확인한 운영 버전은 1.30.4입니다. 이 템플릿은 운영과 staging이 함께 사용합니다.
#411에서 서버에 직접 적용했던 설정을 dev에 보존했지만 main 템플릿에는 빠져 있어
#846에서 복구했습니다. 저장소 변경 자체가 서버 적용을 뜻하지는 않습니다.
설정은 저장소 템플릿으로 관리해야 다음 프론트 배포에서도 유지됩니다.
`reconcile-nginx.sh`가 템플릿을 반영하고 `nginx -t` 실패 시 기존 설정으로 복구합니다.

HTTPS 배포의 `ValidateService`는 `verify-http2.sh`로 공개 canonical 도메인의
HTTP/2 200 응답과 별칭의 HTTP/2 301 응답을 확인합니다. 별칭은 경로와 query를
보존해야 하며, 공개 DNS와 인증서를 검증하기 위해 이 확인에는 `--resolve`와
`--insecure`를 사용하지 않습니다. HTTP/2를 지원하는 curl이 필요하고, `--http2`가
HTTP/1.1로 fallback한 경우도 실패로 처리합니다. 기존 loopback 홈 health check는
`--http1.1`로 실행해 HTTP/1.1 호환성도 확인합니다. 인증서가 없는 HTTP bootstrap은
HTTP/2 검증을 생략합니다. 실제 공개 검증은 각 프론트 호스트의 도메인으로 실행됩니다.

배포 전에 운영 호스트의 Nginx 버전과 HTTP/2 모듈, curl의 HTTP2 지원을 확인합니다.
배포 뒤 운영 홈과 제품 상세의 실제 협상 버전을 확인하고 로그인/API 동작도 점검합니다.
`proxy_http_version 1.1`은 Nginx와 upstream 사이의 설정이므로 유지합니다.

회귀 테스트는 `python3 deploy/tests/frontend-http2.test.py`로 실행합니다.
`Deploy scripts CI`도 배포 스크립트의 문법과 회귀 테스트를 실행합니다.
