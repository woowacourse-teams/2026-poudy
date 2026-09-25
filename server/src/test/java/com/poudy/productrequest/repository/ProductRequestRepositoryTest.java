package com.poudy.productrequest.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@DisplayName("제품 등록 요청 저장소")
class ProductRequestRepositoryTest {

    private static final OffsetDateTime REQUESTED_AT = OffsetDateTime.parse("2026-09-10T01:02:03.456Z");
    private static final Clock LATER = Clock.fixed(Instant.parse("2026-09-11T00:00:00Z"), ZoneOffset.UTC);

    @Autowired
    private ProductRequestRepository repository;

    @Test
    @DisplayName("저장한 요청을 같은 값으로 다시 읽는다")
    void roundTripsRequest() {
        ProductRequest request = new ProductRequest(UUID.randomUUID(), "독도 토너", "라운드랩", REQUESTED_AT);

        repository.save(request);
        ProductRequest found = repository.findById(request.requestId());

        assertThat(found.requestId()).isEqualTo(request.requestId());
        assertThat(found.productName()).isEqualTo("독도 토너");
        assertThat(found.brandName()).isEqualTo("라운드랩");
        assertThat(found.requestedAt()).isEqualTo(REQUESTED_AT);
        assertThat(found.status()).isEqualTo(ProductRequestStatus.RECEIVED);
        assertThat(found.statusChangedAt()).isEqualTo(REQUESTED_AT);
        assertThat(found.completedAt()).isNull();
    }

    @Test
    @DisplayName("상태 변경을 저장하고 완료 시각을 함께 남긴다")
    void updatesStatus() {
        ProductRequest request = new ProductRequest(UUID.randomUUID(), "독도 토너", null, REQUESTED_AT);
        repository.save(request);

        assertThat(
            repository.updateStatus(
                ProductRequestStatus.RECEIVED,
                request.changeStatus(ProductRequestStatus.COMPLETED, LATER)
            )
        )
            .isTrue();
        ProductRequest found = repository.findById(request.requestId());

        assertThat(found.status()).isEqualTo(ProductRequestStatus.COMPLETED);
        assertThat(found.statusChangedAt()).isEqualTo(OffsetDateTime.parse("2026-09-11T00:00:00Z"));
        assertThat(found.completedAt()).isEqualTo(OffsetDateTime.parse("2026-09-11T00:00:00Z"));
        assertThat(found.brandName()).isNull();
    }

    @Test
    @DisplayName("목록은 최근 요청부터 돌려주고 상태로 거른다")
    void listsNewestFirstAndFiltersByStatus() {
        ProductRequest older = new ProductRequest(UUID.randomUUID(), "오래된 요청", null, REQUESTED_AT);
        ProductRequest newer = new ProductRequest(UUID.randomUUID(), "최근 요청", null, REQUESTED_AT.plusHours(1));
        repository.save(older);
        repository.save(newer);
        repository
            .updateStatus(ProductRequestStatus.RECEIVED, older.changeStatus(ProductRequestStatus.REJECTED, LATER));

        assertThat(repository.findAll(null)).extracting(ProductRequest::requestId)
            .containsSubsequence(newer.requestId(), older.requestId());
        assertThat(repository.findAll(ProductRequestStatus.REJECTED)).extracting(ProductRequest::requestId)
            .contains(older.requestId())
            .doesNotContain(newer.requestId());
    }

    @Test
    @DisplayName("읽은 뒤 상태가 바뀌었으면 상태 변경을 저장하지 않는다")
    void rejectsStaleStatusChange() {
        ProductRequest request = new ProductRequest(UUID.randomUUID(), "독도 토너", null, REQUESTED_AT);
        repository.save(request);
        repository
            .updateStatus(ProductRequestStatus.RECEIVED, request.changeStatus(ProductRequestStatus.IN_PROGRESS, LATER));

        boolean updated = repository.updateStatus(
            ProductRequestStatus.RECEIVED,
            request.changeStatus(ProductRequestStatus.COMPLETED, LATER)
        );

        assertThat(updated).isFalse();
        assertThat(repository.findById(request.requestId()).status()).isEqualTo(ProductRequestStatus.IN_PROGRESS);
    }

    @Test
    @DisplayName("없는 요청은 제품 등록 요청 없음으로 알린다")
    void rejectsUnknownRequest() {
        assertThatThrownBy(() -> repository.findById(UUID.randomUUID()))
            .isInstanceOf(ResourceNotFoundException.class)
            .extracting(exception -> ((ResourceNotFoundException) exception).code())
            .isEqualTo(ErrorCode.PRODUCT_REQUEST_NOT_FOUND);
    }

}
