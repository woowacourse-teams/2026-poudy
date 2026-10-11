package com.poudy.security.auth.app.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.member.domain.Member;
import com.poudy.member.domain.MemberSignup;
import com.poudy.member.repository.MemberRepository;
import com.poudy.security.auth.app.ProviderTokenVerifiers;
import com.poudy.security.domain.AppLoginFailedException;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("앱 소셜 로그인 API")
class AppLoginControllerTest {

    private static final String KAKAO_PATH = "/api/auth/kakao/app-login";
    private static final OAuthAccount KAKAO_ACCOUNT = new OAuthAccount(
        OAuthProvider.KAKAO,
        "4321",
        "member@example.com",
        true
    );

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @MockitoBean
    private ProviderTokenVerifiers tokenVerifiers;

    @Test
    @DisplayName("처음 로그인하면 가입 확인을 기다리고, 가입하면 앱 세션으로 회원 API를 쓸 수 있게 한다")
    void holdsSignupThenSignsInWithAppSession() throws Exception {
        given(tokenVerifiers.verify(eq(OAuthProvider.KAKAO), anyString())).willReturn(KAKAO_ACCOUNT);

        MockHttpSession session = (MockHttpSession) mockMvc.perform(login(KAKAO_PATH, "kakao-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("SIGNUP_REQUIRED"))
            .andReturn()
            .getRequest()
            .getSession(false);

        assertThat(memberRepository.findByAccount(KAKAO_ACCOUNT)).isEmpty();
        mockMvc.perform(get("/api/members/me").session(session)).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/signup").session(session)).andExpect(status().isNoContent());
        assertThat(session.getMaxInactiveInterval()).isEqualTo(60L * 24 * 60 * 60);
        mockMvc.perform(get("/api/members/me").session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("member@example.com"));
    }

    @Test
    @DisplayName("가입한 회원이 로그인하면 앱 세션으로 회원 API를 쓸 수 있게 한다")
    void signsInWithAppSession() throws Exception {
        memberRepository.save(MemberSignup.from(KAKAO_ACCOUNT));
        given(tokenVerifiers.verify(eq(OAuthProvider.KAKAO), anyString())).willReturn(KAKAO_ACCOUNT);

        MockHttpSession session = (MockHttpSession) mockMvc.perform(login(KAKAO_PATH, "kakao-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("SIGNED_IN"))
            .andReturn()
            .getRequest()
            .getSession(false);

        assertThat(session).isNotNull();
        assertThat(session.getMaxInactiveInterval()).isEqualTo(60L * 24 * 60 * 60);
        mockMvc.perform(get("/api/members/me").session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("member@example.com"));
    }

    @Test
    @DisplayName("탈퇴한 계정이면 로그인시키지 않고 복구 요청을 받을 세션만 남긴다")
    void holdsWithdrawnMember() throws Exception {
        Member member = memberRepository.save(MemberSignup.from(KAKAO_ACCOUNT));
        memberRepository.withdraw(member.id());
        given(tokenVerifiers.verify(eq(OAuthProvider.KAKAO), anyString())).willReturn(KAKAO_ACCOUNT);

        MockHttpSession session = (MockHttpSession) mockMvc.perform(login(KAKAO_PATH, "kakao-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("WITHDRAWN"))
            .andReturn()
            .getRequest()
            .getSession(false);

        mockMvc.perform(get("/api/members/me").session(session)).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/withdrawn/restore").session(session))
            .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("다른 제공자로 가입한 이메일이면 기존 제공자를 알려 400으로 거절한다")
    void rejectsEmailRegisteredWithOtherProvider() throws Exception {
        memberRepository.save(
            MemberSignup.from(new OAuthAccount(OAuthProvider.GOOGLE, "sub", "member@example.com", true))
        );
        given(tokenVerifiers.verify(eq(OAuthProvider.KAKAO), anyString())).willReturn(KAKAO_ACCOUNT);

        mockMvc.perform(login(KAKAO_PATH, "kakao-token"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("MEMBER_EMAIL_ALREADY_REGISTERED"))
            .andExpect(jsonPath("$.provider").value("GOOGLE"));
    }

    @Test
    @DisplayName("확인할 수 없는 토큰은 로그인 실패로 400을 돌려준다")
    void rejectsInvalidToken() throws Exception {
        given(tokenVerifiers.verify(eq(OAuthProvider.GOOGLE), anyString()))
            .willThrow(new AppLoginFailedException());

        mockMvc.perform(login("/api/auth/google/app-login", "forged"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("OAUTH_LOGIN_FAILED"));
    }

    @Test
    @DisplayName("로그인에 실패하면 웹 로그인처럼 기존 세션도 버린다")
    void discardsExistingSessionOnFailure() throws Exception {
        given(tokenVerifiers.verify(eq(OAuthProvider.KAKAO), anyString()))
            .willThrow(new AppLoginFailedException());
        MockHttpSession existing = new MockHttpSession();

        mockMvc.perform(login(KAKAO_PATH, "forged").session(existing))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("OAUTH_LOGIN_FAILED"));

        assertThat(existing.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("토큰이 비었으면 400, 모르는 제공자는 404로 거절한다")
    void rejectsBlankTokenAndUnknownProvider() throws Exception {
        mockMvc.perform(login(KAKAO_PATH, " "))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
        mockMvc.perform(login("/api/auth/naver/app-login", "token"))
            .andExpect(status().isNotFound());
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder login(
        String path,
        String token
    ) {
        return post(path)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"token\":\"" + token + "\"}");
    }
}
