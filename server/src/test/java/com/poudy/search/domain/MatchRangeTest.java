package com.poudy.search.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("검색 일치 범위")
class MatchRangeTest {

    @Test
    @DisplayName("원문 중간이나 마지막 글자까지의 범위는 원문 안에 포함된다")
    void acceptsRangesWithinTextIncludingTheEnd() {
        assertThat(new MatchRange(1, 3).isWithin("글리세린")).isTrue();
        assertThat(new MatchRange(0, 4).isWithin("글리세린")).isTrue();
    }

    @Test
    @DisplayName("원문을 넘어가거나 빈 원문에 놓인 범위는 포함되지 않는다")
    void rejectsRangesBeyondText() {
        assertThat(new MatchRange(0, 5).isWithin("글리세린")).isFalse();
        assertThat(new MatchRange(0, 1).isWithin("")).isFalse();
    }

    @Test
    @DisplayName("보조 문자가 있어도 UTF-16 구간으로 원문 포함 여부를 판단한다")
    void usesUtf16TextBounds() {
        assertThat(new MatchRange(2, 4).isWithin("😀글리")).isTrue();
        assertThat(new MatchRange(2, 5).isWithin("😀글리")).isFalse();
    }
}
