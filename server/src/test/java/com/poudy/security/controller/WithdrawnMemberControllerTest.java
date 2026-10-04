package com.poudy.security.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.member.domain.Member;
import com.poudy.member.domain.MemberSignup;
import com.poudy.member.repository.MemberRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginSession;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("탈퇴 계정 복구 요청 API")
class WithdrawnMemberControllerTest {

    private static final String PATH = "/api/auth/withdrawn-member/restore-request";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private LoginSession loginSession;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("방금 로그인한 탈퇴 회원의 복구 요청을 받고, 같은 세션으로 다시 요청하면 404로 거절한다")
    void acceptsRestoreRequestOnce() throws Exception {
        Member member = memberRepository.save(
            MemberSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "4321", "member@example.com", true))
        );
        memberRepository.withdraw(member.id());
        MockHttpSession session = heldSessionOf(member.id());

        mockMvc.perform(post(PATH).session(session))
            .andExpect(status().isNoContent());
        mockMvc.perform(post(PATH).session(session))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("WITHDRAWN_MEMBER_NOT_FOUND"));

        assertThat(
            jdbcTemplate.queryForObject(
                "select restore_requested_at is not null from member where id = ?",
                Boolean.class,
                member.id()
            )
        ).isTrue();
    }

    @Test
    @DisplayName("탈퇴 계정으로 로그인하지 않았으면 복구 요청을 404로 거절한다")
    void rejectsRequestWithoutWithdrawnSignIn() throws Exception {
        mockMvc.perform(post(PATH))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("WITHDRAWN_MEMBER_NOT_FOUND"));
    }

    private MockHttpSession heldSessionOf(long memberId) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        loginSession.holdWithdrawnMember(memberId, request, new MockHttpServletResponse());
        return (MockHttpSession) request.getSession();
    }
}
