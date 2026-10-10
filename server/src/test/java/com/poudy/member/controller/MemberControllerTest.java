package com.poudy.member.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.member.domain.AgeRange;
import com.poudy.member.domain.Gender;
import com.poudy.member.domain.Member;
import com.poudy.member.domain.MemberSignup;
import com.poudy.member.domain.MemberSkinType;
import com.poudy.member.repository.MemberRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginAdmin;
import com.poudy.security.session.LoginMember;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("회원 API")
class MemberControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Test
    @DisplayName("로그인하지 않았으면 내 정보를 401로 거절한다")
    void rejectsAnonymousMember() throws Exception {
        mockMvc.perform(get("/api/members/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("관리자 세션으로는 회원 API를 403으로 거절한다")
    void rejectsAdminSession() throws Exception {
        mockMvc.perform(get("/api/members/me").with(authentication(new LoginAdmin("admin").toAuthentication())))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("로그인한 회원 정보를 캐시 없이 돌려준다")
    void findsSignedInMember() throws Exception {
        Member member = memberRepository
            .save(MemberSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "4321", "member@example.com", true)));

        mockMvc.perform(get("/api/members/me").with(authentication(new LoginMember(member.id()).toAuthentication())))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andExpect(jsonPath("$.id").value(member.id()))
            .andExpect(jsonPath("$.provider").value("KAKAO"))
            .andExpect(jsonPath("$.email").value("member@example.com"))
            .andExpect(jsonPath("$.gender").isEmpty())
            .andExpect(jsonPath("$.ageRange").isEmpty())
            .andExpect(jsonPath("$.skinType").isEmpty());
    }

    @Test
    @DisplayName("초기 정보를 저장하면 바뀐 회원 정보를 돌려준다")
    void updatesProfile() throws Exception {
        Member member = memberRepository
            .save(MemberSignup.from(new OAuthAccount(OAuthProvider.GOOGLE, "sub", "member@example.com", true)));

        mockMvc.perform(
            patch("/api/members/me/profile")
                .with(authentication(new LoginMember(member.id()).toAuthentication()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gender":"FEMALE","ageRange":"TWENTIES","skinType":"COMBINATION"}
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andExpect(jsonPath("$.gender").value("FEMALE"))
            .andExpect(jsonPath("$.ageRange").value("TWENTIES"))
            .andExpect(jsonPath("$.skinType").value("COMBINATION"));
    }

    @Test
    @DisplayName("고른 초기 정보만 저장하고 고르지 않은 것은 비운다")
    void updatesPartialProfile() throws Exception {
        Member member = memberRepository
            .save(MemberSignup.from(new OAuthAccount(OAuthProvider.GOOGLE, "sub", "member@example.com", true)));
        memberRepository.updateProfile(member.id(), Gender.FEMALE, AgeRange.TWENTIES, MemberSkinType.DRY);

        mockMvc.perform(
            patch("/api/members/me/profile")
                .with(authentication(new LoginMember(member.id()).toAuthentication()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gender":null,"ageRange":null,"skinType":"COMBINATION"}
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gender").isEmpty())
            .andExpect(jsonPath("$.ageRange").isEmpty())
            .andExpect(jsonPath("$.skinType").value("COMBINATION"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"gender\":\"FEMALE\",\"ageRange\":\"SEVENTIES\",\"skinType\":\"DRY\"}",
            "{\"gender\":\"FEMALE\",\"ageRange\":\"TWENTIES\",\"skinType\":\"NORMAL\"}"
    })
    @DisplayName("모르는 값이 있으면 초기 정보를 400으로 거절한다")
    void rejectsInvalidProfile(String body) throws Exception {
        Member member = memberRepository
            .save(MemberSignup.from(new OAuthAccount(OAuthProvider.GOOGLE, "sub", "member@example.com", true)));

        mockMvc.perform(
            patch("/api/members/me/profile")
                .with(authentication(new LoginMember(member.id()).toAuthentication()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
    }

    @Test
    @DisplayName("로그인하지 않았으면 초기 정보를 401로 거절한다")
    void rejectsAnonymousProfileUpdate() throws Exception {
        mockMvc.perform(
            patch("/api/members/me/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gender":"FEMALE","ageRange":"TWENTIES","skinType":"COMBINATION"}
                    """)
        )
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("탈퇴하면 회원을 지우고 세션을 버린 뒤 204를 돌려준다")
    void withdraws() throws Exception {
        Member member = memberRepository
            .save(MemberSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "4321", "member@example.com", true)));
        MockHttpSession session = new MockHttpSession();

        mockMvc.perform(
            delete("/api/members/me")
                .session(session)
                .with(authentication(new LoginMember(member.id()).toAuthentication()))
        )
            .andExpect(status().isNoContent());

        assertThat(session.isInvalid()).isTrue();
        assertThat(memberRepository.findById(member.id())).isEmpty();
    }

    @Test
    @DisplayName("로그인하지 않았으면 탈퇴를 401로 거절한다")
    void rejectsAnonymousWithdrawal() throws Exception {
        mockMvc.perform(delete("/api/members/me"))
            .andExpect(status().isUnauthorized());
    }
}
