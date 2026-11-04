package com.poudy.routine.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("공개 루틴 API")
class SharedRoutineControllerTest {

    private static final String PATH = "/api/routines";
    private static final String MY_PATH = "/api/users/me/routines";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User author;
    private User reader;

    @BeforeEach
    void signUp() {
        author = signUp("1111");
        reader = signUp("2222");
    }

    @Test
    @DisplayName("둘러보기는 제품이 있는 공개 루틴만 최신순으로 작성자와 함께 돌려준다")
    void listsSharedRoutines() throws Exception {
        long older = createdId(author, "{\"name\": \"평소 루틴\", \"isPublic\": true, \"morningProductIds\": [1]}");
        long newer = createdId(author, "{\"name\": \"저녁 진정\", \"isPublic\": true, \"eveningProductIds\": [15]}");
        long hidden = createdId(author, "{\"name\": \"나만 보기\", \"isPublic\": false, \"morningProductIds\": [1]}");
        long empty = createdId(author, "{\"name\": \"빈 루틴\", \"isPublic\": true}");
        jdbcTemplate.update("update routine set created_at = created_at - interval '1 minute' where id = ?", older);

        String body = mockMvc.perform(get(PATH))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pagination.page").value(1))
            .andReturn().getResponse().getContentAsString();

        List<Number> ids = JsonPath.read(body, "$.items[*].id");
        assertThat(ids.stream().map(Number::longValue).toList())
            .containsSubsequence(newer, older)
            .doesNotContain(hidden, empty);
        assertThat((List<String>) JsonPath.read(body, "$.items[?(@.id == " + newer + ")].author.nickname"))
            .containsExactly(author.nickname());
        assertThat((List<Object>) JsonPath.read(body, "$.items[?(@.id == " + newer + ")].memo")).isEmpty();
    }

    @Test
    @DisplayName("공개 상세는 메모 없이 열리고 제품이 없어도 열린다")
    void findsSharedRoutineWithoutMemo() throws Exception {
        long routineId = createdId(author, "{\"name\": \"빈 루틴\", \"memo\": \"비밀 메모\", \"isPublic\": true}");

        mockMvc.perform(get(PATH + "/" + routineId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("빈 루틴"))
            .andExpect(jsonPath("$.author.nickname").value(author.nickname()))
            .andExpect(jsonPath("$.memo").doesNotExist())
            .andExpect(jsonPath("$.morning").isEmpty());
    }

    @Test
    @DisplayName("비공개 루틴과 탈퇴한 회원의 루틴은 404 로 숨긴다")
    void hidesPrivateAndWithdrawnRoutines() throws Exception {
        long hidden = createdId(author, "{\"name\": \"나만 보기\", \"isPublic\": false, \"morningProductIds\": [1]}");
        long shared = createdId(author, "{\"name\": \"평소 루틴\", \"isPublic\": true, \"morningProductIds\": [1]}");

        mockMvc.perform(get(PATH + "/" + hidden))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("ROUTINE_NOT_FOUND"));

        userRepository.withdraw(author.id());

        mockMvc.perform(get(PATH + "/" + shared)).andExpect(status().isNotFound());
        String body = mockMvc.perform(get(PATH)).andReturn().getResponse().getContentAsString();
        List<Number> ids = JsonPath.read(body, "$.items[*].id");
        assertThat(ids.stream().map(Number::longValue).toList()).doesNotContain(shared);
    }

    @Test
    @DisplayName("가져오기는 제품과 순서를 복사하고 '닉네임 - 이름'의 비공개 루틴을 메모 없이 만든다")
    void importsSharedRoutine() throws Exception {
        long shared = createdId(
            author,
            "{\"name\": \"저녁 진정\", \"memo\": \"비밀 메모\", \"isPublic\": true,"
                + " \"morningProductIds\": [15, 1], \"eveningProductIds\": [1]}"
        );

        importRoutine(reader, shared)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value(author.nickname() + " - 저녁 진정"))
            .andExpect(jsonPath("$.memo").isEmpty())
            .andExpect(jsonPath("$.isPublic").value(false))
            .andExpect(jsonPath("$.morning[0].id").value(15L))
            .andExpect(jsonPath("$.morning[1].id").value(1L))
            .andExpect(jsonPath("$.evening[0].id").value(1L));
        importRoutine(reader, shared).andExpect(status().isCreated());

        assertThat(
            jdbcTemplate.queryForObject(
                "select count(*) from routine where user_id = ?",
                Integer.class,
                reader.id()
            )
        ).isEqualTo(2);
    }

    @Test
    @DisplayName("비공개 루틴은 가져올 수 없고 가져오기는 로그인이 필요하다")
    void rejectsInvalidImport() throws Exception {
        long hidden = createdId(author, "{\"name\": \"나만 보기\", \"isPublic\": false, \"morningProductIds\": [1]}");

        importRoutine(reader, hidden)
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("ROUTINE_NOT_FOUND"));
        mockMvc.perform(
            post(MY_PATH + "/imports").contentType(MediaType.APPLICATION_JSON)
                .content("{\"routineId\": " + hidden + "}")
        ).andExpect(status().isUnauthorized());
    }

    private User signUp(String providerId) {
        return userRepository.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, providerId, providerId + "@example.com", true)),
            UserNicknameTestFixture.nickname()
        ).orElseThrow();
    }

    private ResultActions importRoutine(User owner, long routineId) throws Exception {
        return mockMvc.perform(
            post(MY_PATH + "/imports").with(signedIn(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"routineId\": " + routineId + "}")
        );
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
