package com.poudy.shelf.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분 의심 근거")
class SuspectEvidenceTest {

    @Test
    @DisplayName("안 맞은 제품에 든 비율에서 잘 맞은 제품에 든 비율을 양쪽에 1개씩 더해 뺀다")
    void scoresWithSmoothedRates() {
        assertThat(new SuspectEvidence(2, 2, 0, 3, 3).baseScore()).isEqualTo(0.75 - 0.2);
        assertThat(new SuspectEvidence(2, 2, 1, 3, 3).baseScore()).isEqualTo(0.75 - 0.4);
        assertThat(new SuspectEvidence(1, 1, 0, 0, 0).baseScore()).isEqualTo(2.0 / 3 - 0.5);
        assertThat(new SuspectEvidence(2, 2, 0, 3, 5).baseScore())
            .isEqualTo(new SuspectEvidence(2, 2, 0, 5, 5).baseScore());
    }

    @Test
    @DisplayName("잘 맞은 제품에 든 비율이 안 맞은 제품에 든 비율 이상일 때만 상쇄된다")
    void isOffsetWhenSuitedRateReachesUnsuitedRate() {
        assertThat(new SuspectEvidence(2, 2, 3, 3, 3).isOffsetBySuitedProducts()).isTrue();
        assertThat(new SuspectEvidence(1, 2, 1, 1, 1).isOffsetBySuitedProducts()).isTrue();
        assertThat(new SuspectEvidence(2, 2, 1, 1, 1).isOffsetBySuitedProducts()).isFalse();
        assertThat(new SuspectEvidence(5, 5, 1, 1, 1).isOffsetBySuitedProducts()).isFalse();
        assertThat(new SuspectEvidence(2, 4, 0, 0, 0).isOffsetBySuitedProducts()).isFalse();
        assertThat(new SuspectEvidence(2, 2, 1, 1, 5).isOffsetBySuitedProducts()).isFalse();
        assertThat(new SuspectEvidence(1, 2, 1, 1, 5).isOffsetBySuitedProducts()).isTrue();
    }

}
