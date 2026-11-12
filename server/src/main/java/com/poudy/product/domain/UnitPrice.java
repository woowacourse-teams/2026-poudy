package com.poudy.product.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;

public final class UnitPrice {

    private final BigDecimal price;
    private final BigDecimal volume;
    private final String unit;

    UnitPrice(Long price, BigDecimal volume, String unit) {
        this.price = toAmount(price);
        this.volume = volume;
        this.unit = unit.strip().toLowerCase(Locale.ROOT);
    }

    private static BigDecimal toAmount(Long price) {
        if (price == null) {
            return null;
        }
        return BigDecimal.valueOf(price);
    }

    public BigDecimal roundedAmount() {
        if (price == null || volume.signum() == 0) {
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
        boolean comparable = isRankableAgainst(base);
        boolean otherComparable = other.isRankableAgainst(base);
        if (comparable != otherComparable) {
            if (comparable) {
                return -1;
            }
            return 1;
        }
        if (comparable) {
            return compareAmountTo(other);
        }
        return 0;
    }

    private boolean isComparableTo(UnitPrice other) {
        return price != null && other.price != null && hasSameUnitAs(other);
    }

    private boolean isRankableAgainst(UnitPrice base) {
        return price != null && hasSameUnitAs(base);
    }

    private boolean hasSameUnitAs(UnitPrice other) {
        return volume.signum() > 0 && other.volume.signum() > 0 && unit.equals(other.unit);
    }

    private int compareAmountTo(UnitPrice other) {
        return price.multiply(other.volume).compareTo(other.price.multiply(volume));
    }
}
