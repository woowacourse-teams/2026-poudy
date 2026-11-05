package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@Sql("/db/product-comparison-test-data.sql")
@DisplayName("구성품 유수분 저장 제약")
class ProductComponentSensorySchemaTest {

    private static final String SENSORY_CONSTRAINTS = "check_component_sensory_category, "
        + "check_product_sensory_category, check_category_sensory_category";

    @Autowired
    private JdbcTemplate jdbc;

    @ParameterizedTest
    @ValueSource(strings = {"향수", "클렌징"})
    @DisplayName("향수·클렌징 구성품은 유수분 값을 생략해 저장한다")
    void allowsComponentWithoutSensory(String category) {
        jdbc.update("update category set name = ? where id = 94000", category);
        var component = jdbc.queryForMap("""
            insert into product_component (product_id, display_order, name)
            select 94003, coalesce(max(display_order), -1) + 1, '유수분 미제공 구성품'
            from product_component where product_id = 94003
            returning moisture_level, oil_level
            """);
        validateSensory();

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

    @ParameterizedTest
    @ValueSource(strings = {"향수", "클렌징"})
    @DisplayName("향수·클렌징 구성품에 유수분 숫자를 저장하는 것은 거절한다")
    void rejectsSensoryForExcludedCategory(String category) {
        jdbc.update("update category set name = ? where id = 94000", category);
        jdbc.update("update product_component set moisture_level = 1, oil_level = 1 where id = 94105");

        assertInvalidCategoryState();
    }

    @ParameterizedTest
    @ValueSource(longs = {94001, 94002})
    @DisplayName("향수·클렌징 외 구성품은 유수분 두 값이 모두 필수다")
    void rejectsMissingSensoryForOtherCategories(long productId) {
        jdbc.update(
            "update product_component set moisture_level = null, oil_level = null where product_id = ?",
            productId
        );

        assertInvalidCategoryState();
    }

    @Test
    @DisplayName("카테고리만 바꿔 유수분 저장 정책을 위반하는 것은 거절한다")
    void rejectsCategoryChangeWithoutSensoryChange() {
        jdbc.update("update product set category_id = 94001 where id = 94001");

        assertInvalidCategoryState();
    }

    @Test
    @DisplayName("카테고리와 유수분을 한 트랜잭션에서 함께 바꿀 수 있다")
    void allowsAtomicCategoryAndSensoryChanges() {
        jdbc.update("update product_component set moisture_level = null, oil_level = null where product_id = 94001");
        jdbc.update("update product set category_id = 94001 where id = 94001");
        validateSensory();

        jdbc.execute("set constraints " + SENSORY_CONSTRAINTS + " deferred");
        jdbc.update("update product set category_id = 2 where id = 94001");
        jdbc.update("update product_component set moisture_level = 1, oil_level = 2 where product_id = 94001");
        validateSensory();

        assertThat(jdbc.queryForObject("select moisture_level from product_component where id = 94101", Double.class))
            .isEqualTo(1.0);
    }

    @Test
    @DisplayName("카테고리 이름이나 상위 분류 변경으로 유수분 정책을 우회할 수 없다")
    void rejectsCategoryClassificationChange() {
        jdbc.update("update category set name = '향수' where id = 1");

        assertInvalidCategoryState();
    }

    private void assertInvalidCategoryState() {
        assertThatThrownBy(this::validateSensory)
            .isInstanceOf(DataIntegrityViolationException.class)
            .hasMessageContaining("향수·클렌징의 유수분은 모두 null이어야");
    }

    private void validateSensory() {
        jdbc.execute("set constraints " + SENSORY_CONSTRAINTS + " immediate");
    }
}
