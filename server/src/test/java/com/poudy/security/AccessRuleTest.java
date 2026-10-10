package com.poudy.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("API 접근 규칙")
class AccessRuleTest {

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {
            "/api/members/me",
            "/api/members/logout",
            "/api/admin/logout",
            "/api/admin/feedbacks",
            "/api/admin/members/{memberId}/restore"})
    @DisplayName("회원·관리자 API와 각 로그아웃은 로그인이 필요하다")
    void requiresLoginForProtectedPath(String path) {
        assertThat(AccessRule.requiresLogin(path)).isTrue();
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {
            "/api/admin/login",
            "/api/products",
            "/api/auth/logout",
            "/api/administrators"})
    @DisplayName("관리자 로그인과 보호 영역 밖의 API는 로그인이 필요 없다")
    void doesNotRequireLoginForPublicPath(String path) {
        assertThat(AccessRule.requiresLogin(path)).isFalse();
    }
}
