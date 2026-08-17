package com.poudy.offline.sensorysource;

import com.poudy.offline.source.InputManifestSha256;

public record NormalizedObservationBatchMetadata(
        String sourceDataContractVersion,
        String ingredientResolverVersion,
        String categoryMappingVersion,
        String applicationTypeDecisionRuleVersion,
        String usageFormMappingVersion,
        String formulationMappingVersion,
        String formulaDeduplicationVersion,
        String dataBuilderVersion,
        InputManifestSha256 inputManifestSha256) {

    public NormalizedObservationBatchMetadata {
        sourceDataContractVersion = requireNonBlank(
                sourceDataContractVersion,
                "원천 데이터 계약 버전");
        ingredientResolverVersion = requireNonBlank(
                ingredientResolverVersion,
                "성분 resolver 버전");
        categoryMappingVersion = requireNonBlank(
                categoryMappingVersion,
                "category mapping 버전");
        applicationTypeDecisionRuleVersion = requireNonBlank(
                applicationTypeDecisionRuleVersion,
                "application-type 판정 규칙 버전");
        usageFormMappingVersion = requireNonBlank(
                usageFormMappingVersion,
                "usage-form mapping 버전");
        formulationMappingVersion = requireNonBlank(
                formulationMappingVersion,
                "formulation mapping 버전");
        formulaDeduplicationVersion = requireNonBlank(
                formulaDeduplicationVersion,
                "처방 중복 제거 버전");
        dataBuilderVersion = requireNonBlank(dataBuilderVersion, "데이터 builder 버전");
        if (inputManifestSha256 == null) {
            throw new IllegalArgumentException("입력 manifest SHA-256이 필요합니다.");
        }
    }

    private static String requireNonBlank(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + "은 비어 있을 수 없습니다.");
        }

        return value;
    }
}
