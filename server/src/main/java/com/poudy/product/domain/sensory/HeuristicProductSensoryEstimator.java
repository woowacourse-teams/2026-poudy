package com.poudy.product.domain.sensory;

import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.tag.domain.FormulationRole;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class HeuristicProductSensoryEstimator implements ProductSensoryEstimator {

    public static final String INGREDIENT_PROFILE_VERSION = "ingredient-role-profile-v0.1";
    public static final String CATEGORY_PRIOR_VERSION = "category-sensory-prior-v0.1";
    public static final String LEVEL_MODEL_VERSION = "ordinal-level-model-v0.1";
    public static final String ASSESSMENT_PROTOCOL_VERSION = "sensory-assessment-protocol-0.1-draft";
    public static final String DATA_BUILDER_VERSION = "product-sensory-builder-v0.1";

    private static final int MAX_LEVEL_CENTI = 300;
    private static final int MAX_MOISTURE_BOOST = 75;
    private static final int MAX_OIL_BOOST = 90;
    private static final int MAX_OIL_REDUCTION = 60;
    private static final int MAX_CONFIDENCE_PERCENT = 55;

    private static final Set<Long> MOISTURE_OVERRIDE_IDS = Set.of(
            475L,
            586L,
            3500L,
            3605L,
            3953L,
            5218L);
    private static final Set<Long> OIL_OVERRIDE_IDS = Set.of(
            1463L,
            2896L,
            3260L,
            4510L,
            7587L);

    private static final Map<Long, CategoryPrior> CATEGORY_PRIORS = Map.ofEntries(
            Map.entry(2L, new CategoryPrior(180, 35, 35)),
            Map.entry(3L, new CategoryPrior(180, 75, 35)),
            Map.entry(4L, new CategoryPrior(200, 175, 35)),
            Map.entry(5L, new CategoryPrior(185, 130, 35)),
            Map.entry(7L, new CategoryPrior(210, 30, 20)),
            Map.entry(8L, new CategoryPrior(170, 35, 20)),
            Map.entry(9L, new CategoryPrior(190, 40, 20)),
            Map.entry(11L, new CategoryPrior(60, 20, 15)),
            Map.entry(12L, new CategoryPrior(50, 240, 15)),
            Map.entry(14L, new CategoryPrior(120, 150, 35)),
            Map.entry(15L, new CategoryPrior(70, 230, 20)));
    private static final CategoryPrior FALLBACK_PRIOR = new CategoryPrior(130, 90, 10);
    private static final SensoryModelVersion MODEL_VERSION = new SensoryModelVersion(
            INGREDIENT_PROFILE_VERSION,
            CATEGORY_PRIOR_VERSION,
            LEVEL_MODEL_VERSION,
            ASSESSMENT_PROTOCOL_VERSION,
            DATA_BUILDER_VERSION);

    @Override
    public ProductSensory estimate(Category category, Ingredients ingredients) {
        if (category == null) {
            throw new IllegalArgumentException("감각 추론에는 제품 category가 필요합니다.");
        }
        if (ingredients == null) {
            throw new IllegalArgumentException("감각 추론에는 전성분 목록이 필요합니다.");
        }

        CategoryPrior prior = CATEGORY_PRIORS.getOrDefault(category.id(), FALLBACK_PRIOR);
        IngredientSignals signals = signalsOf(ingredients.values());
        int moistureScore = clamp(
                prior.moistureCenti() + Math.min(signals.moistureBoost(), MAX_MOISTURE_BOOST),
                0,
                MAX_LEVEL_CENTI);
        int oilAdjustment = clamp(
                signals.oilBoost() - signals.oilReduction(),
                -MAX_OIL_REDUCTION,
                MAX_OIL_BOOST);
        int oilScore = clamp(
                prior.oilCenti() + oilAdjustment,
                0,
                MAX_LEVEL_CENTI);

        return new ProductSensory(
                new MoistureLevel(toOrdinalLevel(moistureScore)),
                new OilLevel(toOrdinalLevel(oilScore)),
                new SensoryConfidence(confidence(prior, signals)),
                MODEL_VERSION);
    }

    private static IngredientSignals signalsOf(List<Ingredient> ingredients) {
        int moistureBoost = 0;
        int oilBoost = 0;
        int oilReduction = 0;
        int coveredRankWeight = 0;
        int totalRankWeight = 0;
        int duplicateCount = 0;
        Set<Long> seenIngredientIds = new HashSet<>();

        for (int index = 0; index < ingredients.size(); index++) {
            Ingredient ingredient = ingredients.get(index);
            if (!seenIngredientIds.add(ingredient.id())) {
                duplicateCount++;
                continue;
            }

            RankWeight weight = RankWeight.at(index);
            totalRankWeight += weight.coverageWeight();
            IngredientSignal signal = signalOf(ingredient);
            if (signal.hasEvidence()) {
                coveredRankWeight += weight.coverageWeight();
            }
            if (signal.moisture()) {
                moistureBoost += weight.moistureBoost();
            }
            if (signal.oil()) {
                oilBoost += weight.oilBoost();
            }
            if (signal.absorbent()) {
                oilReduction += weight.oilReduction();
            }
        }

        return new IngredientSignals(
                moistureBoost,
                oilBoost,
                oilReduction,
                coveredRankWeight,
                totalRankWeight,
                seenIngredientIds.size(),
                duplicateCount);
    }

    private static IngredientSignal signalOf(Ingredient ingredient) {
        Set<FormulationRole> roles = Set.copyOf(ingredient.formulationRoles());
        boolean oil = roles.contains(FormulationRole.EMOLLIENT)
                || OIL_OVERRIDE_IDS.contains(ingredient.id());
        boolean moisture = roles.contains(FormulationRole.HUMECTANT)
                || MOISTURE_OVERRIDE_IDS.contains(ingredient.id())
                || roles.contains(FormulationRole.MOISTURISING) && !oil;
        boolean absorbent = roles.contains(FormulationRole.ABSORBENT);
        return new IngredientSignal(moisture, oil, absorbent);
    }

    private static BigDecimal confidence(CategoryPrior prior, IngredientSignals signals) {
        int coverageBonus = signals.totalRankWeight() == 0
                ? 0
                : signals.coveredRankWeight() * 25 / signals.totalRankWeight();
        int listBonus = signals.uniqueIngredientCount() >= 10 ? 5 : 0;
        int duplicatePenalty = Math.min(5, signals.duplicateCount() * 2);
        int confidenceBeforeQualityPenalty = clamp(
                prior.baseConfidencePercent() + coverageBonus + listBonus,
                0,
                MAX_CONFIDENCE_PERCENT);
        int confidencePercent = Math.max(0, confidenceBeforeQualityPenalty - duplicatePenalty);
        return BigDecimal.valueOf(confidencePercent, 2);
    }

    private static int toOrdinalLevel(int centiLevel) {
        return clamp((centiLevel + 50) / 100, 0, 3);
    }

    private static int clamp(int value, int minimum, int maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    private record CategoryPrior(
            int moistureCenti,
            int oilCenti,
            int baseConfidencePercent) {
    }

    private record IngredientSignal(boolean moisture, boolean oil, boolean absorbent) {

        boolean hasEvidence() {
            return moisture || oil || absorbent;
        }
    }

    private record IngredientSignals(
            int moistureBoost,
            int oilBoost,
            int oilReduction,
            int coveredRankWeight,
            int totalRankWeight,
            int uniqueIngredientCount,
            int duplicateCount) {
    }

    private record RankWeight(
            int coverageWeight,
            int moistureBoost,
            int oilBoost,
            int oilReduction) {

        static RankWeight at(int zeroBasedPosition) {
            if (zeroBasedPosition < 5) {
                return new RankWeight(100, 12, 15, 12);
            }
            if (zeroBasedPosition < 10) {
                return new RankWeight(70, 8, 10, 8);
            }
            if (zeroBasedPosition < 20) {
                return new RankWeight(40, 5, 6, 5);
            }
            return new RankWeight(15, 2, 2, 2);
        }
    }
}
