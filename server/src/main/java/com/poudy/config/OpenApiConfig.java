package com.poudy.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(info = @Info(title = "Poudy API", version = "v1"), servers = {
        @Server(url = "http://localhost:8080", description = "로컬 개발 서버"),
        @Server(url = "/", description = "현재 서버")})
public class OpenApiConfig {
}
