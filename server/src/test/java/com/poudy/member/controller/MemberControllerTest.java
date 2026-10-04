package com.poudy.member.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.member.domain.Member;
import com.poudy.member.domain.MemberSignup;
import com.poudy.member.repository.MemberRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginMember;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
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
    @DisplayName("로그인한 회원 정보와 초기 정보 입력 완료 여부를 캐시 없이 돌려준다")
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
            .andExpect(jsonPath("$.skinType").isEmpty())
            .andExpect(jsonPath("$.profileCompleted").value(false));
    }
}
