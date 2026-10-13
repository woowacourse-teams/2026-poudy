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
@DisplayName("탈퇴 계정 조회·복구 요청 API")
class WithdrawnMemberControllerTest {

    private static final String WITHDRAWN_PATH = "/api/auth/withdrawn";
    private static final String PATH = WITHDRAWN_PATH + "/restore";

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
    @DisplayName("방금 로그인한 탈퇴 회원의 정보를 몇 번이든 조회하고, 복구를 요청하면 더는 조회하지 못한다")
    void findsWithdrawnAccountUntilRestoreRequest() throws Exception {
        Member member = memberRepository.save(
            MemberSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "4321", "member@example.com", true))
        );
        memberRepository.withdraw(member.id());
        MockHttpSession session = heldSessionOf(member.id());

        mockMvc.perform(get(WITHDRAWN_PATH).session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.provider").value("KAKAO"))
            .andExpect(jsonPath("$.email").value("member@example.com"))
            .andExpect(jsonPath("$.withdrawnAt").isNotEmpty())
            .andExpect(jsonPath("$.restorableUntil").isNotEmpty());
        mockMvc.perform(get(WITHDRAWN_PATH).session(session))
            .andExpect(status().isOk());
        mockMvc.perform(post(PATH).session(session))
            .andExpect(status().isNoContent());
        mockMvc.perform(get(WITHDRAWN_PATH).session(session))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("WITHDRAWN_MEMBER_NOT_FOUND"));
    }

    @Test
    @DisplayName("탈퇴 계정으로 로그인하지 않았으면 탈퇴 정보 조회를 404로 거절한다")
    void rejectsLookupWithoutWithdrawnSignIn() throws Exception {
        mockMvc.perform(get(WITHDRAWN_PATH))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("WITHDRAWN_MEMBER_NOT_FOUND"));
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
