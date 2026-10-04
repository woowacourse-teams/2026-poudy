package com.poudy.member.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.member.domain.Member;
import com.poudy.member.domain.MemberSignup;
import com.poudy.member.repository.MemberRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("관리자 회원 복구 API")
class AdminMemberControllerTest {

    private static final String RESTORE_REQUESTS_PATH = "/api/admin/members/restore-requests";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Test
    @DisplayName("복구를 요청한 탈퇴 회원을 복구하고, 다시 복구하면 404로 거절한다")
    void restoresRestoreRequestedMember() throws Exception {
        Member member = memberRepository.save(
            MemberSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "4321", "member@example.com", true))
        );
        memberRepository.withdraw(member.id());
        memberRepository.requestRestore(member.id());

        mockMvc.perform(post(pathOf(member.id())))
            .andExpect(status().isNoContent());
        mockMvc.perform(post(pathOf(member.id())))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("RESTORE_REQUEST_NOT_FOUND"));
    }

    @Test
    @DisplayName("복구를 요청하지 않은 탈퇴 회원은 404로 거절한다")
    void rejectsWithdrawnMemberWithoutRestoreRequest() throws Exception {
        Member member = memberRepository.save(
            MemberSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "4321", "member@example.com", true))
        );
        memberRepository.withdraw(member.id());

        mockMvc.perform(post(pathOf(member.id())))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("RESTORE_REQUEST_NOT_FOUND"));
    }

    @Test
    @DisplayName("복구 요청 목록은 복구를 요청한 탈퇴 회원만 요청한 순서대로 보여 준다")
    void listsRestoreRequests() throws Exception {
        Member active = save("1", "active@example.com");
        Member withdrawn = save("2", "withdrawn@example.com");
        Member first = save("3", "first@example.com");
        Member second = save("4", "second@example.com");
        memberRepository.withdraw(withdrawn.id());
        memberRepository.withdraw(first.id());
        memberRepository.withdraw(second.id());
        memberRepository.requestRestore(first.id());
        memberRepository.requestRestore(second.id());

        mockMvc.perform(get(RESTORE_REQUESTS_PATH).param("size", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].memberId").value(first.id()))
            .andExpect(jsonPath("$.items[0].provider").value("KAKAO"))
            .andExpect(jsonPath("$.items[0].email").value("first@example.com"))
            .andExpect(jsonPath("$.items[0].withdrawnAt").isNotEmpty())
            .andExpect(jsonPath("$.items[0].requestedAt").isNotEmpty())
            .andExpect(jsonPath("$.pagination.totalElements").value(2));
        mockMvc.perform(get(RESTORE_REQUESTS_PATH).param("page", "2").param("size", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].memberId").value(second.id()));
    }

    private Member save(String providerId, String email) {
        return memberRepository.save(
            MemberSignup.from(new OAuthAccount(OAuthProvider.KAKAO, providerId, email, true))
        );
    }

    private String pathOf(long memberId) {
        return "/api/admin/members/" + memberId + "/restore";
    }
}
