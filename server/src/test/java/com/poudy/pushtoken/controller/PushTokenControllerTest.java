package com.poudy.pushtoken.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginAdmin;
import com.poudy.security.session.LoginMember;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("푸시 토큰 API")
class PushTokenControllerTest {

    private static final String PATH = "/api/push-tokens";
    private static final String TOKEN = "ExponentPushToken[abcDEF123_-xyz]";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User user;

    @BeforeEach
    void signUp() {
        user = userRepository.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "4321", "user@example.com", true))
        );
    }

    @Test
    @DisplayName("로그인하지 않아도 토큰을 회원 없이 등록한다")
    void registersAnonymousToken() throws Exception {
        mockMvc.perform(register(TOKEN)).andExpect(status().isOk());

        assertThat(userIdsOf(TOKEN)).containsExactly((Long) null);
    }

    @Test
    @DisplayName("회원 세션이면 토큰을 그 회원과 잇는다")
    void registersTokenForUser() throws Exception {
        mockMvc.perform(register(TOKEN).with(signedIn())).andExpect(status().isOk());

        assertThat(userIdsOf(TOKEN)).containsExactly(user.id());
    }

    @Test
    @DisplayName("같은 토큰을 다시 등록하면 행을 늘리지 않고 마지막 로그인 상태로 바꾼다")
    void followsLatestLoginState() throws Exception {
        mockMvc.perform(register(TOKEN)).andExpect(status().isOk());
        mockMvc.perform(register(TOKEN).with(signedIn())).andExpect(status().isOk());
        assertThat(userIdsOf(TOKEN)).containsExactly(user.id());

        mockMvc.perform(register(TOKEN)).andExpect(status().isOk());
        assertThat(userIdsOf(TOKEN)).containsExactly((Long) null);
    }

    @Test
    @DisplayName("관리자 세션은 회원이 아니라 회원 없이 등록한다")
    void treatsAdminAsAnonymous() throws Exception {
        mockMvc.perform(register(TOKEN).with(authentication(new LoginAdmin("admin").toAuthentication())))
            .andExpect(status().isOk());

        assertThat(userIdsOf(TOKEN)).containsExactly((Long) null);
    }

    @Test
    @DisplayName("탈퇴한 회원의 세션이면 회원과 잇지 않는다")
    void doesNotLinkWithdrawnUser() throws Exception {
        jdbcTemplate.update("update \"user\" set deleted_at = now() where id = ?", user.id());

        mockMvc.perform(register(TOKEN).with(signedIn())).andExpect(status().isOk());

        assertThat(userIdsOf(TOKEN)).containsExactly((Long) null);
    }

    @Test
    @DisplayName("회원 행을 지워도 토큰은 남기고 회원 연결만 끊는다")
    void keepsTokenWhenUserDeleted() throws Exception {
        mockMvc.perform(register(TOKEN).with(signedIn())).andExpect(status().isOk());

        jdbcTemplate.update("delete from \"user\" where id = ?", user.id());

        assertThat(userIdsOf(TOKEN)).containsExactly((Long) null);
    }

    @Test
    @DisplayName("새 토큰은 알림을 켠 상태로 등록하고 그 설정을 돌려준다")
    void registersNewTokenEnabled() throws Exception {
        mockMvc.perform(register(TOKEN))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.enabled").value(true));

        assertThat(enabledOf(TOKEN)).containsExactly(true);
    }

    @Test
    @DisplayName("알림을 끄면 토큰은 남기고, 다시 등록해도 끈 설정을 유지해 돌려준다")
    void keepsDisabledSettingOnReregister() throws Exception {
        mockMvc.perform(register(TOKEN)).andExpect(status().isOk());

        mockMvc.perform(changeEnabled(TOKEN, false)).andExpect(status().isNoContent());
        assertThat(enabledOf(TOKEN)).containsExactly(false);

        mockMvc.perform(register(TOKEN).with(signedIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.enabled").value(false));
        assertThat(enabledOf(TOKEN)).containsExactly(false);
        assertThat(userIdsOf(TOKEN)).containsExactly(user.id());

        mockMvc.perform(changeEnabled(TOKEN, true)).andExpect(status().isNoContent());
        assertThat(enabledOf(TOKEN)).containsExactly(true);
    }

    @Test
    @DisplayName("등록하지 않은 토큰의 알림 설정을 바꾸면 그 설정으로 등록하고 로그인 상태를 따른다")
    void registersUnknownTokenOnChange() throws Exception {
        mockMvc.perform(changeEnabled(TOKEN, true).with(signedIn())).andExpect(status().isNoContent());

        assertThat(enabledOf(TOKEN)).containsExactly(true);
        assertThat(userIdsOf(TOKEN)).containsExactly(user.id());

        mockMvc.perform(changeEnabled(TOKEN, false)).andExpect(status().isNoContent());
        assertThat(userIdsOf(TOKEN)).containsExactly((Long) null);
    }

    @Test
    @DisplayName("알림 설정 값이 없거나 토큰 형식이 아니면 400 으로 거절한다")
    void rejectsMalformedEnabledRequest() throws Exception {
        mockMvc
            .perform(
                put(PATH + "/enabled").contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"" + TOKEN + "\"}")
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
        mockMvc.perform(changeEnabled("abc", true))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));

        assertThat(enabledOf(TOKEN)).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "",
            "abc",
            "ExponentPushToken[]",
            "ExponentPushToken[abc",
            "ExponentPushToken[a b]",
            "xExponentPushToken[abc]",
            "ExponentPushToken[abc]x"})
    @DisplayName("Expo 푸시 토큰 형식이 아니면 400 으로 거절한다")
    void rejectsMalformedToken(String token) throws Exception {
        mockMvc.perform(register(token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));

        assertThat(userIdsOf(token)).isEmpty();
    }

    @Test
    @DisplayName("예전 형식 ExpoPushToken 도 받는다")
    void acceptsLegacyPrefix() throws Exception {
        String legacyToken = "ExpoPushToken[abc123]";

        mockMvc.perform(register(legacyToken)).andExpect(status().isOk());

        assertThat(userIdsOf(legacyToken)).hasSize(1);
    }

    private MockHttpServletRequestBuilder register(String token) {
        return post(PATH)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"token\":\"" + token + "\"}");
    }

    private MockHttpServletRequestBuilder changeEnabled(String token, boolean enabled) {
        return put(PATH + "/enabled")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"token\":\"" + token + "\",\"enabled\":" + enabled + "}");
    }

    private RequestPostProcessor signedIn() {
        return authentication(new LoginMember(user.id()).toAuthentication());
    }

    private List<Long> userIdsOf(String token) {
        return jdbcTemplate.queryForList("select user_id from push_token where token = ?", Long.class, token);
    }

    private List<Boolean> enabledOf(String token) {
        return jdbcTemplate.queryForList("select is_enabled from push_token where token = ?", Boolean.class, token);
    }
}
