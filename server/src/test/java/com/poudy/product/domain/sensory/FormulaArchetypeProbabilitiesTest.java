package com.poudy.product.domain.sensory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제형 유형 확률")
public class FormulaArchetypeProbabilitiesTest {

    @Test
    @DisplayName("모든 제형 유형의 확률을 선언 순서대로 보관한다")
    public void retainsCompleteDistributionInDeclarationOrder() {
        Map<FormulaArchetype, BigDecimal> probabilities = zeroProbabilities();
        probabilities.put(FormulaArchetype.O_W_EMULSION, new BigDecimal("0.70"));
        probabilities.put(FormulaArchetype.HYDROGEL, new BigDecimal("0.30"));

        FormulaArchetypeProbabilities distribution = new FormulaArchetypeProbabilities(probabilities);

        assertThat(distribution.values().keySet()).containsExactly(FormulaArchetype.values());
        assertThat(distribution.probabilityOf(FormulaArchetype.O_W_EMULSION))
                .isEqualByComparingTo("0.7");
        assertThat(distribution.probabilityOf(FormulaArchetype.HYDROGEL))
                .isEqualByComparingTo("0.3");
    }

    @Test
    @DisplayName("호출자가 전달한 확률 맵의 이후 변경에 영향받지 않는다")
    public void copiesDistribution() {
        Map<FormulaArchetype, BigDecimal> probabilities = zeroProbabilities();
        probabilities.put(FormulaArchetype.UNKNOWN, BigDecimal.ONE);
        FormulaArchetypeProbabilities distribution = new FormulaArchetypeProbabilities(probabilities);

        probabilities.put(FormulaArchetype.UNKNOWN, BigDecimal.ZERO);

        assertThat(distribution.probabilityOf(FormulaArchetype.UNKNOWN))
                .isEqualByComparingTo(BigDecimal.ONE);
        assertThatThrownBy(() -> distribution.values().put(FormulaArchetype.UNKNOWN, BigDecimal.ZERO))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    @DisplayName("소수 자릿수가 다른 같은 분포는 동일하다")
    public void normalizesScaleForEquality() {
        Map<FormulaArchetype, BigDecimal> first = zeroProbabilities();
        first.put(FormulaArchetype.UNKNOWN, new BigDecimal("1.000"));
        Map<FormulaArchetype, BigDecimal> second = zeroProbabilities();
        second.put(FormulaArchetype.UNKNOWN, BigDecimal.ONE);

        assertThat(new FormulaArchetypeProbabilities(first))
                .isEqualTo(new FormulaArchetypeProbabilities(second))
                .hasSameHashCodeAs(new FormulaArchetypeProbabilities(second));
    }

    @Test
    @DisplayName("제형 유형 하나라도 빠지면 거부한다")
    public void rejectsIncompleteDistribution() {
        Map<FormulaArchetype, BigDecimal> probabilities = zeroProbabilities();
        probabilities.remove(FormulaArchetype.UNKNOWN);

        assertThatThrownBy(() -> new FormulaArchetypeProbabilities(probabilities))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("모든 제형 유형의 확률이 필요합니다.");
    }

    @Test
    @DisplayName("확률이 없거나 범위를 벗어나면 거부한다")
    public void rejectsMissingOrOutOfRangeProbability() {
        Map<FormulaArchetype, BigDecimal> missing = zeroProbabilities();
        missing.put(FormulaArchetype.UNKNOWN, null);
        Map<FormulaArchetype, BigDecimal> negative = zeroProbabilities();
        negative.put(FormulaArchetype.UNKNOWN, new BigDecimal("-0.01"));
        Map<FormulaArchetype, BigDecimal> aboveOne = zeroProbabilities();
        aboveOne.put(FormulaArchetype.UNKNOWN, new BigDecimal("1.01"));

        assertThatThrownBy(() -> new FormulaArchetypeProbabilities(missing))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("제형 유형 확률은 0부터 1까지여야 합니다.");
        assertThatThrownBy(() -> new FormulaArchetypeProbabilities(negative))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("제형 유형 확률은 0부터 1까지여야 합니다.");
        assertThatThrownBy(() -> new FormulaArchetypeProbabilities(aboveOne))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("제형 유형 확률은 0부터 1까지여야 합니다.");
    }

    @Test
    @DisplayName("전체 확률의 합이 1이 아니면 거부한다")
    public void rejectsDistributionWhoseTotalIsNotOne() {
        Map<FormulaArchetype, BigDecimal> probabilities = zeroProbabilities();
        probabilities.put(FormulaArchetype.UNKNOWN, new BigDecimal("0.99"));

        assertThatThrownBy(() -> new FormulaArchetypeProbabilities(probabilities))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("제형 유형 확률 합계는 1이어야 합니다.");
    }

    @Test
    @DisplayName("확률 맵이나 조회할 제형 유형이 없으면 거부한다")
    public void rejectsMissingDistributionOrLookupArchetype() {
        assertThatThrownBy(() -> new FormulaArchetypeProbabilities(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("모든 제형 유형의 확률이 필요합니다.");

        FormulaArchetypeProbabilities distribution = unknownOnlyDistribution();
        assertThatThrownBy(() -> distribution.probabilityOf(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessage("제형 유형이 필요합니다.");
    }

    private static FormulaArchetypeProbabilities unknownOnlyDistribution() {
        Map<FormulaArchetype, BigDecimal> probabilities = zeroProbabilities();
        probabilities.put(FormulaArchetype.UNKNOWN, BigDecimal.ONE);
        return new FormulaArchetypeProbabilities(probabilities);
    }

    private static Map<FormulaArchetype, BigDecimal> zeroProbabilities() {
        EnumMap<FormulaArchetype, BigDecimal> probabilities = new EnumMap<>(FormulaArchetype.class);
        for (FormulaArchetype archetype : FormulaArchetype.values()) {
            probabilities.put(archetype, BigDecimal.ZERO);
        }
        return probabilities;
    }
}
