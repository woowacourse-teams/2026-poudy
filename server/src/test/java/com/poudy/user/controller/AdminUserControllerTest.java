package com.poudy.user.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@WithMockUser(roles = "ADMIN")
@Transactional
@DisplayName("관리자 회원 복구 API")
class AdminUserControllerTest {

    private static final String RESTORE_REQUESTS_PATH = "/api/admin/users/restore-requests";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("복구를 요청한 탈퇴 회원을 복구하고, 다시 복구하면 404로 거절한다")
    void restoresRestoreRequestedUser() throws Exception {
        User user = userRepository.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "4321", "user@example.com", true))
        );
        userRepository.withdraw(user.id());
        userRepository.requestRestore(user.id());

        mockMvc.perform(post(pathOf(user.id())))
            .andExpect(status().isNoContent());
        mockMvc.perform(post(pathOf(user.id())))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("RESTORE_REQUEST_NOT_FOUND"));
    }

    @Test
    @DisplayName("복구를 요청하지 않은 탈퇴 회원은 404로 거절한다")
    void rejectsWithdrawnUserWithoutRestoreRequest() throws Exception {
        User user = userRepository.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "4321", "user@example.com", true))
        );
        userRepository.withdraw(user.id());

        mockMvc.perform(post(pathOf(user.id())))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("RESTORE_REQUEST_NOT_FOUND"));
    }

    @Test
    @DisplayName("복구 요청 목록은 복구를 요청한 탈퇴 회원만 요청한 순서대로 보여 준다")
    void listsRestoreRequests() throws Exception {
        User active = save("1", "active@example.com");
        User withdrawn = save("2", "withdrawn@example.com");
        User first = save("3", "first@example.com");
        User second = save("4", "second@example.com");
        userRepository.withdraw(withdrawn.id());
        userRepository.withdraw(first.id());
        userRepository.withdraw(second.id());
        userRepository.requestRestore(first.id());
        userRepository.requestRestore(second.id());

        mockMvc.perform(get(RESTORE_REQUESTS_PATH).param("size", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].userId").value(first.id()))
            .andExpect(jsonPath("$.items[0].provider").value("KAKAO"))
            .andExpect(jsonPath("$.items[0].email").value("first@example.com"))
            .andExpect(jsonPath("$.items[0].withdrawnAt").isNotEmpty())
            .andExpect(jsonPath("$.items[0].requestedAt").isNotEmpty())
            .andExpect(jsonPath("$.pagination.totalElements").value(2));
        mockMvc.perform(get(RESTORE_REQUESTS_PATH).param("page", "2").param("size", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].userId").value(second.id()));
    }

    private User save(String providerId, String email) {
        return userRepository.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, providerId, email, true))
        );
    }

    private String pathOf(long userId) {
        return "/api/admin/users/" + userId + "/restore";
    }
}
