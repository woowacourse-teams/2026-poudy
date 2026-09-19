package com.poudy.productview.domain;

import java.time.LocalDate;

public record ViewPeriod(LocalDate firstDate, LocalDate lastDate) {

    private static final LocalDate EARLIEST_DATE = LocalDate.EPOCH;

    public static ViewPeriod recentDays(LocalDate today, int days) {
        if (days <= 0) {
            throw new IllegalArgumentException("조회 기간은 양수여야 합니다.");
        }
        LocalDate firstDate = today.minusDays(days - 1L);
        if (firstDate.isBefore(EARLIEST_DATE)) {
            return new ViewPeriod(EARLIEST_DATE, today);
        }
        return new ViewPeriod(firstDate, today);
    }
}
