package com.poudy.offline.sensorysource;

import com.poudy.offline.source.SourceMetadata;
import com.poudy.offline.source.StableId;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public record FormulaObservationBatch(
        NormalizedObservationBatchMetadata metadata,
        List<SourceMetadata> sources,
        List<FormulaObservation> observations) {

    public FormulaObservationBatch {
        if (metadata == null) {
            throw new IllegalArgumentException("normalized observation batch metadata가 필요합니다.");
        }
        sources = immutableNonEmpty(sources, "원천 metadata");
        observations = immutableNonEmpty(observations, "처방 observation");

        Set<StableId> sourceIds = uniqueSourceIds(sources);
        rejectDuplicateObservationIds(observations);
        for (FormulaObservation observation : observations) {
            validateObservation(metadata, sourceIds, observation);
        }
    }

    private static Set<StableId> uniqueSourceIds(List<SourceMetadata> sources) {
        Set<StableId> sourceIds = new HashSet<>();
        for (SourceMetadata source : sources) {
            if (!sourceIds.add(source.sourceId())) {
                throw new IllegalArgumentException("원천 metadata ID는 중복될 수 없습니다: " + source.sourceId());
            }
        }
        return Set.copyOf(sourceIds);
    }

    private static void rejectDuplicateObservationIds(List<FormulaObservation> observations) {
        Set<StableId> observationIds = new HashSet<>();
        for (FormulaObservation observation : observations) {
            if (!observationIds.add(observation.formulaObservationId())) {
                throw new IllegalArgumentException(
                        "처방 observation ID는 중복될 수 없습니다: "
                                + observation.formulaObservationId());
            }
        }
    }

    private static void validateObservation(
            NormalizedObservationBatchMetadata metadata,
            Set<StableId> sourceIds,
            FormulaObservation observation) {
        if (!sourceIds.contains(observation.sourceMetadataId())) {
            throw new IllegalArgumentException(
                    "처방 observation이 존재하지 않는 원천 metadata를 참조합니다: "
                            + observation.sourceMetadataId());
        }

        requireVersion(
                "category mapping",
                metadata.categoryMappingVersion(),
                observation.canonicalCategoryMapping().mappingVersion());
        requireVersion(
                "application type 판정 규칙",
                metadata.applicationTypeDecisionRuleVersion(),
                observation.applicationTypeDecision().decisionRuleVersion());
        requireVersion(
                "사용 형태 mapping",
                metadata.usageFormMappingVersion(),
                observation.canonicalUsageFormMapping().mappingVersion());
        requireVersion(
                "제형 mapping",
                metadata.formulationMappingVersion(),
                observation.canonicalFormulationMapping().mappingVersion());
        validateIngredientResolverVersions(metadata.ingredientResolverVersion(), observation);
    }

    private static void validateIngredientResolverVersions(
            String expectedVersion,
            FormulaObservation observation) {
        for (RawMaterialInput input : observation.orderedRawMaterialInputs()) {
            switch (input.composition()) {
                case RawMaterialComposition.KnownComposition known -> known.components()
                        .forEach(
                                component -> requireVersion(
                                        "성분 resolver",
                                        expectedVersion,
                                        component.ingredientResolution().resolverVersion()));
                case RawMaterialComposition.UnquantifiedComposition unquantified ->
                    unquantified.components().forEach(
                            component -> requireVersion(
                                    "성분 resolver",
                                    expectedVersion,
                                    component.ingredientResolution().resolverVersion()));
            }
        }
    }

    private static void requireVersion(String name, String expected, String actual) {
        if (!expected.equals(actual)) {
            throw new IllegalArgumentException(
                    name + " 버전이 batch metadata와 일치하지 않습니다: "
                            + actual + " != " + expected);
        }
    }

    private static <T> List<T> immutableNonEmpty(List<T> values, String name) {
        if (values == null || values.isEmpty()) {
            throw new IllegalArgumentException(name + "는 한 개 이상이어야 합니다.");
        }
        if (values.stream().anyMatch(value -> value == null)) {
            throw new IllegalArgumentException(name + "는 null일 수 없습니다.");
        }
        return List.copyOf(values);
    }
}
