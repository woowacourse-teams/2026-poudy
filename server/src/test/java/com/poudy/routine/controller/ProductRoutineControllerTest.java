package com.poudy.routine.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
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
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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
@DisplayName("제품을 담은 공개 루틴 API")
class ProductRoutineControllerTest {

    private static final long PRODUCT_ID = 1L;
    private static final long OTHER_PRODUCT_ID = 15L;
    private static final String PATH = "/api/products/" + PRODUCT_ID + "/routines";
    private static final String MY_PATH = "/api/users/me/routines";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User author;
    private User reader;
    private User another;

    @BeforeEach
    void signUp() {
        author = signUp("1111");
        reader = signUp("2222");
        another = signUp("3333");
    }

    @Test
    @DisplayName("제품을 담은 공개 루틴을 좋아요가 많은 순으로 3개까지 주고, 같으면 최신순이며 좋아요가 없는 루틴도 넣는다")
    void listsMostLikedRoutines() throws Exception {
        long liked = createdId(author, "{\"name\": \"인기 루틴\", \"isPublic\": true, \"eveningProductIds\": [1]}");
        long newest = createdId(author, "{\"name\": \"새 루틴\", \"isPublic\": true, \"morningProductIds\": [1]}");
        long older = createdId(author, "{\"name\": \"전 루틴\", \"isPublic\": true, \"morningProductIds\": [1]}");
        long oldest = createdId(author, "{\"name\": \"옛 루틴\", \"isPublic\": true, \"morningProductIds\": [1]}");
        long otherProduct = createdId(author, "{\"name\": \"다른 제품\", \"isPublic\": true, \"morningProductIds\": [15]}");
        shiftCreatedAt(liked, 4);
        shiftCreatedAt(older, 1);
        shiftCreatedAt(oldest, 2);
        like(reader, liked);
        like(another, liked);
        like(reader, otherProduct);
        like(another, otherProduct);

        assertThat(routineIds()).containsExactly(liked, newest, older);
        mockMvc.perform(get(PATH))
            .andExpect(jsonPath("$.items[0].likeCount").value(2))
            .andExpect(jsonPath("$.items[1].likeCount").value(0));
    }

    @Test
    @DisplayName("비공개 루틴과 탈퇴한 회원의 루틴은 빼고, 아침과 저녁에 모두 담은 루틴은 한 번만 준다")
    void excludesHiddenRoutinesAndDeduplicates() throws Exception {
        long both = createdId(
            author,
            "{\"name\": \"하루 종일\", \"isPublic\": true, \"morningProductIds\": [1], \"eveningProductIds\": [1]}"
        );
        createdId(author, "{\"name\": \"나만 보기\", \"isPublic\": false, \"morningProductIds\": [1]}");
        createdId(reader, "{\"name\": \"떠난 회원\", \"isPublic\": true, \"morningProductIds\": [1]}");

        userRepository.withdraw(reader.id());

        assertThat(routineIds()).containsExactly(both);
    }

    @Test
    @DisplayName("탈퇴한 회원의 좋아요는 정렬과 개수에서 뺀다")
    void ignoresWithdrawnLikes() throws Exception {
        long older = createdId(author, "{\"name\": \"전 루틴\", \"isPublic\": true, \"morningProductIds\": [1]}");
        long newer = createdId(author, "{\"name\": \"새 루틴\", \"isPublic\": true, \"morningProductIds\": [1]}");
        shiftCreatedAt(older, 1);
        like(reader, older);

        userRepository.withdraw(reader.id());

        assertThat(routineIds()).containsExactly(newer, older);
        mockMvc.perform(get(PATH)).andExpect(jsonPath("$.items[1].likeCount").value(0));
    }

    @Test
    @DisplayName("로그인 없이 둘러보기 카드와 같은 형태로 주고 메모·좋아요 여부·댓글은 넣지 않는다")
    void showsSharedRoutineCard() throws Exception {
        long routineId = createdId(
            author,
            "{\"name\": \"저녁 진정\", \"memo\": \"비밀 메모\", \"isPublic\": true,"
                + " \"morningProductIds\": [15, 1], \"eveningProductIds\": [1]}"
        );
        mockMvc.perform(
            post(MY_PATH + "/" + routineId + "/comments").with(signedIn(reader))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\": \"궁금해요\"}")
        ).andExpect(status().isCreated());

        mockMvc.perform(get(PATH))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].id").value(routineId))
            .andExpect(jsonPath("$.items[0].name").value("저녁 진정"))
            .andExpect(jsonPath("$.items[0].author.nickname").value(author.nickname()))
            .andExpect(jsonPath("$.items[0].likeCount").value(0))
            .andExpect(jsonPath("$.items[0].commentCount").value(1))
            .andExpect(jsonPath("$.items[0].morning[0].id").value(OTHER_PRODUCT_ID))
            .andExpect(jsonPath("$.items[0].morning[1].id").value(PRODUCT_ID))
            .andExpect(jsonPath("$.items[0].evening[0].id").value(PRODUCT_ID))
            .andExpect(jsonPath("$.items[0].memo").doesNotExist())
            .andExpect(jsonPath("$.items[0].liked").doesNotExist())
            .andExpect(jsonPath("$.items[0].comments").doesNotExist());
    }

    @Test
    @DisplayName("제품을 담은 공개 루틴이 없으면 빈 목록이다")
    void returnsEmptyWithoutRoutines() throws Exception {
        createdId(author, "{\"name\": \"다른 제품\", \"isPublic\": true, \"morningProductIds\": [15]}");

        mockMvc.perform(get(PATH))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty());
    }

    private List<Long> routineIds() throws Exception {
        String body = mockMvc.perform(get(PATH))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        List<Number> ids = JsonPath.read(body, "$.items[*].id");
        return ids.stream().map(Number::longValue).toList();
    }

    private void shiftCreatedAt(long routineId, int minutes) {
        jdbcTemplate.update(
            "update routine set created_at = created_at - make_interval(mins => ?) where id = ?",
            minutes,
            routineId
        );
    }

    private void like(User owner, long routineId) throws Exception {
        mockMvc.perform(put(MY_PATH + "/" + routineId + "/like").with(signedIn(owner)))
            .andExpect(status().isNoContent());
    }

    private User signUp(String providerId) {
        return userRepository.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, providerId, providerId + "@example.com", true)),
            UserNicknameTestFixture.nickname()
        ).orElseThrow();
    }

    private long createdId(User owner, String body) throws Exception {
        String response = mockMvc.perform(
            post(MY_PATH).with(signedIn(owner)).contentType(MediaType.APPLICATION_JSON).content(body)
        ).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(response, "$.id")).longValue();
    }

    private RequestPostProcessor signedIn(User owner) {
        return authentication(new LoginMember(owner.id()).toAuthentication());
    }
}
