package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("단위 가격 비교")
class UnitPriceTest {

    @Test
    @DisplayName("총액이 더 비싸도 용량당 저렴하면 저렴으로 판정한다")
    void comparesUnitPriceInsteadOfTotalPrice() {
        UnitPrice base = price(1000, "100", "ml");
        UnitPrice candidate = price(2000, "400", "mL");

        assertThat(candidate.roundedAmount()).isEqualByComparingTo("5");
        assertThat(candidate.comparisonWith(base)).isEqualTo(UnitPriceComparison.CHEAPER);
        assertThat(candidate.differencePercentFrom(base)).isEqualByComparingTo("-50");
    }

    @Test
    @DisplayName("반올림 금액과 비율이 같아도 원래 단가로 순서와 가격 관계를 판정한다")
    void comparesBeforeRounding() {
        UnitPrice base = price(100000, "10000", "ml");
        UnitPrice candidate = price(100001, "10000", "ml");

        assertThat(candidate.roundedAmount()).isEqualByComparingTo(base.roundedAmount());
        assertThat(candidate.differencePercentFrom(base)).isEqualByComparingTo("0");
        assertThat(candidate.comparisonWith(base)).isEqualTo(UnitPriceComparison.MORE_EXPENSIVE);
        assertThat(candidate.compareAsAlternativeTo(base, base)).isPositive();
    }

    @Test
    @DisplayName("순환 소수의 단가도 나눗셈 오차 없이 같은 가격으로 판정한다")
    void comparesEqualFractions() {
        UnitPrice base = price(1, "3", "ml");
        UnitPrice candidate = price(2, "6", "ml");

        assertThat(candidate.comparisonWith(base)).isEqualTo(UnitPriceComparison.SAME);
        assertThat(candidate.differencePercentFrom(base)).isEqualByComparingTo("0");
        assertThat(candidate.compareAsAlternativeTo(base, base)).isZero();
    }

    @Test
    @DisplayName("단위가 다르거나 용량이 0이면 비교하지 않고 정상 후보 뒤에 둔다")
    void movesIncomparablePricesAfterComparablePrices() {
        UnitPrice base = price(1000, "100", "ml");
        UnitPrice unknownVolume = price(1, "0", "ml");
        UnitPrice differentUnit = price(1, "100", "g");

        assertThat(unknownVolume.roundedAmount()).isNull();
        assertThat(unknownVolume.comparisonWith(base)).isEqualTo(UnitPriceComparison.UNAVAILABLE);
        assertThat(differentUnit.comparisonWith(base)).isEqualTo(UnitPriceComparison.UNAVAILABLE);
        assertThat(differentUnit.differencePercentFrom(base)).isNull();
        assertThat(unknownVolume.differencePercentFrom(base)).isNull();
        assertThat(differentUnit.compareAsAlternativeTo(base, base)).isPositive();
        assertThat(unknownVolume.compareAsAlternativeTo(base, base)).isPositive();
        assertThat(differentUnit.compareAsAlternativeTo(unknownVolume, base)).isZero();
    }

    @Test
    @DisplayName("기준 용량을 모르면 모든 후보의 유사도 순서를 보존한다")
    void preservesOrderWhenBaseVolumeIsUnknown() {
        UnitPrice base = price(1000, "0", "ml");
        UnitPrice first = price(2000, "100", "ml");
        UnitPrice second = price(1000, "100", "ml");

        assertThat(first.comparisonWith(base)).isEqualTo(UnitPriceComparison.UNAVAILABLE);
        assertThat(first.differencePercentFrom(base)).isNull();
        assertThat(first.compareAsAlternativeTo(second, base)).isZero();
    }

    @Test
    @DisplayName("기준 가격 0은 비율만 계산하지 않고 무료 후보는 100% 저렴으로 계산한다")
    void handlesZeroPrices() {
        UnitPrice free = price(0, "100", "ml");
        UnitPrice paid = price(1000, "100", "ml");

        assertThat(paid.comparisonWith(free)).isEqualTo(UnitPriceComparison.MORE_EXPENSIVE);
        assertThat(paid.differencePercentFrom(free)).isNull();
        assertThat(free.comparisonWith(paid)).isEqualTo(UnitPriceComparison.CHEAPER);
        assertThat(free.differencePercentFrom(paid)).isEqualByComparingTo("-100");
        assertThat(free.comparisonWith(free)).isEqualTo(UnitPriceComparison.SAME);
        assertThat(free.differencePercentFrom(free)).isNull();
    }

    @Test
    @DisplayName("큰 가격과 작은 용량도 정수 곱셈 오버플로 없이 비교한다")
    void comparesLargePricesWithoutOverflow() {
        UnitPrice base = price(Long.MAX_VALUE, "0.01", "ml");
        UnitPrice candidate = price(Long.MAX_VALUE - 1, "0.01", "ml");

        assertThat(candidate.roundedAmount()).isGreaterThan(BigDecimal.valueOf(Long.MAX_VALUE));
        assertThat(candidate.comparisonWith(base)).isEqualTo(UnitPriceComparison.CHEAPER);
        assertThat(candidate.compareAsAlternativeTo(base, base)).isNegative();
    }

    private static UnitPrice price(long amount, String volume, String unit) {
        return new ProductVariant(1L, amount, new BigDecimal(volume), unit, "active").unitPrice();
    }
}
