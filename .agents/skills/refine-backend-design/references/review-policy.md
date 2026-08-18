# 설계 리뷰 정책

설계에는 단일 정답이 없음을 전제로 한다. `correct/incorrect`나 SOLID 점수를 사용하지 않고,
현재 코드가 만드는 비용과 제안의 trade-off를 보고한다.

## Improvement 인정 조건

다음을 모두 입증할 때만 improvement로 보고한다.

1. 현재 구조와 책임 분포를 구체적인 코드 위치와 호출 관계로 보여 줄 수 있다.
2. 현재 요구 또는 근거 있는 변경 시나리오에서 발생하는 비용을 설명할 수 있다.
3. 제안한 책임·경계가 그 비용을 줄이는 경로를 설명할 수 있다.
4. 새 구조가 추가하는 개념, 결합 또는 마이그레이션 비용을 함께 설명할 수 있다.
5. 현재 범위에서 수행 가능한 일관된 개선 단위를 제시할 수 있다.

`SRP 위반`, `클린하지 않음`, `패턴을 쓰면 좋음`, `확장성이 낮음`처럼 원칙 이름이나 결론만
있는 의견은 제외한다. 추측뿐인 미래 요구, 개인적 명명 취향, 포맷, 정적 도구가 결정할 문제,
동작 결함과 보안 finding을 설계 improvement로 보고하지 않는다.

Confidence는 다음처럼 사용한다.

- `high`: 책임, 변경 시나리오와 비용이 현재 코드·테스트·규칙으로 직접 확인된다.
- `medium`: 구조와 비용은 확인되지만 제품 의도나 최적 대안에 한 가지 중요한 불확실성이 있다.

낮은 확신의 후보는 priority를 낮추지 말고 제외하거나 확인할 질문으로 남긴다.

## 출력 형식

가치가 큰 improvement부터 작성한다. 각 improvement는 한 가지 책임 또는 경계 재구성만 다룬다.

```markdown
## Design reading

- 현재 코드가 표현하는 책임, 불변식, 협력과 의존성 방향

## High-leverage improvements

### High leverage | Worthwhile — 제목

- Evidence: 코드 위치와 관련 호출 관계
- Design friction: 구체적인 변경·이해·테스트 비용
- Recommended shape: 책임과 경계의 제안 형태
- Trade-off: 추가 복잡성 또는 마이그레이션 비용
- Confidence: high | medium

## What should remain unchanged

- 현재 구조가 요구에 맞고 유지해야 하는 이유

## Assessment

- 가장 큰 설계 강점
- 다음 개선 우선순위 또는 `No justified design improvements.`
- Verification performed와 중요한 미검증 범위
```

High leverage 항목이 없으면 섹션에 없다고 명시한다. 잘 설계된 부분을 반드시 원본 근거와 함께
남겨, 개선점을 만들기 위해 타당한 구조를 해체하지 않도록 한다.
