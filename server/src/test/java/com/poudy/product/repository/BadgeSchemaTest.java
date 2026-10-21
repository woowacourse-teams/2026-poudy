package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class BadgeSchemaTest {
    @Autowired
    private JdbcTemplate jdbc;

    @ParameterizedTest
    @MethodSource("invalidTexts")
    void rejectsMissingWhitespaceAndOversizedText(String code, String name) {
        assertThatThrownBy(() -> jdbc.update("insert into badge(code, name) values (?, ?)", code, name))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    static Stream<Arguments> invalidTexts() {
        return Stream.concat(
            Stream.of(null, "", " ", "A B", "A\tB", "A\nB", "A\rB", "A\fB", "A\u000bB")
                .flatMap(
                    text -> text == null || text.matches("\\s*")
                        ? Stream.of(Arguments.of(text, "다이소"), Arguments.of("DAISO", text))
                        : Stream.of(Arguments.of(text, "다이소"))
                ),
            Stream.of(Arguments.of("A".repeat(51), "다이소"), Arguments.of("DAISO", "가".repeat(101)))
        );
    }

    @Test
    void allowsSharedNamesAndStoresTimestampsAndUnicodeLengths() {
        jdbc.update("insert into badge(code, name) values ('DAISO', '다이소'), ('OTHER', '다이소')");
        jdbc.update("insert into badge(code, name) values (?, ?)", "가".repeat(50), "😀".repeat(100));
        assertThat(
            jdbc.queryForObject(
                "select count(*) from badge where created_at is not null and updated_at is not null",
                Long.class
            )
        )
            .isEqualTo(3);
    }

    @Test
    void rejectsDuplicateAttachment() {
        jdbc.update("insert into badge(code, name) values ('DAISO', '다이소')");
        jdbc.update("insert into product_badge(product_id, badge_code) values (1, 'DAISO')");
        assertThatThrownBy(() -> jdbc.update("insert into product_badge(product_id, badge_code) values (1, 'DAISO')"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @ParameterizedTest
    @ValueSource(longs = {1, 99999999})
    void rejectsUnknownBadgeOrProduct(long productId) {
        jdbc.update("insert into badge(code, name) values ('DAISO', '다이소')");
        String code = productId == 1 ? "MISSING" : "DAISO";
        assertThatThrownBy(
            () -> jdbc.update("insert into product_badge(product_id, badge_code) values (?, ?)", productId, code)
        )
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void rejectsCodeChangesEvenWithoutAttachments(boolean attached) {
        jdbc.update("insert into badge(code, name) values ('DAISO', '다이소')");
        if (attached) {
            jdbc.update("insert into product_badge(product_id, badge_code) values (1, 'DAISO')");
        }
        jdbc.update("update badge set code = 'DAISO' where code = 'DAISO'");
        assertThatThrownBy(() -> jdbc.update("update badge set code = 'OTHER' where code = 'DAISO'"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsDeletionOfAttachedBadge() {
        jdbc.update("insert into badge(code, name) values ('DAISO', '다이소')");
        jdbc.update("insert into product_badge(product_id, badge_code) values (1, 'DAISO')");
        assertThatThrownBy(() -> jdbc.update("delete from badge where code = 'DAISO'"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void indexesReverseLookup() {
        assertThat(
            jdbc.queryForObject(
                "select indexdef from pg_indexes where schemaname = current_schema() and indexname = 'ix_product_badge_badge_product'",
                String.class
            )
        )
            .contains("(badge_code, product_id)");
    }
}
