package com.poudy.offline.sensorysource;

public record ExactFormulaSignature(
        String formulaDeduplicationVersion,
        ExactFormulaSignatureSha256 sha256) {

    public ExactFormulaSignature {
        if (formulaDeduplicationVersion == null || formulaDeduplicationVersion.isBlank()) {
            throw new IllegalArgumentException("formula deduplication 버전이 필요합니다.");
        }
        if (sha256 == null) {
            throw new IllegalArgumentException("exact formula signature SHA-256이 필요합니다.");
        }
    }
}
