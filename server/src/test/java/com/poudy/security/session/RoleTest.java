package com.poudy.security.session;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("역할")
class RoleTest {

    @Test
    @DisplayName("Spring Security 권한 이름은 ROLE_ 접두사를 붙인다")
    void prefixesAuthority() {
        assertThat(Role.MEMBER.authority()).isEqualTo("ROLE_MEMBER");
        assertThat(Role.ADMIN.authority()).isEqualTo("ROLE_ADMIN");
    }
}
