package com.poudy.security.auth.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.member.domain.Member;
import com.poudy.member.domain.MemberSignup;
import com.poudy.member.repository.MemberRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginChannel;
import com.poudy.security.session.LoginSession;
import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("회원가입 API")
class SignupControllerTest {

    private static final String PATH = "/api/auth/signup";
    private static final OAuthAccount ACCOUNT = new OAuthAccount(OAuthProvider.KAKAO, "4321", "New@Example.com", true);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private LoginSession loginSession;

    @Test
    @DisplayName("처음 로그인한 계정으로 가입하면 회원을 만들고 같은 세션으로 로그인시킨다")
    void signsUpHeldAccount() throws Exception {
        MockHttpSession session = heldSessionOf(ACCOUNT, LoginChannel.WEB);

        mockMvc.perform(post(PATH).session(session))
            .andExpect(status().isNoContent());

        assertThat(memberRepository.findByAccount(ACCOUNT)).get()
            .extracting(Member::email)
            .isEqualTo("new@example.com");
        mockMvc.perform(get("/api/members/me").session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("new@example.com"));
    }

    @Test
    @DisplayName("앱 로그인에서 맡긴 계정으로 가입하면 앱 세션으로 로그인시킨다")
    void signsUpAppAccountWithAppSession() throws Exception {
        MockHttpSession session = heldSessionOf(ACCOUNT, LoginChannel.APP);

        mockMvc.perform(post(PATH).session(session))
            .andExpect(status().isNoContent());

        assertThat(session.getMaxInactiveInterval()).isEqualTo(Duration.ofDays(60).toSeconds());
    }

    @Test
    @DisplayName("같은 세션으로 다시 가입하면 404로 거절한다")
    void signsUpOnce() throws Exception {
        MockHttpSession session = heldSessionOf(ACCOUNT, LoginChannel.WEB);

        mockMvc.perform(post(PATH).session(session))
            .andExpect(status().isNoContent());
        mockMvc.perform(post(PATH).session(session))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("SIGNUP_ACCOUNT_NOT_FOUND"));
    }

    @Test
    @DisplayName("처음 로그인한 계정이 없으면 가입을 404로 거절한다")
    void rejectsSignupWithoutHeldAccount() throws Exception {
        mockMvc.perform(post(PATH))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("SIGNUP_ACCOUNT_NOT_FOUND"));
    }

    @Test
    @DisplayName("기다리는 동안 다른 제공자로 같은 이메일이 가입했으면 400으로 거절하고 로그인시키지 않는다")
    void rejectsEmailRegisteredMeanwhile() throws Exception {
        MockHttpSession session = heldSessionOf(ACCOUNT, LoginChannel.WEB);
        memberRepository.save(
            MemberSignup.from(new OAuthAccount(OAuthProvider.GOOGLE, "sub", "new@example.com", true))
        );

        mockMvc.perform(post(PATH).session(session))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("MEMBER_EMAIL_ALREADY_REGISTERED"));
        mockMvc.perform(get("/api/members/me").session(session))
            .andExpect(status().isUnauthorized());
    }

    private MockHttpSession heldSessionOf(OAuthAccount account, LoginChannel channel) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        loginSession.holdSignup(account, channel, request, new MockHttpServletResponse());
        return (MockHttpSession) request.getSession();
    }
}
