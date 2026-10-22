package com.poudy.shelf.domain;

public final class SuspectEvidence {

    private final int unsuitedCount;
    private final int unsuitedTotal;
    private final int suitedCount;
    private final int suitedTotal;

    public SuspectEvidence(int unsuitedCount, int unsuitedTotal, int suitedCount, int suitedTotal) {
        this.unsuitedCount = unsuitedCount;
        this.unsuitedTotal = unsuitedTotal;
        this.suitedCount = suitedCount;
        this.suitedTotal = suitedTotal;
    }

    // 제품이 적을 때 평가 하나로 비율이 0이나 1로 쏠리지 않게 양쪽에 1개씩 더해 계산한다.
    public double baseScore() {
        return rate(unsuitedCount, unsuitedTotal) - rate(suitedCount, suitedTotal);
    }

    public boolean isOffsetBySuitedProducts() {
        return suitedCount > 0 && baseScore() <= 0;
    }

    private static double rate(int count, int total) {
        return (count + 1.0) / (total + 2.0);
    }
}
