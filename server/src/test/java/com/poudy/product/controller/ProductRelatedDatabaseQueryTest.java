package com.poudy.product.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.product.domain.Product;
import com.poudy.product.repository.ProductRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Sql("/db/search-test-data.sql")
@DisplayName("상품 연관 기능의 DB 조회")
class ProductRelatedDatabaseQueryTest {
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private ProductRepository repository;

    @Test
    @DisplayName("기동 후 추가·변경된 상품을 상세와 보관에서 요청 순서대로 반환한다")
    void readsCurrentDetailAndStorage() throws Exception {
        jdbc.update("update product set product_name = '갱신된 검증토너' where id = 90001");
        jdbc.update("update product_variant set price = 4321 where product_id = 90001");
        mockMvc.perform(get("/api/products/90001"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("갱신된 검증토너"))
            .andExpect(jsonPath("$.variants[0].price").value(4321));
        mockMvc.perform(get("/api/storage").param("productIds", "90002,999999,90001"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[*].id").value(contains(90002, 90001)))
            .andExpect(jsonPath("$.items[1].name").value("갱신된 검증토너"));
        assertThat(repository.findAllById(List.of(90002L, 90001L, 90002L, 999999L))).extracting(Product::id)
            .containsExactly(90002L, 90001L, 90002L);
    }

    @Test
    @DisplayName("기간·카테고리·판매 상태를 적용한 뒤 조회수와 ID 순으로 최대 6개를 고른다")
    void ranksAfterFiltering() {
        LocalDate today = LocalDate.of(2026, 9, 21);
        jdbc.update("delete from product_daily_view");
        jdbc.update("update product_variant set status = 'discontinued' where product_id = 90001");
        jdbc.update("update product set category_id = 14 where id = 90006");
        jdbc.update("""
            insert into product_daily_view (view_date, product_id, view_count) values
            ('2026-09-21', 90001, 100), ('2026-09-21', 90006, 100), ('2026-09-21', 90004, 8),
            ('2026-09-14', 90002, 10000), ('2026-09-22', 90002, 10000)
            """);
        assertThat(repository.findRankings(List.of(2L), today.minusDays(6), today)).extracting(Product::id)
            .containsExactly(90004L, 1L, 13L, 15L, 90002L, 90003L);
        assertThat(repository.findRankings(List.of(1L), today.minusDays(6), today)).extracting(Product::id)
            .containsExactly(90004L, 1L, 7L, 13L, 15L, 90002L);
        assertThat(repository.findRankings(List.of(2L), null, null).getFirst().id()).isEqualTo(90002L);
        assertThat(repository.findRankings(List.of(999999L), null, null)).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({"NAME_ASC,90008", "NAME_DESC,90003"})
    @DisplayName("이름 정렬 방향을 DB에서 적용한 뒤 첫 페이지를 고른다")
    void sortsNamesBeforePaging(String sort, long firstId) throws Exception {
        mockMvc.perform(get("/api/products").param("keyword", "검증토너").param("sort", sort).param("size", "1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(firstId))
            .andExpect(jsonPath("$.pagination.totalElements").value(5));
    }

    @Test
    @DisplayName("새 상품의 존재 확인과 조회수 기록에 기동 당시 목록을 사용하지 않는다")
    void recordsViewForNewProduct() throws Exception {
        mockMvc.perform(post("/api/products/90001/views")).andExpect(status().isNoContent());
        assertThat(
            jdbc.queryForObject("select sum(view_count) from product_daily_view where product_id = 90001", Long.class)
        )
            .isEqualTo(1);
        mockMvc.perform(post("/api/products/999999/views")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("현재 브랜드와 상품 관계로 브랜드·카테고리 개수를 집계한다")
    void countsCurrentBrandProducts() throws Exception {
        jdbc.update("update product set brand_id = 90000 where id = 90006");
        mockMvc.perform(get("/api/brands/90000"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.categories[0].productCount").value(13))
            .andExpect(jsonPath("$.categories[0].children[0].productCount").value(13));
        assertThat(repository.countContainingIngredient(null)).isZero();
        assertThat(repository.countContainingIngredient(999999L)).isZero();
    }

    @Test
    @DisplayName("큐레이션의 현재 상품 참조와 표시 순서를 DB에서 읽는다")
    void readsCurrentCurationReferences() throws Exception {
        jdbc.update("update product set product_name = '현재 큐레이션 상품' where id = 10");
        jdbc.update("""
            insert into curation_block_product (block_id, product_id, position)
            values ('00000000-0000-4000-8000-000000000006', 90001, 1)
            """);
        mockMvc.perform(get("/api/curations/12"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.blocks[3].products[*].id").value(contains(10, 90001)))
            .andExpect(jsonPath("$.blocks[3].products[0].name").value("현재 큐레이션 상품"));
    }

    @Test
    @DisplayName("공유 제품명 후보는 브랜드명을 제외하고 공통 DB 읽기 규칙으로 찾는다")
    void sharesCurrentProductsUsingNameOnlyCandidates() throws Exception {
        mockMvc.perform(
            get("/api/products/share-matches")
                .param("text", "라운드랩 검증독도 토너 100ml https://oy.run/example")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("MATCHED"))
            .andExpect(jsonPath("$.productId").value(90006));
        assertThat(repository.findByProductName("라운드랩", null)).isEmpty();
        assertThat(repository.findByProductName("검증스내일", null)).isEmpty();
        assertThat(repository.findByProductName("피디알엔 검증 크림", 90000L)).extracting(hit -> hit.product().id())
            .containsExactly(90005L);
        assertThat(repository.findByProductName("피디알엔 검증 크림", 90000L).getFirst().exact()).isTrue();
        assertThat(repository.findByProductName("ㄱㅈㅌㄴ", 90000L)).filteredOn(hit -> hit.exact())
            .extracting(hit -> hit.product().id()).containsExactly(90001L);

        assertThat(repository.findByProductName("검증독도", 90000L)).isEmpty();
        assertThat(repository.hasSearchResults("검증토너")).isTrue();
    }
}
