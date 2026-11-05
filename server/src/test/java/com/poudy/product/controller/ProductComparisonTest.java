package com.poudy.product.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.myfilter.repository.MyFilterRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginChannel;
import com.poudy.security.session.LoginSession;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import com.poudy.user.support.UserNicknameTestFixture;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Sql("/db/product-comparison-test-data.sql")
@DisplayName("제품 비교 일괄 조회")
class ProductComparisonTest {

    private static final String PATH = "/api/products/comparison";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository users;
    @Autowired
    private MyFilterRepository myFilters;
    @Autowired
    private LoginSession loginSession;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("서로 다른 카테고리의 제품을 요청 순서대로 반환하고 가격·용량 쌍을 유지한다")
    void comparesInRequestedOrderWithVariants() throws Exception {
        mockMvc.perform(get(PATH).param("productIds", "94002,94001,94005"))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.myFilterStatus").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.items[*].selectedPart.myFilterStatus", contains("GUEST", "GUEST", "GUEST")))
            .andExpect(jsonPath("$.items[*].id", contains(94002, 94001, 94005)))
            .andExpect(jsonPath("$.items[1].brand.name").value("비교 브랜드"))
            .andExpect(jsonPath("$.items[1].variants[*].id", contains(94201, 94202)))
            .andExpect(jsonPath("$.items[1].variants[*].price", contains(10000, 18000)))
            .andExpect(jsonPath("$.items[1].variants[*].volumeValue", contains(50, 100)))
            .andExpect(jsonPath("$.items[1].variants[*].volumeUnit", contains("ml", "ml")))
            .andExpect(jsonPath("$.items[1].variants[*].status", contains("active", "discontinued")))
            .andExpect(jsonPath("$.items[1].productParts[*].id", contains(94101, 94102, 94103)))
            .andExpect(jsonPath("$.items[1].selectedPart.id").value(94101))
            .andExpect(jsonPath("$.items[1].selectedPart.moistureLevel").value(0.0))
            .andExpect(jsonPath("$.items[1].selectedPart.oilLevel").value(0.5))
            .andExpect(
                jsonPath(
                    "$.items[1].selectedPart.skinEffects[*].code",
                    contains(
                        "COMPARISON_A",
                        "COMPARISON_B",
                        "COMPARISON_C"
                    )
                )
            );
    }

    @ParameterizedTest
    @CsvSource({"94101,0.0,0.5", "94102,2.0,3.0", "94103,1.5,1.0"})
    @DisplayName("1·2·3제의 선택과 유수분이 일치하고 기존 상세는 첫 구성품 값을 유지한다")
    void selectsEachPartWithItsSensory(String partId, double moisture, double oil) throws Exception {
        mockMvc.perform(get(PATH).param("productIds", "94001").param("partIds[94001]", partId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].selectedPart.id").value(Integer.valueOf(partId)))
            .andExpect(jsonPath("$.items[0].selectedPart.moistureLevel").value(moisture))
            .andExpect(jsonPath("$.items[0].selectedPart.oilLevel").value(oil));
        mockMvc.perform(get("/api/products/94001").param("partId", partId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.moistureLevel").value(0.0))
            .andExpect(jsonPath("$.oilLevel").value(0.5));
    }

    @Test
    @DisplayName("구성품 변경 시 태그·주의 성분·회원 필터를 함께 바꾼다")
    void usesSelectedPartForAllJudgments() throws Exception {
        long user = user("selected");
        myFilters.add(user, List.of(9L));
        MockHttpSession session = session(user);
        mockMvc.perform(get(PATH).session(session).param("productIds", "94001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].selectedPart.myFilterStatus").value("MATCH"))
            .andExpect(jsonPath("$.items[0].selectedPart.myFilterIngredients[*].id", contains(9)))
            .andExpect(
                jsonPath(
                    "$.items[0].selectedPart.cautionGroups[?(@.code == 'FRAGRANCE_ALLERGENS')].contains",
                    contains(true)
                )
            )
            .andExpect(jsonPath("$.items[0].selectedPart.skinEffects", hasSize(3)));
        mockMvc.perform(get(PATH).session(session).param("productIds", "94001").param("partIds[94001]", "94102"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].selectedPart.myFilterStatus").value("NO_MATCH"))
            .andExpect(jsonPath("$.items[0].selectedPart.myFilterIngredients").isEmpty())
            .andExpect(
                jsonPath(
                    "$.items[0].selectedPart.cautionGroups[?(@.code == 'FRAGRANCE_ALLERGENS')].contains",
                    contains(false)
                )
            )
            .andExpect(
                jsonPath("$.items[0].selectedPart.skinEffects[*].code").value(
                    org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.hasItem("COMPARISON_A")
                    )
                )
            );
    }

    @Test
    @DisplayName("6가지 주의 기준에 해당하는 성분 ID·이름을 제공하고 기준 사이의 중복은 허용한다")
    void includesIngredientsForEachCautionCriterion() throws Exception {
        mockMvc.perform(get(PATH).param("productIds", "94001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].selectedPart.cautionGroups", hasSize(6)))
            .andExpect(
                jsonPath(
                    "$.items[0].selectedPart.cautionGroups[?(@.code == 'FRAGRANCE_ALLERGENS')].ingredients[*].id",
                    contains(9, 20)
                )
            )
            .andExpect(
                jsonPath(
                    "$.items[0].selectedPart.cautionGroups[?(@.code == 'FRAGRANCE_ALLERGENS')].ingredients[*].koreanName",
                    contains("리날룰", "리모넨")
                )
            )
            .andExpect(
                jsonPath(
                    "$.items[0].selectedPart.cautionGroups[?(@.code == 'SULFATES')].ingredients[*].id",
                    contains(9)
                )
            );
    }

    @Test
    @DisplayName("제외 성분 없음·구성품에 일치 성분 없음·일치 성분 있음을 구분하고 최신 회원 필터를 읽는다")
    void separatesMemberFilterStatesAndMembers() throws Exception {
        long first = user("first");
        long second = user("second");
        MockHttpSession firstSession = session(first);
        mockMvc.perform(get(PATH).session(firstSession).param("productIds", "94001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].selectedPart.myFilterStatus").value("NO_FILTER"))
            .andExpect(jsonPath("$.items[0].selectedPart.myFilterIngredients").isEmpty());
        myFilters.add(first, List.of(4815L));
        myFilters.add(second, List.of(9L));
        mockMvc.perform(get(PATH).session(firstSession).param("productIds", "94001"))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.items[0].selectedPart.myFilterStatus").value("NO_MATCH"))
            .andExpect(jsonPath("$.items[0].selectedPart.myFilterIngredients").isEmpty());
        mockMvc.perform(get(PATH).session(session(second)).param("productIds", "94001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].selectedPart.myFilterStatus").value("MATCH"))
            .andExpect(jsonPath("$.items[0].selectedPart.myFilterIngredients[*].id", contains(9)));
        myFilters.remove(first, List.of(4815L));
        mockMvc.perform(get(PATH).session(firstSession).param("productIds", "94001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].selectedPart.myFilterStatus").value("NO_FILTER"));
    }

    @Test
    @DisplayName("같은 응답의 제품마다 내 필터 일치 결과를 구분하고 구성품을 바꾸면 다시 판정한다")
    void returnsFilterMatchForEachSelectedPart() throws Exception {
        long id = user("mixed-match");
        myFilters.add(id, List.of(9L));
        MockHttpSession session = session(id);

        mockMvc.perform(get(PATH).session(session).param("productIds", "94001,94002"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.myFilterStatus").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.items[*].selectedPart.myFilterStatus", contains("MATCH", "NO_MATCH")))
            .andExpect(jsonPath("$.items[0].selectedPart.myFilterIngredients[*].id", contains(9)))
            .andExpect(jsonPath("$.items[1].selectedPart.myFilterIngredients").isEmpty());

        mockMvc.perform(get(PATH).session(session).param("productIds", "94001,94002").param("partIds[94001]", "94102"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].selectedPart.myFilterStatus", contains("NO_MATCH", "NO_MATCH")))
            .andExpect(jsonPath("$.items[0].selectedPart.myFilterIngredients").isEmpty());
    }

    @Test
    @DisplayName("성분이 없는 구성품과 구성품 없는 제품, 유수분 미제공 카테고리를 구분한다")
    void supportsMissingPartsEmptyIngredientsAndUnavailableSensory() throws Exception {
        mockMvc.perform(get(PATH).param("productIds", "94004", "94005", "94003"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].productParts").isEmpty())
            .andExpect(jsonPath("$.items[0].selectedPart").value(nullValue()))
            .andExpect(jsonPath("$.items[1].selectedPart.name").value(nullValue()))
            .andExpect(jsonPath("$.items[1].selectedPart.skinEffects").isEmpty())
            .andExpect(
                jsonPath(
                    "$.items[1].selectedPart.cautionGroups[*].contains",
                    contains(false, false, false, false, false, false)
                )
            )
            .andExpect(jsonPath("$.items[1].selectedPart.moistureLevel").value(0.0))
            .andExpect(jsonPath("$.items[2].selectedPart.moistureLevel").value(nullValue()))
            .andExpect(jsonPath("$.items[2].selectedPart.oilLevel").value(nullValue()));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"94001,94002,94003,94004", "94001,94001", "0", "-1", "abc", "94001,,94002", "94001,"})
    @DisplayName("누락·빈 목록·개수 초과·중복·잘못된 제품 ID를 거절한다")
    void validatesProductIds(String ids) throws Exception {
        MockHttpServletRequestBuilder request = get(PATH);
        if (ids != null) {
            request.param("productIds", ids);
        }
        mockMvc.perform(request)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"))
            .andExpect(header().string("Cache-Control", "no-store"));
    }

    @ParameterizedTest
    @CsvSource({"94001,0", "94001,-1", "94001,abc", "94002,94104", "0,94101", "abc,94101"})
    @DisplayName("구성품 선택 맵의 유효하지 않은 키·값과 요청에 없는 제품을 거절한다")
    void validatesPartSelectionMap(String productId, String partId) throws Exception {
        mockMvc.perform(get(PATH).param("productIds", "94001").param("partIds[" + productId + "]", partId))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"999999", "94104"})
    @DisplayName("존재하지 않거나 다른 제품에 속한 구성품은 404이다")
    void rejectsMissingOrForeignParts(String partId) throws Exception {
        mockMvc.perform(get(PATH).param("productIds", "94001").param("partIds[94001]", partId))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("PRODUCT_PART_NOT_FOUND"))
            .andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test
    @DisplayName("존재하지 않는 제품을 빼고 성공하지 않는다")
    void rejectsAnyMissingProduct() throws Exception {
        mockMvc.perform(get(PATH).param("productIds", "94001,999999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"))
            .andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test
    @DisplayName("비활성 회원 세션은 종료하고 401과 캐시 금지를 반환한다")
    void rejectsAndSignsOutInactiveMember() throws Exception {
        long id = user("inactive");
        MockHttpSession session = session(id);
        jdbc.update("update \"user\" set deleted_at = now() where id = ?", id);
        mockMvc.perform(get(PATH).session(session).param("productIds", "94001"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
            .andExpect(header().string("Cache-Control", "no-store"));
        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("삭제되었거나 없는 회원의 인증도 개인화에 사용하지 않는다")
    void rejectsMissingMember() throws Exception {
        mockMvc.perform(
            get(PATH).param("productIds", "94001")
                .with(authentication(new com.poudy.security.session.LoginMember(Long.MAX_VALUE).toAuthentication()))
        )
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("카테고리·목록에서 숨긴 마크·민감성 피부용 여부·갱신 시각을 구성품 유무와 무관하게 제공한다")
    void includesAllProductMetadata() throws Exception {
        String updatedAt = jdbc.queryForObject("select updated_at from product where id = 94002", LocalDateTime.class)
            .atOffset(ZoneOffset.ofHours(9)).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        mockMvc.perform(get(PATH).param("productIds", "94002,94001,94004"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].categories[0].id").value(13))
            .andExpect(jsonPath("$.items[0].categories[0].name").value("선케어"))
            .andExpect(jsonPath("$.items[0].categories[0].child.id").value(14))
            .andExpect(jsonPath("$.items[0].categories[0].child.name").value("선크림"))
            .andExpect(jsonPath("$.items[0].marks[*].code", contains("MINERAL", "EASY_WASH", "WATERPROOF", "DAISO")))
            .andExpect(jsonPath("$.items[0].marks[*].name", contains("무기자차", "이지워시", "워터프루프", "다이소")))
            .andExpect(jsonPath("$.items[0].sensitiveSkin").value(true))
            .andExpect(jsonPath("$.items[0].updatedAt").value(updatedAt))
            .andExpect(jsonPath("$.items[1].categories[0].child.id").value(2))
            .andExpect(jsonPath("$.items[1].marks").isEmpty())
            .andExpect(jsonPath("$.items[1].sensitiveSkin").value(false))
            .andExpect(jsonPath("$.items[2].selectedPart").value(nullValue()))
            .andExpect(jsonPath("$.items[2].categories[0].child.id").value(2))
            .andExpect(jsonPath("$.items[2].marks").isEmpty());
    }

    @Test
    @DisplayName("전성분·제조 정보·추천·저장 상태는 응답에 포함하지 않는다")
    void excludesUnneededDetails() throws Exception {
        var result = mockMvc.perform(get(PATH).param("productIds", "94001")).andExpect(status().isOk());
        for (String field : List.of(
            "manufacturer",
            "manufacturingCountry",
            "similarProducts",
            "wishlisted",
            "shelved"
        )) {
            result.andExpect(jsonPath("$.items[0]." + field).doesNotExist());
        }
        result.andExpect(jsonPath("$.items[0].selectedPart.ingredients").doesNotExist())
            .andExpect(jsonPath("$.items[0].selectedPart.concernGroups").doesNotExist());
    }

    private long user(String suffix) {
        return users.save(
            UserSignup.from(
                new OAuthAccount(
                    OAuthProvider.KAKAO,
                    "comparison-" + suffix,
                    "comparison-" + suffix + "@example.com",
                    true
                )
            ),
            UserNicknameTestFixture.nickname()
        ).orElseThrow().id();
    }

    private MockHttpSession session(long userId) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        loginSession.signIn(userId, LoginChannel.WEB, request, new MockHttpServletResponse());
        SecurityContextHolder.clearContext();
        return (MockHttpSession) request.getSession();
    }
}
