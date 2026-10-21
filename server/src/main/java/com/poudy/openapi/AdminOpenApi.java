package com.poudy.openapi;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class AdminOpenApi implements OpenApiCustomizer {

    @Override
    public void customise(OpenAPI openApi) {
        openApi.setServers(List.of(new Server().url("/").description("현재 서버")));
        openApi.getInfo().setDescription("""
            ### 사용자 로그인

            [카카오 로그인](/api/oauth2/authorization/kakao) · [구글 로그인](/api/oauth2/authorization/google)

            링크를 누르면 새 탭에서 로그인합니다. 가입 확인이 나오면 가입까지 완료한 뒤 이 탭으로 돌아오세요.
            이후 회원 API를 실행하면 사용자 세션 쿠키가 자동으로 전달됩니다.
            관리자 로그인과 사용자 로그인은 별도로 유지됩니다.
            """);
    }
}
