package com.poudy.product.domain;

import java.time.LocalDate;
import java.util.Objects;

public final class ViewPeriod {

    private static final LocalDate EARLIEST_DATE = LocalDate.EPOCH;

    private final LocalDate firstDate;
    private final LocalDate lastDate;

    private ViewPeriod(LocalDate firstDate, LocalDate lastDate) {
        this.firstDate = firstDate;
        this.lastDate = lastDate;
    }

    public static ViewPeriod recentDays(LocalDate today, int days) {
        Objects.requireNonNull(today, "기준 날짜가 필요합니다.");
        if (days <= 0) {
            throw new IllegalArgumentException("조회 기간은 양수여야 합니다.");
        }
        LocalDate firstDate = today.minusDays(days - 1L);
        if (firstDate.isBefore(EARLIEST_DATE)) {
            return new ViewPeriod(EARLIEST_DATE, today);
        }
        return new ViewPeriod(firstDate, today);
    }

    public LocalDate firstDate() {
        return firstDate;
    }

    public LocalDate lastDate() {
        return lastDate;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof ViewPeriod that)) {
            return false;
        }
        return firstDate.equals(that.firstDate) && lastDate.equals(that.lastDate);
    }

    @Override
    public int hashCode() {
        return Objects.hash(firstDate, lastDate);
    }
}
