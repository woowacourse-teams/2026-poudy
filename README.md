# poudy

| 디렉터리         | 내용                                    |
| ---------------- | --------------------------------------- |
| [server](server) | Spring Boot 백엔드                      |
| [client](client) | Next.js 프론트엔드                      |
| common           | 백엔드에서 생성한 API 타입과 zod 스키마 |

Client 개발 환경과 실행 방법은 [client/README.md](client/README.md)를 참고하세요.

## 클론 후 1회

```bash
./setup-git.sh
```

Git 훅과 커밋 메시지 템플릿을 등록합니다. 모든 팀원이 실행합니다.

Windows 는 Git Bash 에서 실행합니다. cmd 와 PowerShell 은 `.sh` 를 실행하지 못하고 오류도 남기지 않습니다.

## 커밋 규칙

[AGENTS.md](AGENTS.md) 를 따릅니다.

## API 타입

`common/api.d.ts` 는 백엔드에서 생성합니다. 프론트엔드는 그대로 import 합니다. 생성 방법은 [server/README.md](server/README.md) 를 참고하세요.
