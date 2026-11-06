package com.poudy.product.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;

public final class UnitPrice {

    private final BigDecimal price;
    private final BigDecimal volume;
    private final String unit;

    UnitPrice(long price, BigDecimal volume, String unit) {
        this.price = BigDecimal.valueOf(price);
        this.volume = volume;
        this.unit = unit.strip().toLowerCase(Locale.ROOT);
    }

    public BigDecimal roundedAmount() {
        if (volume.signum() == 0) {
            return null;
        }
        return price.divide(volume, 0, RoundingMode.HALF_UP);
    }

    public UnitPriceComparison comparisonWith(UnitPrice base) {
        if (!isComparableTo(base)) {
            return UnitPriceComparison.UNAVAILABLE;
        }
        int difference = compareAmountTo(base);
        if (difference < 0) {
            return UnitPriceComparison.CHEAPER;
        }
        if (difference > 0) {
            return UnitPriceComparison.MORE_EXPENSIVE;
        }
        return UnitPriceComparison.SAME;
    }

    public BigDecimal differencePercentFrom(UnitPrice base) {
        if (!isComparableTo(base) || base.price.signum() == 0) {
            return null;
        }
        BigDecimal denominator = base.price.multiply(volume);
        return price.multiply(base.volume).subtract(denominator)
            .multiply(BigDecimal.valueOf(100))
            .divide(denominator, 2, RoundingMode.HALF_UP);
    }

    public int compareAsAlternativeTo(UnitPrice other, UnitPrice base) {
        boolean comparable = isComparableTo(base);
        boolean otherComparable = other.isComparableTo(base);
        if (comparable != otherComparable) {
            return comparable ? -1 : 1;
        }
        return comparable ? compareAmountTo(other) : 0;
    }

    private boolean isComparableTo(UnitPrice other) {
        return volume.signum() > 0 && other.volume.signum() > 0 && unit.equals(other.unit);
    }

    private int compareAmountTo(UnitPrice other) {
        return price.multiply(other.volume).compareTo(other.price.multiply(volume));
    }
}
