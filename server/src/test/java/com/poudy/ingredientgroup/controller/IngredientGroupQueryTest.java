package com.poudy.ingredientgroup.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.ErrorCode;
import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.ingredientgroup.domain.IngredientBundle;
import com.poudy.ingredientgroup.domain.IngredientGroup;
import com.poudy.ingredientgroup.repository.IngredientGroupRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("성분군 조회")
class IngredientGroupQueryTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private IngredientGroupRepository repository;

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @DisplayName("전체 성분군을 코드 순서로 반환하며 빈 성분군과 빠른 제외 성분군도 포함한다")
    void findsEveryGroupInCodeOrder() throws Exception {
        addCeramides();
        jdbc.update(
            "insert into ingredient_group (code, display_name, description) values (?, ?, ?)",
            "AAA_EMPTY",
            "빈 성분군",
            "소속 성분이 없는 성분군"
        );

        JsonNode items = list(null);
        List<String> expectedCodes = jdbc.queryForList("select code from ingredient_group order by code", String.class);
        assertThat(items).extracting(item -> item.path("code").asString()).containsExactlyElementsOf(expectedCodes);
        assertThat(group(items, "AAA_EMPTY").path("ingredients").isEmpty()).isTrue();
        assertThat(group(items, "CERAMIDES").path("ingredients"))
            .extracting(item -> item.path("id").asLong()).containsExactly(20L, 9L);
        for (JsonNode item : items) {
            JsonNode detail = mapper.readTree(
                mockMvc.perform(get("/api/ingredient-groups/{code}", item.path("code").asString()))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()
            );
            assertThat(item).isEqualTo(detail);
        }
    }

    @Test
    @DisplayName("빠른 제외 분류는 기존 6개 코드와 소속 성분을 순서대로 유지한다")
    void filtersQuickExcludeGroups() throws Exception {
        addCeramides();
        jdbc.update(
            "insert into ingredient_group (code, display_name, description) values (?, ?, ?)",
            "AAA_CUSTOM",
            "새 성분군",
            "DB에만 추가한 성분군"
        );
        jdbc.update(
            "insert into ingredient_group_ingredient (group_code, ingredient_id, display_order) values (?, ?, 0)",
            "AAA_CUSTOM",
            9L
        );

        JsonNode items = list("QUICK_EXCLUDE");
        JsonNode legacy = mapper.readTree(
            mockMvc.perform(get("/api/exclude-codes")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()
        ).path("items");

        assertThat(items).extracting(item -> item.path("code").asString())
            .containsExactlyElementsOf(ExcludeCode.codeValues().stream().sorted().toList());
        for (int index = 0; index < items.size(); index++) {
            JsonNode item = items.get(index);
            JsonNode previous = legacy.get(index);
            for (String field : List.of("code", "name", "description")) {
                assertThat(item.path(field)).isEqualTo(previous.path(field));
            }
            assertThat(item.has("englishName")).isTrue();
            assertThat(item.path("ingredients")).isEqualTo(previous.path("ingredients"));
        }
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = "QUICK_EXCLUDE")
    @DisplayName("전체·빠른 제외 목록에서 영문명 필드는 항상 포함하며 값이 없으면 null이다")
    void keepsNullEnglishNames(String type) throws Exception {
        jdbc.update("update ingredient_group set english_name = null where code = 'SULFATES'");
        Long ingredientId = jdbc.queryForObject(
            "select ingredient_id from ingredient_group_ingredient where group_code = 'SULFATES'"
                + " order by display_order limit 1",
            Long.class
        );
        jdbc.update("update ingredient set english_name = null where id = ?", ingredientId);

        JsonNode sulfates = group(list(type), "SULFATES");
        assertThat(sulfates.has("englishName")).isTrue();
        assertThat(sulfates.path("englishName").isNull()).isTrue();
        JsonNode ingredient = sulfates.path("ingredients").get(0);
        assertThat(ingredient.has("englishName")).isTrue();
        assertThat(ingredient.path("englishName").isNull()).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"UNKNOWN", "quick_exclude", "true"})
    @DisplayName("지원하지 않는 성분군 분류는 400으로 거절한다")
    void rejectsUnknownType(String type) throws Exception {
        mockMvc.perform(get("/api/ingredient-groups").param("type", type))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }

    @Test
    @DisplayName("성분군이 없으면 전체·빠른 제외 목록 모두 빈 배열을 반환한다")
    void returnsEmptyListsWhenNoGroupsExist() throws Exception {
        jdbc.update("delete from ingredient_group_ingredient");
        jdbc.update("delete from ingredient_group");

        assertThat(list(null).isEmpty()).isTrue();
        assertThat(list("QUICK_EXCLUDE").isEmpty()).isTrue();
    }

    @Test
    @DisplayName("성분군의 이름, 설명과 속한 성분을 표시 순서대로 반환한다")
    void findsGroupDetail() throws Exception {
        addCeramides();

        mockMvc.perform(get("/api/ingredient-groups/CERAMIDES"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value("CERAMIDES"))
            .andExpect(jsonPath("$.name").value("세라마이드"))
            .andExpect(jsonPath("$.englishName").value("Ceramides"))
            .andExpect(jsonPath("$.description").value("피부 장벽을 구성하는 지질 성분으로 수분 손실을 막아요."))
            .andExpect(jsonPath("$.ingredients[*].id").value(contains(20, 9)));
    }

    @Test
    @DisplayName("마이그레이션이 제외 성분군 외에 성분군 22개를 넣는다")
    void insertsIngredientGroupsByMigration() {
        Long count = jdbc.queryForObject(
            "select count(*) from ingredient_group where code <> all(cast(? as text[]))",
            Long.class,
            (Object) ExcludeCode.codeValues().toArray(String[]::new)
        );

        assertThat(count).isEqualTo(22);
    }

    @Test
    @DisplayName("옛 이름 호환 뷰는 제외 성분군만 보여 준다")
    void exposesOnlyExcludeCodesThroughCompatibilityViews() {
        addCeramides();

        List<String> codes = jdbc.queryForList("select code from exclude_code order by code", String.class);
        List<String> memberCodes = jdbc.queryForList(
            "select distinct exclude_code from exclude_code_ingredient order by exclude_code",
            String.class
        );

        assertThat(codes).containsExactlyInAnyOrderElementsOf(ExcludeCode.codeValues());
        assertThat(memberCodes).doesNotContain("CERAMIDES");
    }

    @Test
    @DisplayName("제외 성분군도 성분군으로 조회한다")
    void findsExcludeCodeAsGroup() throws Exception {
        mockMvc.perform(get("/api/ingredient-groups/SULFATES"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("설페이트 성분"))
            .andExpect(jsonPath("$.englishName").value("Sulfates"));
    }

    @Test
    @DisplayName("없는 성분군이면 404를 반환한다")
    void rejectsUnknownGroup() throws Exception {
        mockMvc.perform(get("/api/ingredient-groups/UNKNOWN"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value(ErrorCode.INGREDIENT_GROUP_NOT_FOUND.name()));
    }

    @Test
    @DisplayName("주요 성분 묶음에는 제외 성분군을 쓰지 않는다")
    void excludesExcludeCodesFromBundling() {
        List<Long> fragranceIngredients = List.of(9L, 20L);

        assertThat(repository.findBundlingGroups().bundle(fragranceIngredients))
            .extracting(IngredientBundle::group)
            .containsOnlyNulls();

        addCeramides();

        assertThat(repository.findBundlingGroups().bundle(fragranceIngredients))
            .singleElement()
            .extracting(IngredientBundle::group)
            .extracting(IngredientGroup::code)
            .isEqualTo("CERAMIDES");
    }

    private JsonNode list(String type) throws Exception {
        var request = get("/api/ingredient-groups");
        if (type != null) {
            request.param("type", type);
        }
        return mapper.readTree(
            mockMvc.perform(request).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()
        ).path("items");
    }

    private JsonNode group(JsonNode items, String code) {
        for (JsonNode item : items) {
            if (item.path("code").asString().equals(code)) {
                return item;
            }
        }
        throw new AssertionError("성분군을 찾을 수 없습니다: " + code);
    }

    private void addCeramides() {
        jdbc.update(
            "insert into ingredient_group_ingredient (group_code, ingredient_id, display_order) values (?, ?, 0), (?, ?, 1)",
            "CERAMIDES",
            20L,
            "CERAMIDES",
            9L
        );
    }
}
