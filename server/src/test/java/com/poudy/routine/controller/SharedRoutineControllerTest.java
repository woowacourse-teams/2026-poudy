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
    @DisplayName("공개 상세는 메모와 함께 열리고 제품이 없어도 열린다")
    void findsSharedRoutineWithoutMemo() throws Exception {
        long routineId = createdId(author, "{\"name\": \"빈 루틴\", \"memo\": \"비밀 메모\", \"isPublic\": true}");

        mockMvc.perform(get(PATH + "/" + routineId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("빈 루틴"))
            .andExpect(jsonPath("$.author.nickname").value(author.nickname()))
            .andExpect(jsonPath("$.memo").value("비밀 메모"))
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
    @DisplayName("가져오기는 제품·순서·메모를 복사하고 '닉네임 - 이름'의 비공개 루틴을 만든다")
    void importsSharedRoutine() throws Exception {
        long shared = createdId(
            author,
            "{\"name\": \"저녁 진정\", \"memo\": \"비밀 메모\", \"isPublic\": true,"
                + " \"morningProductIds\": [15, 1], \"eveningProductIds\": [1]}"
        );

        importRoutine(reader, shared)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value(author.nickname() + " - 저녁 진정"))
            .andExpect(jsonPath("$.memo").value("비밀 메모"))
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

    @Test
    @DisplayName("좋아요는 반복해도 하나로 세고, 취소하면 빠지며, 공개 상세에 내 좋아요 여부를 준다")
    void likesRoutine() throws Exception {
        long shared = createdId(author, "{\"name\": \"평소 루틴\", \"isPublic\": true, \"morningProductIds\": [1]}");

        mockMvc.perform(put(MY_PATH + "/" + shared + "/like").with(signedIn(reader))).andExpect(status().isNoContent());
        mockMvc.perform(put(MY_PATH + "/" + shared + "/like").with(signedIn(reader))).andExpect(status().isNoContent());

        mockMvc.perform(get(PATH + "/" + shared).with(signedIn(reader)))
            .andExpect(jsonPath("$.likeCount").value(1))
            .andExpect(jsonPath("$.liked").value(true));
        mockMvc.perform(get(PATH + "/" + shared))
            .andExpect(jsonPath("$.liked").value(false));

        mockMvc.perform(delete(MY_PATH + "/" + shared + "/like").with(signedIn(reader)))
            .andExpect(status().isNoContent());
        mockMvc.perform(delete(MY_PATH + "/" + shared + "/like").with(signedIn(reader)))
            .andExpect(status().isNoContent());
        mockMvc.perform(get(PATH + "/" + shared)).andExpect(jsonPath("$.likeCount").value(0));
    }

    @Test
    @DisplayName("공개 상세와 댓글에 작성자 피부 타입을 주고, 입력하지 않았으면 null 이다")
    void showsAuthorSkinType() throws Exception {
        jdbcTemplate.update("update \"user\" set skin_type = 'COMBINATION' where id = ?", author.id());
        long shared = createdId(author, "{\"name\": \"평소 루틴\", \"isPublic\": true, \"morningProductIds\": [1]}");
        writeComment(author, shared, "작성자 댓글").andExpect(jsonPath("$.author.skinType").value("COMBINATION"));
        writeComment(reader, shared, "독자 댓글").andExpect(jsonPath("$.author.skinType").isEmpty());

        mockMvc.perform(get(PATH + "/" + shared))
            .andExpect(jsonPath("$.author.skinType").value("COMBINATION"))
            .andExpect(jsonPath("$.comments[0].author.skinType").value("COMBINATION"));
    }

    @Test
    @DisplayName("탈퇴한 회원의 좋아요와 댓글은 개수에서 뺀다")
    void excludesWithdrawnReactions() throws Exception {
        long shared = createdId(author, "{\"name\": \"평소 루틴\", \"isPublic\": true, \"morningProductIds\": [1]}");
        mockMvc.perform(put(MY_PATH + "/" + shared + "/like").with(signedIn(reader))).andExpect(status().isNoContent());
        writeComment(reader, shared, "좋아요").andExpect(status().isCreated());

        userRepository.withdraw(reader.id());

        mockMvc.perform(get(PATH + "/" + shared))
            .andExpect(jsonPath("$.likeCount").value(0))
            .andExpect(jsonPath("$.commentCount").value(0))
            .andExpect(jsonPath("$.comments").isEmpty());
    }

    @Test
    @DisplayName("비공개 루틴에는 좋아요와 댓글을 남길 수 없고, 로그인이 필요하다")
    void rejectsReactionsOnPrivateRoutine() throws Exception {
        long hidden = createdId(author, "{\"name\": \"나만 보기\", \"isPublic\": false, \"morningProductIds\": [1]}");

        mockMvc.perform(put(MY_PATH + "/" + hidden + "/like").with(signedIn(reader)))
            .andExpect(status().isNotFound());
        writeComment(reader, hidden, "궁금해요").andExpect(status().isNotFound());
        mockMvc.perform(get(PATH + "/" + hidden + "/comments")).andExpect(status().isNotFound());
        mockMvc.perform(put(MY_PATH + "/" + hidden + "/like")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("비공개로 바꾼 루틴의 댓글은 작성자만 보고, 새 댓글은 작성자도 남길 수 없다")
    void ownerReadsCommentsAfterHiding() throws Exception {
        long routineId = createdId(author, "{\"name\": \"평소 루틴\", \"isPublic\": true, \"morningProductIds\": [1]}");
        writeComment(reader, routineId, "궁금해요").andExpect(status().isCreated());
        mockMvc.perform(put(MY_PATH + "/" + routineId + "/like").with(signedIn(reader)))
            .andExpect(status().isNoContent());
        mockMvc.perform(
            put(MY_PATH + "/" + routineId).with(signedIn(author))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\": \"평소 루틴\", \"isPublic\": false}")
        ).andExpect(status().isOk());

        mockMvc.perform(get(PATH + "/" + routineId + "/comments").with(signedIn(author)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.writable").value(false))
            .andExpect(jsonPath("$.items[0].content").value("궁금해요"));
        mockMvc.perform(get(PATH + "/" + routineId + "/comments").with(signedIn(reader)))
            .andExpect(status().isNotFound());
        writeComment(author, routineId, "답글").andExpect(status().isNotFound());
        mockMvc.perform(get(MY_PATH).with(signedIn(author)))
            .andExpect(jsonPath("$.items[0].likeCount").value(1))
            .andExpect(jsonPath("$.items[0].commentCount").value(1));
    }

    @Test
    @DisplayName("댓글은 오래된 순으로 주고, 작성자 표시와 내 댓글 여부를 주며, 상세에는 앞의 두 개만 미리 준다")
    void writesAndListsComments() throws Exception {
        long shared = createdId(author, "{\"name\": \"평소 루틴\", \"isPublic\": true, \"morningProductIds\": [1]}");

        writeComment(reader, shared, "  토너를 먼저 쓰는 이유가 궁금해요!  ")
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.content").value("토너를 먼저 쓰는 이유가 궁금해요!"))
            .andExpect(jsonPath("$.mine").value(true))
            .andExpect(jsonPath("$.byRoutineAuthor").value(false));
        writeComment(author, shared, "가벼운 토너로 먼저 닦아내요.").andExpect(status().isCreated());
        writeComment(reader, shared, "따라 해 볼게요.").andExpect(status().isCreated());

        mockMvc.perform(get(PATH + "/" + shared + "/comments").with(signedIn(reader)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.writable").value(true))
            .andExpect(jsonPath("$.pagination.totalElements").value(3))
            .andExpect(jsonPath("$.items[0].content").value("토너를 먼저 쓰는 이유가 궁금해요!"))
            .andExpect(jsonPath("$.items[0].mine").value(true))
            .andExpect(jsonPath("$.items[1].byRoutineAuthor").value(true))
            .andExpect(jsonPath("$.items[1].mine").value(false))
            .andExpect(jsonPath("$.items[1].author.nickname").value(author.nickname()));
        mockMvc.perform(get(PATH + "/" + shared))
            .andExpect(jsonPath("$.commentCount").value(3))
            .andExpect(jsonPath("$.comments.length()").value(2))
            .andExpect(jsonPath("$.comments[0].mine").value(false));
    }

    @Test
    @DisplayName("내 댓글만 지울 수 있고, 비었거나 300자를 넘는 댓글은 거절한다")
    void deletesOnlyOwnComment() throws Exception {
        long shared = createdId(author, "{\"name\": \"평소 루틴\", \"isPublic\": true, \"morningProductIds\": [1]}");
        String body = writeComment(reader, shared, "좋아요").andReturn().getResponse().getContentAsString();
        long commentId = ((Number) JsonPath.read(body, "$.id")).longValue();

        writeComment(reader, shared, "   ")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_ROUTINE_COMMENT"));
        writeComment(reader, shared, "가".repeat(301))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("ROUTINE_COMMENT_TOO_LONG"));
        mockMvc.perform(delete(MY_PATH + "/comments/" + commentId).with(signedIn(author)))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("ROUTINE_COMMENT_NOT_FOUND"));
        mockMvc.perform(delete(MY_PATH + "/comments/" + commentId).with(signedIn(reader)))
            .andExpect(status().isNoContent());
        mockMvc.perform(get(PATH + "/" + shared)).andExpect(jsonPath("$.commentCount").value(0));
    }

    @Test
    @DisplayName("내 댓글만 고칠 수 있고, 비공개가 된 루틴의 댓글은 고칠 수 없다")
    void editsOnlyOwnComment() throws Exception {
        long shared = createdId(author, "{\"name\": \"평소 루틴\", \"isPublic\": true, \"morningProductIds\": [1]}");
        String body = writeComment(reader, shared, "궁금해요").andReturn().getResponse().getContentAsString();
        long commentId = ((Number) JsonPath.read(body, "$.id")).longValue();

        editComment(reader, commentId, "  토너를 먼저 쓰는 이유가 궁금해요  ")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").value("토너를 먼저 쓰는 이유가 궁금해요"))
            .andExpect(jsonPath("$.mine").value(true));
        editComment(author, commentId, "가로채기")
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("ROUTINE_COMMENT_NOT_FOUND"));
        editComment(reader, commentId, "   ")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_ROUTINE_COMMENT"));

        jdbcTemplate.update("update routine set is_public = false where id = ?", shared);
        editComment(reader, commentId, "비공개 뒤 수정").andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("둘러보기는 좋아요순·댓글순으로도 정렬한다")
    void sortsByReactions() throws Exception {
        long liked = createdId(author, "{\"name\": \"좋아요 많은\", \"isPublic\": true, \"morningProductIds\": [1]}");
        long commented = createdId(author, "{\"name\": \"댓글 많은\", \"isPublic\": true, \"morningProductIds\": [1]}");
        jdbcTemplate.update("update routine set created_at = created_at - interval '1 minute' where id = ?", liked);
        mockMvc.perform(put(MY_PATH + "/" + liked + "/like").with(signedIn(reader))).andExpect(status().isNoContent());
        writeComment(reader, commented, "좋아요").andExpect(status().isCreated());

        assertThat(sharedIds("LIKES")).containsSubsequence(liked, commented);
        assertThat(sharedIds("COMMENTS")).containsSubsequence(commented, liked);
        assertThat(sharedIds("LATEST")).containsSubsequence(commented, liked);
    }

    private List<Long> sharedIds(String sort) throws Exception {
        String body = mockMvc.perform(get(PATH).param("sort", sort).param("size", "100"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        List<Number> ids = JsonPath.read(body, "$.items[*].id");
        return ids.stream().map(Number::longValue).toList();
    }

    private ResultActions editComment(User owner, long commentId, String content) throws Exception {
        return mockMvc.perform(
            put(MY_PATH + "/comments/" + commentId).with(signedIn(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\": \"" + content + "\"}")
        );
    }

    private ResultActions writeComment(User owner, long routineId, String content) throws Exception {
        return mockMvc.perform(
            post(MY_PATH + "/" + routineId + "/comments").with(signedIn(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\": \"" + content + "\"}")
        );
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
