package com.poudy.openapi;

import io.swagger.v3.oas.models.media.Schema;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class NullableReferenceConfig {

    private static final String NULL_TYPE = "null";

    @Bean
    public OpenApiCustomizer nullableReferenceCustomizer() {
        return openApi -> openApi.getComponents().getSchemas().values().forEach(this::rewriteNullableReferences);
    }

    private void rewriteNullableReferences(Schema<?> schema) {
        Map<String, Schema> properties = schema.getProperties();
        if (properties == null) {
            return;
        }

        properties.replaceAll((name, property) -> nullableReferenceOf(property));
    }

    private Schema<?> nullableReferenceOf(Schema<?> property) {
        if (!isNullableReference(property)) {
            return property;
        }

        Schema<?> reference = new Schema<>().$ref(property.get$ref());
        Schema<?> nullSchema = new Schema<>();
        nullSchema.setTypes(Set.of(NULL_TYPE));

        return new Schema<>().anyOf(List.of(reference, nullSchema));
    }

    private boolean isNullableReference(Schema<?> property) {
        Set<String> types = property.getTypes();

        return property.get$ref() != null && types != null && types.contains(NULL_TYPE);
    }
}
