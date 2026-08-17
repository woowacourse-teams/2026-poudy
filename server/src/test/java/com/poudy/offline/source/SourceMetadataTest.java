package com.poudy.offline.source;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("원천 메타데이터")
class SourceMetadataTest {

    private static final LocalDate ACQUIRED_DATE = LocalDate.of(2026, 8, 17);

    @Test
    @DisplayName("공개 URL과 원문 digest를 가진 원천을 만든다")
    void createsSourceMetadata() {
        SourceMetadata metadata = metadata(
                new SourceLocator.PublicUrl(URI.create("https://example.com/formula/1")),
                ValueOrMissing.present(LocalDate.of(2026, 8, 16)),
                ValueOrMissing.present("revision-2"));

        assertThat(metadata.sourceId()).isEqualTo(StableId.namespaced("source", "1"));
        assertThat(metadata.redistributionPermission())
                .isEqualTo(RedistributionPermission.RESTRICTED);
        assertThat(metadata.contentSha256().value()).isEqualTo("01".repeat(32));
    }

    @Test
    @DisplayName("공개일이 없으면 임의 날짜 대신 결측 이유를 보존한다")
    void keepsMissingPublishedDateReason() {
        SourceMetadata metadata = metadata(
                new SourceLocator.InternalDocumentRef("controlled-source-42"),
                ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                ValueOrMissing.missing(MissingReason.NOT_PUBLISHED));

        assertThat(metadata.publishedDate())
                .isEqualTo(
                        new ValueOrMissing.Missing<LocalDate>(MissingReason.NOT_PUBLISHED, null));
    }

    @Test
    @DisplayName("공개일은 입수일보다 늦을 수 없다")
    void rejectsPublicationAfterAcquisition() {
        ValueOrMissing<LocalDate> futurePublication = ValueOrMissing.present(ACQUIRED_DATE.plusDays(1));

        assertThatThrownBy(
                () -> metadata(
                        new SourceLocator.InternalDocumentRef("controlled-source-42"),
                        futurePublication,
                        ValueOrMissing.present("revision-2")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("공개일");
    }

    @Test
    @DisplayName("공개 원천 locator는 HTTP(S) 절대 URL만 허용한다")
    void validatesPublicUrl() {
        assertThatThrownBy(() -> new SourceLocator.PublicUrl(URI.create("/relative/path")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SourceLocator.PublicUrl(URI.create("file:///tmp/source.pdf")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("필수 digest와 추출 manifest를 생략할 수 없다")
    void requiresDigestAndExtractionManifest() {
        assertThatThrownBy(
                () -> new SourceMetadata(
                        StableId.namespaced("source", "1"),
                        StableId.namespaced("source-family", "1"),
                        "publisher",
                        "document",
                        "formula-sheet",
                        new SourceLocator.InternalDocumentRef("controlled-source-42"),
                        ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                        ACQUIRED_DATE,
                        ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                        null,
                        RedistributionPermission.UNKNOWN,
                        "재배포 상태 미검수",
                        ValueOrMissing.missing(MissingReason.NOT_COLLECTED),
                        new ExtractionMetadata(
                                "manual",
                                "extractor-v1",
                                StableId.namespaced("extraction-manifest", "1"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("SHA-256");

        assertThatThrownBy(() -> new ExtractionMetadata("manual", "extractor-v1", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("manifest");
    }

    @Test
    @DisplayName("재배포 허용에는 구조화된 근거 문구와 검수자 및 검수일이 필요하다")
    void requiresReviewEvidenceForAllowedRedistribution() {
        assertThatThrownBy(
                () -> sourceMetadata(
                        RedistributionPermission.ALLOWED,
                        ValueOrMissing.missing(MissingReason.NOT_COLLECTED)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("재배포 허용");

        RedistributionReview review = new RedistributionReview(
                "공식 라이선스 3항에서 수정 없는 파생 집계 재배포를 허용함",
                "reviewer-1",
                LocalDate.of(2026, 8, 17));

        assertThat(
                sourceMetadata(
                        RedistributionPermission.ALLOWED,
                        ValueOrMissing.present(review))
                        .redistributionReview())
                .isEqualTo(ValueOrMissing.present(review));
    }

    private SourceMetadata metadata(
            SourceLocator locator,
            ValueOrMissing<LocalDate> publishedDate,
            ValueOrMissing<String> sourceRevision) {
        return new SourceMetadata(
                StableId.namespaced("source", "1"),
                StableId.namespaced("source-family", "1"),
                "publisher",
                "document",
                "formula-sheet",
                locator,
                publishedDate,
                ACQUIRED_DATE,
                sourceRevision,
                new ContentSha256("01".repeat(32)),
                RedistributionPermission.RESTRICTED,
                "내부 변환만 허용",
                ValueOrMissing.missing(MissingReason.NOT_APPLICABLE),
                new ExtractionMetadata(
                        "manual",
                        "extractor-v1",
                        StableId.namespaced("extraction-manifest", "1")));
    }

    private SourceMetadata sourceMetadata(
            RedistributionPermission permission,
            ValueOrMissing<RedistributionReview> review) {
        return new SourceMetadata(
                StableId.namespaced("source", "1"),
                StableId.namespaced("source-family", "1"),
                "publisher",
                "document",
                "formula-sheet",
                new SourceLocator.InternalDocumentRef("controlled-source-42"),
                ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                ACQUIRED_DATE,
                ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                new ContentSha256("01".repeat(32)),
                permission,
                "라이선스 판정 기록",
                review,
                new ExtractionMetadata(
                        "manual",
                        "extractor-v1",
                        StableId.namespaced("extraction-manifest", "1")));
    }
}
