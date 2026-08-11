# Discord Worker

GitHub Webhook 이벤트를 이벤트별 Discord 채널로 전달하는 Cloudflare Worker입니다.

## GitHub Actions 설정

저장소 Secret에 아래 값을 등록합니다.

- `CLOUDFLARE_API_TOKEN`: Workers Scripts 편집 권한이 있는 Cloudflare API Token
- `CLOUDFLARE_ACCOUNT_ID`: Worker가 속한 Cloudflare Account ID

기존 Worker 이름이 `poudy-discord-worker`와 다르면 저장소 Variable
`CLOUDFLARE_WORKER_NAME`에 실제 이름을 등록합니다.

`infra/discord-worker/**`를 건드리는 Pull Request에서는 의존성 취약점 점검, 테스트,
정적 검사, Worker 번들 생성만 수행합니다.

**배포는 `dev`에 머지될 때 자동으로 이뤄집니다.** 같은 검사를 모두 통과한 뒤에만
배포 단계가 실행됩니다. 특정 시점의 코드를 다시 배포하려면 `Discord Worker Deploy`
워크플로를 수동 실행(`workflow_dispatch`)합니다.

## Cloudflare Worker Secret

아래 Secret은 Cloudflare Dashboard에 등록하며 GitHub Actions에 복사하지 않습니다.
Secret은 배포 후에도 유지되며, `keep_vars = true`로 Dashboard에서 등록한 일반
환경 변수도 유지합니다.

- `GITHUB_WEBHOOK_SECRET`
- `GITHUB_API_TOKEN` (선택)
- `DISCORD_WEBHOOK_ISSUE_UPDATE`
- `DISCORD_WEBHOOK_PR_UPDATE`
- `DISCORD_WEBHOOK_STAGING_CICD`
- `DISCORD_WEBHOOK_PRODUCTION_CICD`
- `DISCORD_WEBHOOK_WIKI_UPDATE`

### `GITHUB_API_TOKEN`

CI/CD 알림에 **PR 링크와 단계 진행 상황**을 넣기 위한 Fine-grained PAT입니다.
없으면 두 항목만 빠지고 나머지 알림은 그대로 동작하므로 필수는 아닙니다.

`workflow_run` 페이로드의 `pull_requests` 배열은 **같은 저장소에 올린 PR만** 채워집니다.
이 경우에는 토큰 없이도 PR 번호를 알 수 있어 링크를 바로 만듭니다.

| PR 방식 | PR 링크 | 단계 진행 상황 |
| --- | --- | --- |
| 같은 저장소 브랜치에서 올린 PR | 토큰 없이 표시 | 토큰 필요 |
| fork에서 올린 PR | 토큰 필요 | 토큰 필요 |

fork PR은 배열이 비어 있어, 커밋이 실제로 있는 `head_repository`를
`GET /repos/{head_repository}/commits/{head_sha}/pulls`로 조회해 PR을 되짚습니다.
워크플로가 도는 저장소로 조회하면 fork PR은 빈 배열이 돌아옵니다.
단계 수는 `jobs_url`로 조회합니다.

