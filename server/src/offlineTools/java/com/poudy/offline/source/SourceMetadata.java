package com.poudy.offline.source;

import java.time.LocalDate;

public record SourceMetadata(
        StableId sourceId,
        StableId sourceFamilyId,
        String publisher,
        String documentTitle,
        String sourceType,
        SourceLocator locator,
        ValueOrMissing<LocalDate> publishedDate,
        LocalDate acquiredDate,
        ValueOrMissing<String> sourceRevision,
        ContentSha256 contentSha256,
        RedistributionPermission redistributionPermission,
        String licenseNote,
        ValueOrMissing<RedistributionReview> redistributionReview,
        ExtractionMetadata extraction) {

    public SourceMetadata {
        if (sourceId == null) {
            throw new IllegalArgumentException("원천 식별자가 필요합니다.");
        }
        if (sourceFamilyId == null) {
            throw new IllegalArgumentException("원천 패밀리 식별자가 필요합니다.");
        }
        publisher = requireNonBlank(publisher, "발행처");
        documentTitle = requireNonBlank(documentTitle, "문서명");
        sourceType = requireNonBlank(sourceType, "원천 유형");
        if (locator == null) {
            throw new IllegalArgumentException("원천 위치가 필요합니다.");
        }
        if (publishedDate == null) {
            throw new IllegalArgumentException("공개일 또는 결측 이유가 필요합니다.");
        }
        if (acquiredDate == null) {
            throw new IllegalArgumentException("입수일이 필요합니다.");
        }
        validatePublishedDate(publishedDate, acquiredDate);
        validateSourceRevision(sourceRevision);
        if (contentSha256 == null) {
            throw new IllegalArgumentException("실제로 읽은 원문 byte의 SHA-256이 필요합니다.");
        }
        if (redistributionPermission == null) {
            throw new IllegalArgumentException("재배포 상태가 필요합니다.");
        }
        licenseNote = requireNonBlank(licenseNote, "라이선스 설명");
        validateRedistributionReview(redistributionPermission, redistributionReview);
        if (extraction == null) {
            throw new IllegalArgumentException("추출 메타데이터가 필요합니다.");
        }
    }

    private static void validatePublishedDate(
            ValueOrMissing<LocalDate> publishedDate,
            LocalDate acquiredDate) {
        if (publishedDate instanceof ValueOrMissing.Present<LocalDate> present
                && present.value().isAfter(acquiredDate)) {
            throw new IllegalArgumentException("원천 공개일은 입수일보다 늦을 수 없습니다.");
        }
    }

    private static void validateSourceRevision(ValueOrMissing<String> sourceRevision) {
        if (sourceRevision == null) {
            throw new IllegalArgumentException("원천 revision 또는 결측 이유가 필요합니다.");
        }
        if (sourceRevision instanceof ValueOrMissing.Present<String> present
                && present.value().isBlank()) {
            throw new IllegalArgumentException("원천 revision 값은 비어 있을 수 없습니다.");
        }
    }

    private static void validateRedistributionReview(
            RedistributionPermission permission,
            ValueOrMissing<RedistributionReview> review) {
        if (review == null) {
            throw new IllegalArgumentException("재배포 판정 검수 결과 또는 결측 이유가 필요합니다.");
        }
        if (permission == RedistributionPermission.ALLOWED
                && !(review instanceof ValueOrMissing.Present<RedistributionReview>)) {
            throw new IllegalArgumentException("재배포 허용에는 근거 문구, 검수자와 검수일이 필요합니다.");
        }
    }

    private static String requireNonBlank(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + "은 비어 있을 수 없습니다.");
        }

        return value;
    }
}
