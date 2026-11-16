package com.poudy.security.auth.loadtest;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.ForbiddenRequestException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("부하 시험 로그인 비밀값")
class LoadTestSecretTest {

    private static final String SECRET = "0123456789abcdef0123456789abcdef";

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "short-secret"})
    @DisplayName("32자보다 짧은 비밀값으로는 만들 수 없다")
    void rejectsWeakSecret(String value) {
        assertThatThrownBy(() -> new LoadTestSecret(value)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("같은 비밀값만 통과시킨다")
    void verifiesSameSecret() {
        LoadTestSecret secret = new LoadTestSecret(SECRET);

        assertThatCode(() -> secret.verify(SECRET)).doesNotThrowAnyException();
        assertThatThrownBy(() -> secret.verify(SECRET + "x")).isInstanceOf(ForbiddenRequestException.class);
        assertThatThrownBy(() -> secret.verify(null)).isInstanceOf(ForbiddenRequestException.class);
    }
}
