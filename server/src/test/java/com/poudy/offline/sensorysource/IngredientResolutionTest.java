package com.poudy.offline.sensorysource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분 identity 해석 결과")
class IngredientResolutionTest {

    @Test
    @DisplayName("해결된 성분은 canonical ID와 일치 규칙 및 resolver 버전을 보존한다")
    void keepsResolvedIdentityProvenance() {
        IngredientResolution.Resolved resolved = new IngredientResolution.Resolved(
                42L,
                "NORMALIZED_ALIAS_EXACT",
                "resolver-v1");

        assertThat(resolved.canonicalIngredientId()).isEqualTo(42L);
        assertThat(resolved.matchRule()).isEqualTo("NORMALIZED_ALIAS_EXACT");
        assertThat(resolved.resolverVersion()).isEqualTo("resolver-v1");
    }

    @Test
    @DisplayName("모호한 후보는 자동 선택하지 않고 결정적인 순서로 모두 보존한다")
    void keepsAllAmbiguousCandidates() {
        List<Long> candidates = new ArrayList<>(List.of(30L, 10L, 20L));

        IngredientResolution.Ambiguous ambiguous = new IngredientResolution.Ambiguous(
                candidates,
                "정규화 이름이 여러 성분과 일치",
                "resolver-v1");
        candidates.clear();

        assertThat(ambiguous.candidateIngredientIds()).containsExactly(10L, 20L, 30L);
        assertThatThrownBy(() -> ambiguous.candidateIngredientIds().add(40L))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    @DisplayName("모호한 해석에는 서로 다른 양수 후보가 둘 이상 필요하다")
    void validatesAmbiguousCandidates() {
        assertThatThrownBy(
                () -> new IngredientResolution.Ambiguous(
                        List.of(10L),
                        "후보 부족",
                        "resolver-v1"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new IngredientResolution.Ambiguous(
                        List.of(10L, 10L),
                        "중복 후보",
                        "resolver-v1"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new IngredientResolution.Ambiguous(
                        List.of(10L, 0L),
                        "잘못된 후보",
                        "resolver-v1"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new IngredientResolution.Ambiguous(
                        Arrays.asList(10L, null),
                        "null 후보",
                        "resolver-v1"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("모든 해석 결과에는 nonblank resolver 버전이 필요하다")
    void requiresResolverVersion() {
        assertThatThrownBy(() -> new IngredientResolution.Resolved(1L, "DIRECT", " "))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new IngredientResolution.Unresolved("찾을 수 없음", null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
