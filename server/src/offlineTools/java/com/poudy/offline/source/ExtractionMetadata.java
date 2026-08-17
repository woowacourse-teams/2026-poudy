package com.poudy.offline.source;

public record ExtractionMetadata(
        String method,
        String extractorVersion,
        StableId extractionManifestId) {

    public ExtractionMetadata {
        method = requireNonBlank(method, "추출 방식");
        extractorVersion = requireNonBlank(extractorVersion, "추출기 버전");
        if (extractionManifestId == null) {
            throw new IllegalArgumentException("추출 manifest 식별자가 필요합니다.");
        }
    }

    private static String requireNonBlank(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + "은 비어 있을 수 없습니다.");
        }

        return value;
    }
}
