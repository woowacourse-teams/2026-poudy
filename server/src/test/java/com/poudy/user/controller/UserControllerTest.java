package com.poudy.user.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.domain.PendingImage;
import com.poudy.image.repository.PendingImageRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginAdmin;
import com.poudy.security.session.LoginMember;
import com.poudy.skintype.domain.SkinType;
import com.poudy.user.domain.AgeRange;
import com.poudy.user.domain.Gender;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import com.poudy.user.support.UserNicknameTestFixture;
import java.time.Instant;
import java.util.UUID;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("회원 API")
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PendingImageRepository pendingImageRepository;

    @Test
    @DisplayName("로그인하지 않았으면 내 정보를 401로 거절한다")
    void rejectsAnonymousUser() throws Exception {
        mockMvc.perform(get("/api/users/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("관리자 세션으로는 회원 API를 403으로 거절한다")
    void rejectsAdminSession() throws Exception {
        mockMvc.perform(get("/api/users/me").with(authentication(new LoginAdmin("admin").toAuthentication())))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("프로필 이미지가 있으면 그 이미지의 URL을 돌려준다")
    void returnsProfileImageUrl() throws Exception {
        User user = userRepository
            .save(
                UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "image", "image@example.com", true)),
                UserNicknameTestFixture.nickname()
            ).orElseThrow();
        UUID imageId = UUID.randomUUID();
        userRepository.updateProfile(user.id(), null, null, null, null, imageId);

        mockMvc.perform(get("/api/users/me").with(authentication(new LoginMember(user.id()).toAuthentication())))
            .andExpect(status().isOk())
            .andExpect(
                jsonPath("$.profileImageUrl")
                    .value(org.hamcrest.Matchers.endsWith("/poudy/test/users/profile/" + imageId))
            );
    }

    @Test
    @DisplayName("프로필 수정에 새 이미지 ID를 보내면 바꾸고, 보내지 않으면 그대로 두고, null이면 지운다")
    void changesProfileImageOnlyWhenSent() throws Exception {
        User user = userRepository
            .save(
                UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "patch-image", "patch-image@example.com", true)),
                UserNicknameTestFixture.nickname()
            ).orElseThrow();
        UUID imageId = UUID.randomUUID();
        pendingImageRepository.save(new PendingImage(imageId, ImagePurpose.PROFILE), Instant.now());

        patchProfile(
            user,
            "{\"gender\":null,\"ageRange\":null,\"skinType\":null,\"sensitiveSkin\":null,\"profileImageId\":\""
                + imageId + "\"}"
        )
            .andExpect(jsonPath("$.profileImageUrl").value(org.hamcrest.Matchers.endsWith("/" + imageId)));
        patchProfile(
            user,
            "{\"gender\":\"FEMALE\",\"ageRange\":null,\"skinType\":null,\"sensitiveSkin\":null}"
        )
            .andExpect(jsonPath("$.profileImageUrl").value(org.hamcrest.Matchers.endsWith("/" + imageId)));
        patchProfile(
            user,
            "{\"gender\":\"FEMALE\",\"ageRange\":null,\"skinType\":null,\"sensitiveSkin\":null,\"profileImageId\":null}"
        )
            .andExpect(jsonPath("$.profileImageUrl").isEmpty());
    }

    private org.springframework.test.web.servlet.ResultActions patchProfile(User user, String body) throws Exception {
        return mockMvc.perform(
            patch("/api/users/me/profile")
                .with(authentication(new LoginMember(user.id()).toAuthentication()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
        ).andExpect(status().isOk());
    }

    @Test
    @DisplayName("로그인한 회원 정보를 캐시 없이 돌려준다")
    void findsSignedInUser() throws Exception {
        User user = userRepository
            .save(
                UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "4321", "user@example.com", true)),
                UserNicknameTestFixture.nickname()
            ).orElseThrow();

        mockMvc.perform(get("/api/users/me").with(authentication(new LoginMember(user.id()).toAuthentication())))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andExpect(jsonPath("$.id").value(user.id()))
            .andExpect(jsonPath("$.provider").value("KAKAO"))
            .andExpect(jsonPath("$.email").value("user@example.com"))
            .andExpect(jsonPath("$.nickname").value(user.nickname()))
            .andExpect(jsonPath("$.profileImageUrl").isEmpty())
            .andExpect(jsonPath("$.gender").isEmpty())
            .andExpect(jsonPath("$.ageRange").isEmpty())
            .andExpect(jsonPath("$.skinType").isEmpty());
    }

    @Test
    @DisplayName("초기 정보를 저장하면 바뀐 회원 정보를 돌려준다")
    void updatesProfile() throws Exception {
        User user = userRepository
            .save(
                UserSignup.from(new OAuthAccount(OAuthProvider.GOOGLE, "sub", "user@example.com", true)),
                UserNicknameTestFixture.nickname()
            ).orElseThrow();

        mockMvc.perform(
            patch("/api/users/me/profile")
                .with(authentication(new LoginMember(user.id()).toAuthentication()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gender":"FEMALE","ageRange":"TWENTIES","skinType":"COMBINATION","sensitiveSkin":true}
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andExpect(jsonPath("$.gender").value("FEMALE"))
            .andExpect(jsonPath("$.ageRange").value("TWENTIES"))
            .andExpect(jsonPath("$.skinType").value("COMBINATION"))
            .andExpect(jsonPath("$.sensitiveSkin").value(true));
    }

    @Test
    @DisplayName("고른 초기 정보만 저장하고 고르지 않은 것은 비운다")
    void updatesPartialProfile() throws Exception {
        User user = userRepository
            .save(
                UserSignup.from(new OAuthAccount(OAuthProvider.GOOGLE, "sub", "user@example.com", true)),
                UserNicknameTestFixture.nickname()
            ).orElseThrow();
        userRepository.updateProfile(user.id(), Gender.FEMALE, AgeRange.TWENTIES, SkinType.DRY, true, null);

        mockMvc.perform(
            patch("/api/users/me/profile")
                .with(authentication(new LoginMember(user.id()).toAuthentication()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gender":null,"ageRange":null,"skinType":"COMBINATION"}
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gender").isEmpty())
            .andExpect(jsonPath("$.ageRange").isEmpty())
            .andExpect(jsonPath("$.skinType").value("COMBINATION"))
            .andExpect(jsonPath("$.sensitiveSkin").isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"gender\":\"FEMALE\",\"ageRange\":\"SEVENTIES\",\"skinType\":\"DRY\"}",
            "{\"gender\":\"FEMALE\",\"ageRange\":\"TWENTIES\",\"skinType\":\"NORMAL\"}",
            "{\"gender\":\"FEMALE\",\"ageRange\":\"TWENTIES\",\"skinType\":\"UNKNOWN\"}",
            "{\"gender\":\"FEMALE\",\"ageRange\":\"TWENTIES\",\"skinType\":\"SENSITIVE\"}"
    })
    @DisplayName("모르는 값이 있으면 초기 정보를 400으로 거절한다")
    void rejectsInvalidProfile(String body) throws Exception {
        User user = userRepository
            .save(
                UserSignup.from(new OAuthAccount(OAuthProvider.GOOGLE, "sub", "user@example.com", true)),
                UserNicknameTestFixture.nickname()
            ).orElseThrow();

        mockMvc.perform(
            patch("/api/users/me/profile")
                .with(authentication(new LoginMember(user.id()).toAuthentication()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
    }

    @Test
    @DisplayName("프로필 수정은 회원마다 1분에 5번까지 받고, 넘으면 429와 Retry-After를 돌려준다")
    void limitsProfileUpdatesPerUser() throws Exception {
        User user = userRepository
            .save(
                UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "4321", "user@example.com", true)),
                UserNicknameTestFixture.nickname()
            ).orElseThrow();
        User other = userRepository
            .save(
                UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "8765", "other@example.com", true)),
                UserNicknameTestFixture.nickname()
            ).orElseThrow();

        for (int request = 0; request < 5; request++) {
            updateProfile(user).andExpect(status().isOk());
        }

        updateProfile(user)
            .andExpect(status().isTooManyRequests())
            .andExpect(header().exists(HttpHeaders.RETRY_AFTER))
            .andExpect(jsonPath("$.code").value("TOO_MANY_REQUESTS"));
        updateProfile(other).andExpect(status().isOk());
    }

    @Test
    @DisplayName("로그인하지 않았으면 초기 정보를 401로 거절한다")
    void rejectsAnonymousProfileUpdate() throws Exception {
        mockMvc.perform(
            patch("/api/users/me/profile")
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
        User user = userRepository
            .save(
                UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "4321", "user@example.com", true)),
                UserNicknameTestFixture.nickname()
            ).orElseThrow();
        MockHttpSession session = new MockHttpSession();

        mockMvc.perform(
            delete("/api/users/me")
                .session(session)
                .with(authentication(new LoginMember(user.id()).toAuthentication()))
        )
            .andExpect(status().isNoContent());

        assertThat(session.isInvalid()).isTrue();
        assertThat(userRepository.findById(user.id())).isEmpty();
    }

    @Test
    @DisplayName("로그인하지 않았으면 탈퇴를 401로 거절한다")
    void rejectsAnonymousWithdrawal() throws Exception {
        mockMvc.perform(delete("/api/users/me"))
            .andExpect(status().isUnauthorized());
    }

    private ResultActions updateProfile(User user) throws Exception {
        return mockMvc.perform(
            patch("/api/users/me/profile")
                .with(authentication(new LoginMember(user.id()).toAuthentication()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"skinType":"DRY","sensitiveSkin":true}
                    """)
        );
    }
}
