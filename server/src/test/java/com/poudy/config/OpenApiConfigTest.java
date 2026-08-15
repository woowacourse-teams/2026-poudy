package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.servers.Server;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("OpenAPI 설정")
class OpenApiConfigTest {

    @Test
    @DisplayName("정적 Swagger 문서가 로컬 API 서버를 기본으로 사용한다")
    void usesLocalApiServerByDefault() {
        OpenAPIDefinition definition = OpenApiConfig.class.getAnnotation(OpenAPIDefinition.class);

        assertThat(definition.servers()).extracting(Server::url).containsExactly("http://localhost:8080", "/");
    }
}