**이 저장소는 fork에서 PR을 올리는 방식이므로 PR 링크를 보려면 토큰이 필요합니다.**
저장소가 공개여도 위 두 응답은 인증 없이는 비어서 돌아옵니다.
[Fine-grained PAT](https://github.com/settings/personal-access-tokens)을 아래 권한으로 발급합니다.

- Resource owner: `woowacourse-teams`, 대상 저장소: `2026-poudy`와 각자의 fork
- Repository permissions: `Contents: Read`, `Pull requests: Read`, `Actions: Read`

조직 설정에 따라 발급 후 조직 관리자의 승인이 필요할 수 있습니다. 승인 전에는 조회가
실패하지만 알림은 계속 전송됩니다. 토큰 만료일이 지나도 마찬가지이므로,
PR 링크가 사라지면 토큰 만료를 먼저 확인합니다.

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
다만 `200`이 Discord 전송 성공을 보장하지는 않습니다. 아래 "응답 코드"를 참고합니다.

## 채널 라우팅

| 이벤트 | 대상 Secret |
| --- | --- |
| `pull_request`, `pull_request_review` | `DISCORD_WEBHOOK_PR_UPDATE` |
| `issue_comment` | PR에 달린 댓글이면 `..._PR_UPDATE`, 아니면 `..._ISSUE_UPDATE` |
| `issues`, `discussion`, `discussion_comment` | `DISCORD_WEBHOOK_ISSUE_UPDATE` |
| `gollum` | `DISCORD_WEBHOOK_WIKI_UPDATE` |
| `workflow_run`, `deployment_status` | 아래 기준에 따라 staging 또는 production |

CI/CD 이벤트는 **머지 대상 브랜치**를 기준으로 채널을 정합니다.

- `workflow_run`: PR에서 실행된 워크플로는 항상 staging으로 보냅니다. 그 밖에는
  연결된 PR의 base 브랜치를, 없으면 `head_branch`를 기준으로 삼습니다.
- `deployment_status`: `deployment.environment`를, 비어 있으면 `deployment.ref`를 기준으로 삼습니다.

기준 이름은 대소문자를 구분하지 않으며 아래와 같이 판정합니다.

- `main`, `master` 또는 `production`·`prod`으로 시작 → `DISCORD_WEBHOOK_PRODUCTION_CICD`
- `staging`·`stage`·`dev`·`develop`·`development`로 시작 → `DISCORD_WEBHOOK_STAGING_CICD`

접두사는 이름 전체이거나 뒤에 `-`, `_`, `/`가 와야 합니다. 따라서 `prod-kr`은 production으로
가지만 `reproduction`이나 `devops`는 어느 쪽에도 해당하지 않아 알림을 보내지 않습니다.

어느 쪽에도 해당하지 않으면 알림을 보내지 않고 `200`으로 응답합니다. 이 저장소의 CI/CD가
`dev`와 `main` 머지에서만 실행되기 때문에 문제가 되지 않습니다. 다른 브랜치에서도 CI/CD를
돌리게 되면 그 브랜치 이름을 `cicdWebhookKey`의 판정 규칙에 추가해야 합니다.

알림을 보내지 않는 액션도 있습니다. Draft 상태로 열린 PR, 승인이 아닌 리뷰,
`created`가 아닌 이슈 댓글, 봇이 작성한 댓글, 완료되지 않은 워크플로가 여기 해당하며
모두 `200`으로 응답하고 넘어갑니다.

## 응답 코드

GitHub Webhook은 2xx가 아닌 응답을 실패로 기록하고 재전송합니다. 그래서 이 Worker는
**재시도로 해결될 수 있는 실패에만 5xx를 반환**합니다.

| 상황 | 응답 | 이유 |
| --- | --- | --- |
| 전송 성공 | 200 | |
| 알림 대상이 아닌 이벤트·액션 | 200 | 무시한 것이므로 실패가 아닙니다. |
| Discord 레이트 리밋 (429) | 200 | 재전송해도 다시 429이며, 재시도가 한도를 더 밀어붙입니다. |
| Discord Webhook URL 형식 오류 | 200 | 설정 오류라 재시도로 고쳐지지 않습니다. |
| Discord 5xx·네트워크 오류·타임아웃 | 502 | 일시적 장애이므로 재시도할 가치가 있습니다. |
| 서명 불일치 | 401 | |
| JSON 또는 페이로드 형식 오류 | 400 | |
| `GITHUB_WEBHOOK_SECRET` 또는 대상 Discord Webhook 미등록 | 500 | 설정을 채우면 재시도가 성공합니다. |

레이트 리밋과 URL 형식 오류는 200을 반환하므로 **Recent Deliveries에는 성공으로 표시됩니다.**
이 두 경우는 아래처럼 Worker 로그로 확인합니다.

```bash
npx wrangler tail poudy-discord-worker
```

```
Discord rate limited: DISCORD_WEBHOOK_PR_UPDATE 3.5
Invalid Discord webhook URL: DISCORD_WEBHOOK_ISSUE_UPDATE
```

레이트 리밋 로그의 마지막 숫자는 Discord가 `Retry-After` 헤더로 알려준 대기 시간(초)입니다.
자동 재시도는 하지 않습니다. Worker가 응답을 붙잡고 기다리면 GitHub Webhook의 전송 타임아웃에
걸리기 때문입니다. 이 로그가 자주 보이면 알림 대상 이벤트를 줄이거나 채널을 분리합니다.

`wrangler.toml`의 `[observability]`가 켜져 있어 Cloudflare Dashboard의 Workers 로그에서도
같은 내용을 확인할 수 있습니다.

## 로컬 검증

`infra/discord-worker`에서 아래 명령을 실행합니다. CI가 수행하는 검사와 같은 순서입니다.

```bash
pnpm install --frozen-lockfile
pnpm audit --prod
pnpm test
pnpm run check
pnpm run deploy:dry-run
```

`pnpm run check`는 타입 검사와 Biome 린트를 함께 실행합니다. 포매팅만 자동으로 고치려면
`pnpm run format`을 실행합니다.
