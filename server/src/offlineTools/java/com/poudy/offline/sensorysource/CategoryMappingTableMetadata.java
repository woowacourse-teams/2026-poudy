package com.poudy.offline.sensorysource;

import com.poudy.offline.source.ContentSha256;
import java.time.LocalDate;

public record CategoryMappingTableMetadata(
        ContentSha256 inputCategoryVocabularySha256,
        String mappingVersion,
        String reviewer,
        LocalDate reviewedDate) {

    public CategoryMappingTableMetadata {
        if (inputCategoryVocabularySha256 == null) {
            throw new IllegalArgumentException("입력 category vocabulary SHA-256이 필요합니다.");
        }
        mappingVersion = requireNonBlank(mappingVersion, "category mapping 버전");
        reviewer = requireNonBlank(reviewer, "category mapping 검수자");
        if (reviewedDate == null) {
            throw new IllegalArgumentException("category mapping 검수일이 필요합니다.");
        }
    }

    private static String requireNonBlank(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + "이 필요합니다.");
        }
        return value;
    }
}
