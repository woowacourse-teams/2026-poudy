package com.poudy.config;

import com.poudy.exception.ErrorCode;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.parameters.Parameter;
import io.swagger.v3.oas.models.responses.ApiResponses;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;

@Configuration
public class ErrorResponseConfig {

    @Bean
    public OpenApiCustomizer errorResponseCustomizer() {
        return openApi -> {
            openApi.getComponents().addSchemas(ProblemDetailResponses.SCHEMA_NAME, ProblemDetailResponses.schema());
            openApi.getPaths().forEach(this::addErrorResponses);
        };
    }

    private void addErrorResponses(String path, PathItem pathItem) {
        pathItem.readOperations().forEach(operation -> addErrorResponses(path, operation));
    }

    private void addErrorResponses(String path, Operation operation) {
        ApiResponses responses = operation.getResponses();

        if (hasInput(operation)) {
            responses.addApiResponse(
                    "400",
                    ProblemDetailResponses.of("잘못된 요청", HttpStatus.BAD_REQUEST, ErrorResponseCodes.badRequest(path)));
        }
        ErrorResponseCodes.notFound(path)
                .ifPresent(
                        code -> responses.addApiResponse(
                                "404",
                                ProblemDetailResponses.of("대상을 찾을 수 없음", HttpStatus.NOT_FOUND, code)));
        responses.addApiResponse(
                "500",
                ProblemDetailResponses.of("서버 오류", HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR));
    }

    private boolean hasInput(Operation operation) {
        List<Parameter> parameters = operation.getParameters();

        return operation.getRequestBody() != null || parameters != null && !parameters.isEmpty();
    }
}
