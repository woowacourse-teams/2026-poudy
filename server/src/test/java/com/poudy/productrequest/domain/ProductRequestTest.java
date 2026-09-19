package com.poudy.productrequest.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 등록 요청 상태")
class ProductRequestTest {

    private static final OffsetDateTime REQUESTED_AT = OffsetDateTime.parse("2026-09-15T09:00:00Z");

    @Test
    @DisplayName("새 요청은 RECEIVED 상태와 접수 시각을 상태 변경 시각으로 가진다")
    void startsReceived() {
        ProductRequest request = request();

        assertThat(request.status()).isEqualTo(ProductRequestStatus.RECEIVED);
        assertThat(request.hasStatus(ProductRequestStatus.RECEIVED)).isTrue();
        assertThat(request.statusChangedAt()).isEqualTo(REQUESTED_AT);
        assertThat(request.completedAt()).isNull();
    }

    @Test
    @DisplayName("완료 후 재처리하면 현재 완료 시각을 비운다")
    void clearsCompletedAtWhenReopened() {
        ProductRequest completed = request().changeStatus(
            ProductRequestStatus.COMPLETED,
            clock("2026-09-15T10:00:00Z")
        );
        ProductRequest reprocessing = completed.changeStatus(
            ProductRequestStatus.IN_PROGRESS,
            clock("2026-09-15T11:00:00Z")
        );

        assertThat(completed.completedAt()).isEqualTo(OffsetDateTime.parse("2026-09-15T10:00:00Z"));
        assertThat(reprocessing.status()).isEqualTo(ProductRequestStatus.IN_PROGRESS);
        assertThat(reprocessing.statusChangedAt()).isEqualTo(OffsetDateTime.parse("2026-09-15T11:00:00Z"));
        assertThat(reprocessing.completedAt()).isNull();
    }

    @Test
    @DisplayName("모든 접수·처리 이력이 같으면 같은 이력으로 판단한다")
    void hasSameHistory() {
        ProductRequest request = request();
        ProductRequest sameHistory = request();

        assertThat(request.hasSameHistoryAs(sameHistory)).isTrue();
    }

    @Test
    @DisplayName("ID가 같아도 처리 상태가 다르면 같은 이력으로 판단하지 않는다")
    void rejectsDifferentHistoryWithSameId() {
        ProductRequest request = request();
        ProductRequest completed = request.changeStatus(
            ProductRequestStatus.COMPLETED,
            clock("2026-09-15T10:00:00Z")
        );

        assertThat(request.hasSameHistoryAs(completed)).isFalse();
    }

    private static ProductRequest request() {
        return new ProductRequest(
            UUID.fromString("00000000-0000-0000-0000-000000000001"),
            "제품",
            "브랜드",
            REQUESTED_AT
        );
    }

    private static Clock clock(String instant) {
        return Clock.fixed(Instant.parse(instant), ZoneOffset.UTC);
    }
}
