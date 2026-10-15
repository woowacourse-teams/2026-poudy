package com.poudy.shelf.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분 의심 근거")
class SuspectEvidenceTest {

    @Test
    @DisplayName("안 맞은 제품에 든 비율에서 잘 맞은 제품에 든 비율을 양쪽에 1개씩 더해 뺀다")
    void scoresWithSmoothedRates() {
        assertThat(new SuspectEvidence(2, 2, 0, 3).baseScore()).isEqualTo(0.75 - 0.2);
        assertThat(new SuspectEvidence(2, 2, 1, 3).baseScore()).isEqualTo(0.75 - 0.4);
        assertThat(new SuspectEvidence(1, 1, 0, 0).baseScore()).isEqualTo(2.0 / 3 - 0.5);
    }

    @Test
    @DisplayName("잘 맞은 제품에 들어 있고 점수가 0 이하일 때만 상쇄된다")
    void isOffsetOnlyWhenSuitedProductsContainIt() {
        assertThat(new SuspectEvidence(2, 2, 3, 3).isOffsetBySuitedProducts()).isTrue();
        assertThat(new SuspectEvidence(2, 2, 2, 3).isOffsetBySuitedProducts()).isFalse();
        assertThat(new SuspectEvidence(2, 4, 0, 0).baseScore()).isZero();
        assertThat(new SuspectEvidence(2, 4, 0, 0).isOffsetBySuitedProducts()).isFalse();
    }

}
