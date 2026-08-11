# Discord Worker

GitHub Webhook 이벤트를 이벤트별 Discord 채널로 전달하는 Cloudflare Worker입니다.

## GitHub Actions 설정

저장소 Secret에 아래 값을 등록합니다.

- `CLOUDFLARE_API_TOKEN`: Workers Scripts 편집 권한이 있는 Cloudflare API Token
- `CLOUDFLARE_ACCOUNT_ID`: Worker가 속한 Cloudflare Account ID

기존 Worker 이름이 `poudy-discord-worker`와 다르면 저장소 Variable
`CLOUDFLARE_WORKER_NAME`에 실제 이름을 등록합니다.

Pull Request와 `dev` push에서는 테스트, 정적 검사, Worker 번들 생성만 수행합니다.
운영 배포는 `main` 브랜치에서 `Discord Worker Deploy` 워크플로를 수동 실행합니다.

## Cloudflare Worker Secret

아래 Secret은 Cloudflare Dashboard에 등록하며 GitHub Actions에 복사하지 않습니다.
Secret은 배포 후에도 유지되며, `keep_vars = true`로 Dashboard에서 등록한 일반
환경 변수도 유지합니다.

- `GITHUB_WEBHOOK_SECRET`
- `DISCORD_WEBHOOK_ISSUE_UPDATE`
- `DISCORD_WEBHOOK_PR_UPDATE`
- `DISCORD_WEBHOOK_STAGING_CICD`
- `DISCORD_WEBHOOK_PRODUCTION_CICD`
- `DISCORD_WEBHOOK_WIKI_UPDATE`

## GitHub Webhook 설정

GitHub 저장소의 `Settings > Webhooks > Add webhook`에서 아래와 같이 등록합니다.

- Payload URL: 배포된 Worker의 `workers.dev` URL
- Content type: `application/json`
- Secret: Cloudflare의 `GITHUB_WEBHOOK_SECRET`과 동일한 충분히 긴 임의 문자열
- SSL verification: 활성화

개별 이벤트 선택에서 아래 이벤트를 활성화합니다.

- Pull requests
- Pull request reviews
- Issues
- Issue comments
- Discussions
- Discussion comments
- Wiki
- Workflow runs
- Deployment statuses

등록 후 Webhook의 Recent Deliveries에서 응답 상태가 `200`인지 확인합니다.

## 로컬 검증

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run check
pnpm run deploy:dry-run
```
