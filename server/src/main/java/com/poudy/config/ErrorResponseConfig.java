package com.poudy.config;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.GlobalExceptionHandler;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.examples.Example;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.parameters.Parameter;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;

@Configuration
public class ErrorResponseConfig {

    private static final String SCHEMA_NAME = "ProblemDetail";
    private static final String SCHEMA_REF = "#/components/schemas/" + SCHEMA_NAME;
    private static final String PROBLEM_JSON = org.springframework.http.MediaType.APPLICATION_PROBLEM_JSON_VALUE;

    private static final String PATH_PARAMETER_IN = "path";
    private static final String PAGINATION_FIELD = "size";
    private static final String INVALID_VALUE_MESSAGE = "%s 값이 올바르지 않습니다.";

    private static final Map<String, ErrorCode> NOT_FOUND_CODES = Map.of(
            "brands",
            ErrorCode.BRAND_NOT_FOUND,
            "ingredients",
            ErrorCode.INGREDIENT_NOT_FOUND,
            "products",
            ErrorCode.PRODUCT_NOT_FOUND);

    @Bean
    public OpenApiCustomizer errorResponseCustomizer() {
        return openApi -> {
            openApi.getComponents().addSchemas(SCHEMA_NAME, problemDetailSchema());

            openApi.getPaths().forEach((path, pathItem) -> pathItem.readOperations().forEach(operation -> {
                ApiResponses responses = operation.getResponses();
                responses.addApiResponse("400", errorResponse("잘못된 요청", badRequestExamples(operation)));
                if (path.contains("{")) {
                    responses.addApiResponse("404", errorResponse("대상을 찾을 수 없음", notFoundExamples(path)));
                }
                if (isProductFilterPath(path)) {
                    responses.addApiResponse(
                            "409",
                            errorResponse(
                                    "요청 충돌",
                                    List.of(example(HttpStatus.CONFLICT, ErrorCode.CONFLICTING_INGREDIENT_FILTER))));
                }
                responses.addApiResponse(
                        "500",
                        errorResponse(
                                "서버 오류",
                                List.of(example(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR))));
            }));
        };
    }

    private boolean isProductFilterPath(String path) {
        return "/api/products".equals(path) || "/api/products/count".equals(path);
    }

    private Schema<?> problemDetailSchema() {
        List<String> codes = Arrays.stream(ErrorCode.values()).map(Enum::name).toList();
        ObjectSchema schema = new ObjectSchema();
        schema.addProperty("type", new StringSchema().format("uri").example("about:blank"));
        schema.addProperty("title", new StringSchema().example("Bad Request"));
        schema.addProperty("status", new IntegerSchema().example(400));
        schema.addProperty("detail", new StringSchema().example("size 값이 올바르지 않습니다."));
        schema.addProperty("instance", new StringSchema().format("uri").example("/api/products"));
        schema.addProperty(GlobalExceptionHandler.CODE_PROPERTY, new StringSchema()._enum(codes));
        schema.setRequired(List.of("title", "status", "detail", GlobalExceptionHandler.CODE_PROPERTY));

        return schema;
    }

    private List<Map<String, Object>> badRequestExamples(Operation operation) {
        Map<String, Object> invalidRequest = invalidRequestExample(operation);
        if (!hasPagination(operation)) {
            return List.of(invalidRequest);
        }

        return List.of(
                invalidRequest,
                example(
                        HttpStatus.BAD_REQUEST,
                        ErrorCode.INVALID_PAGINATION_PARAMETER,
                        INVALID_VALUE_MESSAGE.formatted(PAGINATION_FIELD)));
    }

    private boolean hasPagination(Operation operation) {
        List<Parameter> parameters = operation.getParameters();

        return parameters != null
                && parameters.stream().anyMatch(parameter -> PAGINATION_FIELD.equals(parameter.getName()));
    }

    private Map<String, Object> invalidRequestExample(Operation operation) {
        List<Parameter> parameters = operation.getParameters();

        if (parameters == null || parameters.isEmpty()) {
            return example(HttpStatus.BAD_REQUEST, ErrorCode.INVALID_QUERY_PARAMETER);
        }

        Parameter parameter = parameters.getFirst();
        ErrorCode code = PATH_PARAMETER_IN.equals(parameter.getIn()) ? ErrorCode.INVALID_PATH_PARAMETER
                : ErrorCode.INVALID_QUERY_PARAMETER;

        return example(HttpStatus.BAD_REQUEST, code, INVALID_VALUE_MESSAGE.formatted(parameter.getName()));
    }

    private List<Map<String, Object>> notFoundExamples(String path) {
        String[] segments = path.split("/");
        ErrorCode code = segments.length > 2 ? NOT_FOUND_CODES.get(segments[2]) : null;

        return code == null ? List.of() : List.of(example(HttpStatus.NOT_FOUND, code));
    }

    private Map<String, Object> example(HttpStatus status, ErrorCode code) {
        return example(status, code, code.message());
    }

    private Map<String, Object> example(HttpStatus status, ErrorCode code, String detail) {
        Map<String, Object> example = new LinkedHashMap<>();
        example.put("title", status.getReasonPhrase());
        example.put("status", status.value());
        example.put("detail", detail);
        example.put(GlobalExceptionHandler.CODE_PROPERTY, code.name());

        return example;
    }

    private ApiResponse errorResponse(String description, List<Map<String, Object>> examples) {
        MediaType mediaType = new MediaType().schema(new Schema<>().$ref(SCHEMA_REF));

        if (examples.size() == 1) {
            mediaType.example(examples.getFirst());
        } else {
            examples.forEach(
                    example -> mediaType.addExamples(
                            String.valueOf(example.get(GlobalExceptionHandler.CODE_PROPERTY)),
                            new Example().value(example)));
        }

        return new ApiResponse().description(description).content(new Content().addMediaType(PROBLEM_JSON, mediaType));
    }
}
