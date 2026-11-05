package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
@DisplayName("구성품 유수분 저장 제약")
class ProductComponentSensorySchemaTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("유수분 값을 생략한 구성품을 저장할 수 있다")
    void allowsComponentWithoutSensory() {
        var component = jdbc.queryForMap("""
            insert into product_component (product_id, display_order, name)
            select 1, coalesce(max(display_order), -1) + 1, '유수분 미제공 구성품'
            from product_component where product_id = 1
            returning moisture_level, oil_level
            """);

        assertThat(component).containsEntry("moisture_level", null).containsEntry("oil_level", null);
    }

    @ParameterizedTest
    @CsvSource(value = {"NULL, 1", "1, NULL"}, nullValues = "NULL")
    @DisplayName("수분감과 유분감 중 한 값만 저장하는 것은 거절한다")
    void rejectsPartialSensory(Double moisture, Double oil) {
        assertThatThrownBy(
            () -> jdbc.update(
                "update product_component set moisture_level = ?, oil_level = ? where product_id = 1",
                moisture,
                oil
            )
        )
            .isInstanceOf(DataIntegrityViolationException.class)
            .hasMessageContaining("ck_product_component_sensory_pair");
    }

    @ParameterizedTest
    @CsvSource({"-0.1, 1", "3.1, 1", "1, -0.1", "1, 3.1"})
    @DisplayName("유수분 값이 있으면 기존 0부터 3까지의 범위 제약을 유지한다")
    void rejectsOutOfRangeSensory(double moisture, double oil) {
        assertThatThrownBy(
            () -> jdbc.update(
                "update product_component set moisture_level = ?, oil_level = ? where product_id = 1",
                moisture,
                oil
            )
        )
            .isInstanceOf(DataIntegrityViolationException.class)
            .hasMessageContaining("ck_product_component_");
    }
}
