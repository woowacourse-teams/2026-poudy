package com.poudy.inquiry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@DisplayName("문의 첨부 이미지와 처리 이력 스키마")
class InquirySchemaTest {
    @Autowired
    private JdbcTemplate jdbc;

    private UUID feedbackId;
    private UUID correctionId;

    @BeforeEach
    public void setUp() {
        feedbackId = UUID.randomUUID();
        correctionId = UUID.randomUUID();
        jdbc.update(
            "insert into feedback (id, subject_type, content, status_changed_at) values (?, 'OTHER', '의견', now())",
            feedbackId
        );
        jdbc.update(
            "insert into product_correction_request (id, product_id, content, status_changed_at)"
                + " values (?, (select min(id) from product), '정정', now())",
            correctionId
        );
    }

    @Test
    @DisplayName("귀속된 접수 건이 없는 첨부 이미지는 거부한다")
    public void rejectsImageWithoutOwner() {
        assertThatThrownBy(() -> insertImage(UUID.randomUUID(), null, null, 0))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("서비스 의견과 정정 요청에 동시에 귀속된 첨부 이미지는 거부한다")
    public void rejectsImageWithTwoOwners() {
        assertThatThrownBy(() -> insertImage(UUID.randomUUID(), feedbackId, correctionId, 0))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("같은 이미지 ID 는 서비스 의견과 정정 요청에 함께 쓸 수 없다")
    public void rejectsSameImageAcrossOwners() {
        UUID imageId = UUID.randomUUID();
        insertImage(imageId, feedbackId, null, 0);

        assertThatThrownBy(() -> insertImage(imageId, null, correctionId, 0))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("표시 순서는 접수 건마다 따로 0부터 이어진다")
    public void checksOrderPerOwner() {
        insertImage(UUID.randomUUID(), feedbackId, null, 0);
        insertImage(UUID.randomUUID(), feedbackId, null, 1);
        insertImage(UUID.randomUUID(), null, correctionId, 0);

        assertThatCode(this::checkDeferredConstraints).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("한 접수 건의 표시 순서가 비면 커밋 검사에서 거부한다")
    public void rejectsGapInOwnerOrder() {
        insertImage(UUID.randomUUID(), null, correctionId, 0);
        insertImage(UUID.randomUUID(), null, correctionId, 2);

        assertThatThrownBy(this::checkDeferredConstraints).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("접수 건을 지우면 첨부 이미지도 함께 지운다")
    public void deletesImagesWithOwner() {
        insertImage(UUID.randomUUID(), null, correctionId, 0);

        jdbc.update("delete from product_correction_request where id = ?", correctionId);

        assertThat(jdbc.queryForObject("select count(*) from inquiry_image", Long.class)).isZero();
    }

    @Test
    @DisplayName("메모 추가 이력은 메모 내용을 저장한다")
    public void storesMemoOnMemoEvent() {
        assertThatCode(() -> insertEvent("MEMO_ADDED", "메모")).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @CsvSource(value = {"MEMO_ADDED,", "MEMO_ADDED,' '", "STATUS_CHANGED,메모"})
    @DisplayName("메모 내용은 메모 추가 이력에만 있고 비어 있을 수 없다")
    public void rejectsMemoMismatchedWithEventType(String type, String memo) {
        assertThatThrownBy(() -> insertEvent(type, memo)).isInstanceOf(DataIntegrityViolationException.class);
    }

    private void insertImage(UUID imageId, UUID feedback, UUID correction, int order) {
        jdbc.update(
            "insert into inquiry_image (image_id, feedback_id, correction_request_id, display_order) values (?, ?, ?, ?)",
            imageId,
            feedback,
            correction,
            order
        );
    }

    private void insertEvent(String type, String memo) {
        jdbc.update(
            "insert into admin_inquiry_event (id, feedback_id, event_type, memo) values (?, ?, ?, ?)",
            UUID.randomUUID(),
            feedbackId,
            type,
            memo
        );
    }

    private void checkDeferredConstraints() {
        jdbc.execute("SET CONSTRAINTS ALL IMMEDIATE");
    }
}
