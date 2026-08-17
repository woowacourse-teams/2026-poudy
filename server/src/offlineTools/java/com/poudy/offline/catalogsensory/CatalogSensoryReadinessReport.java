package com.poudy.offline.catalogsensory;

import com.poudy.product.domain.sensory.SensoryModelVersion;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record CatalogSensoryReadinessReport(
        String schemaVersion,
        String toolVersion,
        List<InputFile> inputs,
        CatalogSummary catalog,
        List<CategoryCount> categories,
        LevelFields levels,
        InferenceSummary inference,
        IngredientListQuality ingredientLists,
        IngredientCountDistribution ingredientCountDistribution,
        RoleCoverage roleCoverage,
        List<RoleUsage> roleUsage,
        DisclosedAmountSummary disclosedAmounts,
        SourceFieldPresence sourceFields,
        List<IngredientFrequency> topFrequentIngredients,
        List<IngredientFrequency> sensoryRoleCandidates,
        List<IngredientFrequency> frequentWithoutSensoryRole) {

    public static final String SCHEMA_VERSION = "catalog-sensory-readiness-v2";
    public static final String TOOL_VERSION = "catalog-sensory-readiness-tool-v2";

    public record InputFile(String name, long bytes, String sha256) {
    }

    public record CatalogSummary(
            int products,
            int ingredients,
            int categories,
            int referencedUniqueIngredients,
            int malformedProducts,
            int malformedIngredients,
            int malformedCategories,
            int duplicateProductIds,
            int duplicateIngredientIds,
            int duplicateCategoryIds,
            int unknownCategoryReferences,
            int malformedTagMappings,
            int unrecognizedFormulationRoles) {
    }

    public record CategoryCount(Long id, Long parentId, String path, long products) {
    }

    public record LevelFields(LevelStatus moistureLevel, LevelStatus oilLevel) {
    }

    public record LevelStatus(int absent, int explicitNull, int valid, int invalid) {
    }

    public record InferenceSummary(
            SensoryModelVersion modelVersion,
            int candidateProducts,
            int inferredProducts,
            int skippedProducts,
            LevelDistribution moistureLevels,
            LevelDistribution oilLevels,
            List<LevelPairCount> levelPairs,
            ConfidenceDistribution confidence,
            List<CategoryInference> categories) {
    }

    public record LevelDistribution(int level0, int level1, int level2, int level3) {
    }

    public record LevelPairCount(int moistureLevel, int oilLevel, int products) {
    }

    public record ConfidenceDistribution(
            BigDecimal minimum,
            BigDecimal percentile25,
            BigDecimal median,
            BigDecimal percentile75,
            BigDecimal maximum,
            BigDecimal mean) {
    }

    public record CategoryInference(
            Long id,
            String path,
            int products,
            LevelDistribution moistureLevels,
            LevelDistribution oilLevels,
            BigDecimal meanConfidence) {
    }

    public record IngredientListQuality(
            int orderedArrays,
            int missingOrInvalidArrays,
            int emptyArrays,
            int references,
            int resolvedReferences,
            int unresolvedReferences,
            int malformedReferences,
            int duplicateReferences,
            List<Long> unresolvedIngredientIds,
            List<DuplicateIngredientReference> duplicates) {
    }

    public record DuplicateIngredientReference(
            Long productId,
            String productName,
            Long ingredientId,
            String ingredientName,
            int firstPosition,
            int duplicatePosition) {
    }

    public record IngredientCountDistribution(
            int samples,
            int minimum,
            int percentile25,
            int median,
            int percentile75,
            int percentile90,
            int maximum,
            BigDecimal mean) {
    }

    public record RoleCoverage(Coverage recognizedFormulationRole, Coverage sensoryScreeningRole) {
    }

    public record Coverage(
            int coveredUniqueIngredients,
            int referencedUniqueIngredients,
            int coveredOccurrences,
            int validIngredientOccurrences) {
    }

    public record RoleUsage(
            String role,
            boolean sensoryScreeningRole,
            int referencedUniqueIngredients,
            int products,
            int occurrences) {
    }

    public record DisclosedAmountSummary(
            int products,
            int references,
            int malformed,
            Map<String, Integer> types,
            Map<String, Integer> units) {
    }

    public record SourceFieldPresence(
            int applicationTypeProducts,
            int usageVariantProducts,
            int formulaArchetypeProducts,
            int sourceUrlProducts,
            boolean officialIngredientOrderVerified) {
    }

    public record IngredientFrequency(
            Long ingredientId,
            String ingredientName,
            int products,
            int occurrences,
            List<String> formulationRoles,
            List<String> sensoryScreeningRoles) {
    }
}
