package com.poudy.productview.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("조회 기간")
class ViewPeriodTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 12);

    @Test
    @DisplayName("오늘을 포함해 최근 날짜 수만큼의 기간을 만든다")
    void coversRecentDaysIncludingToday() {
        assertThat(ViewPeriod.recentDays(TODAY, 1)).isEqualTo(new ViewPeriod(TODAY, TODAY));
        assertThat(ViewPeriod.recentDays(TODAY, 7)).isEqualTo(new ViewPeriod(LocalDate.of(2026, 9, 6), TODAY));
    }

    @Test
    @DisplayName("아주 긴 기간은 기록 시작 전 날짜에서 멈춘다")
    void clampsVeryLongPeriod() {
        assertThat(ViewPeriod.recentDays(TODAY, Integer.MAX_VALUE)).isEqualTo(new ViewPeriod(LocalDate.EPOCH, TODAY));
    }

    @Test
    @DisplayName("양수가 아닌 날짜 수는 거부한다")
    void rejectsNonPositiveDays() {
        assertThatIllegalArgumentException().isThrownBy(() -> ViewPeriod.recentDays(TODAY, 0));
        assertThatIllegalArgumentException().isThrownBy(() -> ViewPeriod.recentDays(TODAY, -1));
    }
}
