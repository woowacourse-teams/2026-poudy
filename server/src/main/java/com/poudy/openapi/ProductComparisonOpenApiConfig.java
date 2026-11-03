package com.poudy.openapi;

import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.media.ArraySchema;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.parameters.Parameter;
import io.swagger.v3.oas.models.parameters.QueryParameter;
import java.math.BigDecimal;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ProductComparisonOpenApiConfig {

    @Bean
    public OpenApiCustomizer productComparisonParameters() {
        // ModelAttribute 자동 변환은 구성품 맵과 컨테이너 제약을 온전히 문서화하지 못한다.
        return openApi -> {
            PathItem path = openApi.getPaths().get("/api/products/comparison");
            if (path != null) {
                path.getGet().setParameters(List.of(productIds(), partIds()));
            }
        };
    }

    private Parameter productIds() {
        return new QueryParameter().name("productIds").required(true)
            .description("비교할 제품 ID. 요청 순서대로 반환하며 쉼표 또는 반복 파라미터로 전달한다")
            .style(Parameter.StyleEnum.FORM).explode(false)
            .schema(
                new ArraySchema().items(new IntegerSchema().format("int64").minimum(BigDecimal.ONE))
                    .minItems(1).maxItems(3).uniqueItems(true)
            );
    }

    private Parameter partIds() {
        return new QueryParameter().name("partIds").required(false)
            .description("제품별 구성품 ID. partIds[101]=473처럼 전달한다. 키·값은 양의 정수이고 키는 productIds에 포함되어야 한다. 생략하면 첫 구성품을 선택한다")
            .style(Parameter.StyleEnum.DEEPOBJECT).explode(true)
            .schema(
                new ObjectSchema().additionalProperties(new IntegerSchema().format("int64").minimum(BigDecimal.ONE))
                    .maxProperties(3)
            );
    }
}
