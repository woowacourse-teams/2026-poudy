package com.poudy.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.member.domain.MemberSignup;
import com.poudy.member.repository.MemberRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginChannel;
import com.poudy.security.session.LoginSession;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("회원 세션의 활성 상태")
class ActiveMemberSessionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private LoginSession loginSession;

    @ParameterizedTest
    @CsvSource({
            "GET, /api/members/me",
            "PATCH, /api/members/me/profile",
            "DELETE, /api/members/me",
            "GET, /api/members/me/saved-products",
            "GET, /api/members/me/saved-products/ids",
            "PUT, /api/members/me/saved-products/1",
            "DELETE, /api/members/me/saved-products/1",
            "POST, /api/members/logout"
    })
    @DisplayName("다른 기기에서 탈퇴하면 모든 회원 API에서 기존 세션을 종료하고 401로 거절한다")
    void rejectsOtherSessionAfterWithdrawal(String method, String path) throws Exception {
        long memberId = memberRepository.save(
            MemberSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "sessions", "sessions@example.com", true))
        ).id();
        MockHttpSession first = signedInSession(memberId);
        MockHttpSession second = signedInSession(memberId);

        mockMvc.perform(delete("/api/members/me").session(first)).andExpect(status().isNoContent());
        assertThat(first.isInvalid()).isTrue();
        assertThat(second.isInvalid()).isFalse();

        mockMvc.perform(
            request(HttpMethod.valueOf(method), path).session(second)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gender":"FEMALE","ageRange":"TWENTIES","skinType":"DRY"}
                    """)
        )
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        assertThat(second.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("이미 삭제된 회원의 세션도 종료하고 401로 거절한다")
    void rejectsMissingMemberSession() throws Exception {
        MockHttpSession session = signedInSession(Long.MAX_VALUE);

        mockMvc.perform(get("/api/members/me/saved-products/ids").session(session))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("공개 API에서는 회원 활성 상태를 확인하지 않는다")
    void keepsPublicApiPublic() throws Exception {
        MockHttpSession session = signedInSession(Long.MAX_VALUE);

        mockMvc.perform(get("/api/products").session(session)).andExpect(status().isOk());

        assertThat(session.isInvalid()).isFalse();
    }

    private MockHttpSession signedInSession(long memberId) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        loginSession.signIn(memberId, LoginChannel.WEB, request, new MockHttpServletResponse());
        SecurityContextHolder.clearContext();
        return (MockHttpSession) request.getSession();
    }
}
