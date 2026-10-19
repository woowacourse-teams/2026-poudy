package com.poudy.shelf.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.curation.controller.dto.CurationProductResponse;
import com.poudy.product.repository.ProductRepository;
import com.poudy.productview.controller.dto.ProductRankingProductResponse;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginMember;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("향수·클렌징 유수분 정책")
class UnsupportedSensoryRatingTest {

    private static final String SHELF = "/api/users/me/shelf/products";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private UserRepository users;
    @Autowired
    private ProductRepository products;
    private User user;

    @BeforeEach
    void signUp() {
        user = users
            .save(UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "sensory-test", "sensory@example.com", true)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"향수", "클렌징"})
    @DisplayName("상세·목록·랭킹·큐레이션에서 기존 추론값을 제공하지 않는다")
    void hidesSensoryInProductResponses(String category) throws Exception {
        moveProductTo(category);
        mockMvc.perform(get("/api/products/15"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.moistureLevel").value(nullValue()))
            .andExpect(jsonPath("$.oilLevel").value(nullValue()));
        mockMvc.perform(get("/api/products").param("categoryIds", "91000"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].moistureLevel").value(nullValue()))
            .andExpect(jsonPath("$.items[0].oilLevel").value(nullValue()));
        var product = products.findById(15L).orElseThrow();
        assertThat(ProductRankingProductResponse.from(product).moistureLevel()).isNull();
        assertThat(ProductRankingProductResponse.from(product).oilLevel()).isNull();
        assertThat(CurationProductResponse.from(product).moistureLevel()).isNull();
        assertThat(CurationProductResponse.from(product).oilLevel()).isNull();
    }

    @ParameterizedTest
    @CsvSource({"향수,moistureLevel", "향수,oilLevel", "클렌징,moistureLevel", "클렌징,oilLevel"})
    @DisplayName("유수분 필터를 적용하면 목록·개수에서 제외한다")
    void excludesFromSensoryFilters(String category, String field) throws Exception {
        moveProductTo(category);
        mockMvc.perform(get("/api/products").param("categoryIds", "91000").param(field, "0"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(0));
        mockMvc.perform(get("/api/products/count").param("categoryIds", "91000").param(field, "0"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
    }

    @ParameterizedTest
    @CsvSource({"향수,0,null", "향수,null,0", "향수,2,1", "클렌징,0,null", "클렌징,null,0", "클렌징,2,1"})
    @DisplayName("등록에 유수분 값을 하나라도 보내면 400으로 거절하고 저장하지 않는다")
    void rejectsAdd(String category, String moisture, String oil) throws Exception {
        moveProductTo(category);
        mockMvc.perform(
            post(SHELF).with(signedIn()).contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"productId":15,"usageStatus":"IN_USE","preference":"GOOD","moistureLevel":%s,"oilLevel":%s}
                    """.formatted(moisture, oil))
        )
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
        assertThat(
            jdbc.queryForObject("select count(*) from user_shelf_product where user_id = ?", Integer.class, user.id())
        ).isZero();
    }

    @ParameterizedTest
    @CsvSource({"향수,0,null", "향수,null,0", "향수,2,1", "클렌징,0,null", "클렌징,null,0", "클렌징,2,1"})
    @DisplayName("평가 수정에 유수분 값을 보내면 선호도·사용 상태도 변경하지 않는다")
    void rejectsUpdateAtomically(String category, String moisture, String oil) throws Exception {
        moveProductTo(category);
        addWithoutSensory();
        mockMvc.perform(
            put(SHELF + "/15").with(signedIn()).contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"usageStatus":"USED","preference":"BAD","moistureLevel":%s,"oilLevel":%s}
                    """.formatted(moisture, oil))
        )
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
        mockMvc.perform(get(SHELF).with(signedIn()))
            .andExpect(jsonPath("$.items[0].usageStatus").value("IN_USE"))
            .andExpect(jsonPath("$.items[0].rating.preference").value("GOOD"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"향수", "클렌징"})
    @DisplayName("기존 유수분 평가는 숨기고 선호도와 사용 상태는 계속 수정할 수 있다")
    void hidesLegacyRatingAndAllowsPreferenceUpdates(String category) throws Exception {
        moveProductTo(category);
        addWithoutSensory();
        jdbc.update(
            "update user_shelf_product set rating_moisture_level = 2, rating_oil_level = 1 where user_id = ?",
            user.id()
        );
        mockMvc.perform(get(SHELF).with(signedIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].product.sensorySupported").value(false))
            .andExpect(jsonPath("$.items[0].rating.preference").value("GOOD"))
            .andExpect(jsonPath("$.items[0].rating.moistureLevel").value(nullValue()))
            .andExpect(jsonPath("$.items[0].rating.oilLevel").value(nullValue()));
        mockMvc.perform(
            put(SHELF + "/15").with(signedIn()).contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"usageStatus":"USED","preference":"BAD","moistureLevel":null,"oilLevel":null}
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.usageStatus").value("USED"))
            .andExpect(jsonPath("$.rating.preference").value("BAD"));
    }

    private void moveProductTo(String category) {
        jdbc.update("insert into category (id, parent_id, name, depth) values (91000, null, ?, 0)", category);
        jdbc.update("insert into category (id, parent_id, name, depth) values (91001, 91000, '하위 분류', 1)");
        jdbc.update("update product set category_id = 91001, moisture_level = 0, oil_level = 0 where id = 15");
    }

    private void addWithoutSensory() throws Exception {
        mockMvc.perform(
            post(SHELF).with(signedIn()).contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"productId":15,"usageStatus":"IN_USE","preference":"GOOD"}
                    """)
        )
            .andExpect(status().isCreated()).andExpect(jsonPath("$.product.sensorySupported").value(false));
    }

    private RequestPostProcessor signedIn() {
        return authentication(new LoginMember(user.id()).toAuthentication());
    }
}
