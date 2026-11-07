package com.poudy.routine.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginMember;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import com.poudy.user.support.UserNicknameTestFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("루틴 API")
class RoutineControllerTest {

    private static final String PATH = "/api/users/me/routines";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User user;
    private User otherUser;

    @BeforeEach
    void signUp() {
        user = signUp("4321");
        otherUser = signUp("8765");
    }

    @Test
    @DisplayName("루틴을 만들면 201 로 메모와 구간별 제품을 순서대로 돌려준다")
    void createsRoutine() throws Exception {
        create(user, """
            {"name": " 평소 루틴 ", "memo": "평일에 써요.", "isPublic": true,
             "morningProductIds": [15, 1], "eveningProductIds": [1]}
            """)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("평소 루틴"))
            .andExpect(jsonPath("$.memo").value("평일에 써요."))
            .andExpect(jsonPath("$.isPublic").value(true))
            .andExpect(jsonPath("$.morning[0].id").value(15L))
            .andExpect(jsonPath("$.morning[0].name").value("PH 컨디션 토너"))
            .andExpect(jsonPath("$.morning[1].id").value(1L))
            .andExpect(jsonPath("$.morning[1].brandName").isString())
            .andExpect(jsonPath("$.evening[0].id").value(1L));
    }

    @Test
    @DisplayName("아침과 저녁을 모두 비우고 메모 없이 만들 수 있다")
    void createsEmptyRoutine() throws Exception {
        create(user, """
            {"name": "여행용", "isPublic": false}
            """)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.memo").isEmpty())
            .andExpect(jsonPath("$.isPublic").value(false))
            .andExpect(jsonPath("$.morning").isEmpty())
            .andExpect(jsonPath("$.evening").isEmpty());
    }

    @Test
    @DisplayName("이름이 25자를 넘거나 한 구간에 같은 제품이 두 번이면 400 으로 거절한다")
    void rejectsInvalidRoutine() throws Exception {
        create(user, "{\"name\": \"" + "가".repeat(26) + "\", \"isPublic\": false}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("ROUTINE_NAME_TOO_LONG"));
        create(user, """
            {"name": "평소 루틴", "isPublic": false, "morningProductIds": [1, 1]}
            """)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("DUPLICATE_ROUTINE_PRODUCT"));
        create(user, """
            {"name": "평소 루틴", "isPublic": false, "eveningProductIds": [999999]}
            """)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));

        assertThat(routineCount()).isZero();
    }

    @Test
    @DisplayName("내 루틴만 최근 만든 순으로 돌려준다")
    void findsMineByRecentCreation() throws Exception {
        long older = createdId(user, "{\"name\": \"평소 루틴\", \"isPublic\": false, \"morningProductIds\": [1]}");
        long newer = createdId(user, "{\"name\": \"여행용\", \"isPublic\": true}");
        createdId(otherUser, "{\"name\": \"남의 루틴\", \"isPublic\": true}");
        jdbcTemplate.update("update routine set created_at = created_at - interval '1 minute' where id = ?", older);

        mockMvc.perform(get(PATH).with(signedIn(user)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(2))
            .andExpect(jsonPath("$.items[0].id").value(newer))
            .andExpect(jsonPath("$.items[1].id").value(older))
            .andExpect(jsonPath("$.items[1].morning[0].imageUrl").isString())
            .andExpect(jsonPath("$.items[1].memo").doesNotExist());
    }

    @Test
    @DisplayName("내 루틴 목록은 페이지로 나눠 준다")
    void findsMineByPage() throws Exception {
        long oldest = createdId(user, "{\"name\": \"첫 루틴\", \"isPublic\": false}");
        long middle = createdId(user, "{\"name\": \"둘째 루틴\", \"isPublic\": false}");
        createdId(user, "{\"name\": \"셋째 루틴\", \"isPublic\": false}");
        jdbcTemplate.update("update routine set created_at = created_at - interval '2 minute' where id = ?", oldest);
        jdbcTemplate.update("update routine set created_at = created_at - interval '1 minute' where id = ?", middle);

        mockMvc.perform(get(PATH).param("page", "2").param("size", "2").with(signedIn(user)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].id").value(oldest))
            .andExpect(jsonPath("$.pagination.totalElements").value(3))
            .andExpect(jsonPath("$.pagination.hasNext").value(false));
    }

    @Test
    @DisplayName("이름·메모·공개 여부를 바꾸고 메모를 비우면 지운다")
    void updatesRoutine() throws Exception {
        long routineId = createdId(user, "{\"name\": \"평소 루틴\", \"memo\": \"메모\", \"isPublic\": false}");

        mockMvc.perform(
            put(PATH + "/" + routineId).with(signedIn(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "저녁 진정 루틴", "memo": "", "isPublic": true}
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("저녁 진정 루틴"))
            .andExpect(jsonPath("$.memo").isEmpty())
            .andExpect(jsonPath("$.isPublic").value(true));
    }

    @Test
    @DisplayName("구간 제품을 통째로 바꿔 추가·빼기·순서 변경·구간 이동을 한 번에 반영한다")
    void replacesProducts() throws Exception {
        long routineId = createdId(user, "{\"name\": \"평소 루틴\", \"isPublic\": false, \"morningProductIds\": [1, 15]}");

        replaceProducts(user, routineId, "{\"morningProductIds\": [15], \"eveningProductIds\": [1, 15]}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.morning.length()").value(1))
            .andExpect(jsonPath("$.morning[0].id").value(15L))
            .andExpect(jsonPath("$.evening[0].id").value(1L))
            .andExpect(jsonPath("$.evening[1].id").value(15L));

        mockMvc.perform(get(PATH + "/" + routineId).with(signedIn(user)))
            .andExpect(jsonPath("$.morning[0].id").value(15L))
            .andExpect(jsonPath("$.evening.length()").value(2));
    }

    @Test
    @DisplayName("구간 제품 바꾸기는 중복·없는 제품·남의 루틴을 거절하고 원래 제품을 남긴다")
    void rejectsInvalidProductReplacement() throws Exception {
        long routineId = createdId(user, "{\"name\": \"평소 루틴\", \"isPublic\": false, \"morningProductIds\": [1]}");
        long othersRoutineId = createdId(otherUser, "{\"name\": \"남의 루틴\", \"isPublic\": true}");

        replaceProducts(user, routineId, "{\"morningProductIds\": [15, 15], \"eveningProductIds\": []}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("DUPLICATE_ROUTINE_PRODUCT"));
        replaceProducts(user, routineId, "{\"morningProductIds\": [999999], \"eveningProductIds\": []}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
        replaceProducts(user, routineId, "{\"morningProductIds\": []}")
            .andExpect(status().isBadRequest());
        replaceProducts(user, othersRoutineId, "{\"morningProductIds\": [1], \"eveningProductIds\": []}")
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("ROUTINE_NOT_FOUND"));

        mockMvc.perform(get(PATH + "/" + routineId).with(signedIn(user)))
            .andExpect(jsonPath("$.morning[0].id").value(1L));
    }

    @Test
    @DisplayName("루틴을 삭제하면 담은 제품도 함께 지운다")
    void deletesRoutine() throws Exception {
        long routineId = createdId(user, "{\"name\": \"평소 루틴\", \"isPublic\": false, \"morningProductIds\": [1, 15]}");

        mockMvc.perform(delete(PATH + "/" + routineId).with(signedIn(user))).andExpect(status().isNoContent());

        assertThat(routineCount()).isZero();
        assertThat(jdbcTemplate.queryForObject("select count(*) from routine_product", Integer.class)).isZero();
    }

    @Test
    @DisplayName("남의 루틴이나 없는 루틴은 조회·수정·삭제를 404 로 거절한다")
    void rejectsOthersRoutine() throws Exception {
        long routineId = createdId(otherUser, "{\"name\": \"남의 루틴\", \"isPublic\": true}");

        mockMvc.perform(get(PATH + "/" + routineId).with(signedIn(user)))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("ROUTINE_NOT_FOUND"));
        mockMvc.perform(
            put(PATH + "/" + routineId).with(signedIn(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\": \"가로채기\", \"isPublic\": false}")
        )
            .andExpect(status().isNotFound());
        mockMvc.perform(delete(PATH + "/" + routineId).with(signedIn(user))).andExpect(status().isNotFound());
        mockMvc.perform(get(PATH + "/999999").with(signedIn(user))).andExpect(status().isNotFound());

        assertThat(routineCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("로그인하지 않으면 401 로 거절한다")
    void requiresLogin() throws Exception {
        mockMvc.perform(get(PATH)).andExpect(status().isUnauthorized());
        mockMvc
            .perform(
                post(PATH).contentType(MediaType.APPLICATION_JSON).content("{\"name\": \"루틴\", \"isPublic\": false}")
            )
            .andExpect(status().isUnauthorized());
    }

    private User signUp(String providerId) {
        return userRepository.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, providerId, providerId + "@example.com", true)),
            UserNicknameTestFixture.nickname()
        ).orElseThrow();
    }

    private ResultActions create(User owner, String body) throws Exception {
        return mockMvc.perform(post(PATH).with(signedIn(owner)).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions replaceProducts(User owner, long routineId, String body) throws Exception {
        return mockMvc.perform(
            put(PATH + "/" + routineId + "/products").with(signedIn(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
        );
    }

    private long createdId(User owner, String body) throws Exception {
        String response = create(owner, body).andExpect(status().isCreated()).andReturn().getResponse()
            .getContentAsString();
        return ((Number) JsonPath.read(response, "$.id")).longValue();
    }

    private int routineCount() {
        return jdbcTemplate.queryForObject("select count(*) from routine", Integer.class);
    }

    private RequestPostProcessor signedIn(User owner) {
        return authentication(new LoginMember(owner.id()).toAuthentication());
    }
}
