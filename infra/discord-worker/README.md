# Discord Worker

GitHub Webhook 이벤트를 이벤트별 Discord 채널로 전달하는 Cloudflare Worker입니다.

## GitHub Actions 설정

저장소 Secret에 아래 값을 등록합니다.

- `CLOUDFLARE_API_TOKEN`: Workers Scripts 편집 권한이 있는 Cloudflare API Token
- `CLOUDFLARE_ACCOUNT_ID`: Worker가 속한 Cloudflare Account ID

기존 Worker 이름이 `poudy-discord-worker`와 다르면 저장소 Variable
`CLOUDFLARE_WORKER_NAME`에 실제 이름을 등록합니다.

## Cloudflare Worker Secret

아래 Secret은 Cloudflare Dashboard에 등록하며 GitHub Actions에 복사하지 않습니다.
`keep_vars = true`로 배포 시 Dashboard의 기존 값이 유지됩니다.

- `GITHUB_WEBHOOK_SECRET`
- `DISCORD_WEBHOOK_ISSUE_UPDATE`
- `DISCORD_WEBHOOK_PR_UPDATE`
- `DISCORD_WEBHOOK_STAGING_CICD`
- `DISCORD_WEBHOOK_PRODUCTION_CICD`
- `DISCORD_WEBHOOK_WIKI_UPDATE`

## 로컬 검증

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run check
pnpm run deploy:dry-run
```
