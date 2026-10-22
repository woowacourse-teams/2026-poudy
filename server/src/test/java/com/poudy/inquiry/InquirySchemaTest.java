package com.poudy.inquiry;

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
@DisplayName("문의 처리 이력 스키마")
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

    private void insertEvent(String type, String memo) {
        jdbc.update(
            "insert into admin_inquiry_event (id, feedback_id, event_type, memo) values (?, ?, ?, ?)",
            UUID.randomUUID(),
            feedbackId,
            type,
            memo
        );
    }
}
