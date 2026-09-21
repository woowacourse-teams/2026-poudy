package com.poudy.curation.repository;

import com.poudy.common.json.JsonDataReader;
import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationBanner;
import com.poudy.curation.domain.CurationBlock;
import com.poudy.curation.domain.CurationDetail;
import com.poudy.curation.domain.CurationFilter;
import com.poudy.curation.domain.CurationProductMapping;
import com.poudy.curation.domain.CurationPublicationStatus;
import com.poudy.curation.domain.Curations;
import com.poudy.exception.InfrastructureException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.JacksonModule;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.module.SimpleModule;

@Repository
public class CurationRepository {
    private static final String CURATIONS_FILE_NAME = "curations.json";

    private final Curations curations;

    public CurationRepository(JsonDataReader reader) {
        try {
            this.curations = Curations.from(
                reader.readList(CURATIONS_FILE_NAME, Curation.class, deserializationModule())
            );
        } catch (IllegalArgumentException exception) {
            throw new InfrastructureException("큐레이션 데이터가 올바르지 않습니다.", exception);
        }
    }

    private static JacksonModule deserializationModule() {
        SimpleModule resolution = new SimpleModule("큐레이션 데이터 해석");
        resolution.addDeserializer(Curation.class, new ValueDeserializer<Curation>() {
            @Override
            public Curation deserialize(JsonParser parser, DeserializationContext context) throws JacksonException {
                try {
                    return curation(context.readTree(parser), context);
                } catch (IllegalArgumentException | ArithmeticException exception) {
                    return context.reportInputMismatch(
                        Curation.class,
                        "큐레이션 데이터가 올바르지 않습니다: %s",
                        exception.getMessage()
                    );
                }
            }
        });
        return resolution;
    }

    private static Curation curation(JsonNode node, DeserializationContext context) throws JacksonException {
        JsonNode banner = required(node, "banner", context);
        JsonNode detail = required(node, "detail", context);
        List<CurationBlock> blocks = new ArrayList<>();
        for (JsonNode block : array(detail, "blocks", context)) {
            blocks.add(block(block, context));
        }
        return new Curation(
            number(node, "id", context),
            text(node, "title", context),
            text(node, "description", context),
            publicationStatus(node, context),
            new CurationBanner(
                booleanValue(banner, "visible", context),
                nullableText(banner, "thumbnail_image_url", context)
            ),
            CurationDetail.from(blocks)
        );
    }

    private static CurationPublicationStatus publicationStatus(
        JsonNode node,
        DeserializationContext context
    )
        throws JacksonException {
        String value = text(node, "status", context);
        try {
            return CurationPublicationStatus.valueOf(value);
        } catch (IllegalArgumentException exception) {
            return context.reportInputMismatch(Curation.class, "지원하지 않는 큐레이션 게시 상태입니다: %s", value);
        }
    }

    private static CurationBlock block(JsonNode node, DeserializationContext context) throws JacksonException {
        UUID id = UUID.fromString(text(node, "id", context));
        String type = text(node, "type", context);
        int top = Math.toIntExact(number(node, "spacing_top", context));
        int bottom = Math.toIntExact(number(node, "spacing_bottom", context));

        return switch (type) {
            case "IMAGE" -> CurationBlock.image(
                id,
                top,
                bottom,
                nullableText(node, "image_url", context)
            );
            case "PRODUCTS" -> CurationBlock.products(id, top, bottom, productIds(node, context));
            case "PRODUCTS_BY_FILTER" -> CurationBlock.productsByFilter(
                id,
                top,
                bottom,
                filters(node, context),
                productMappings(node, context)
            );
            default -> context.reportInputMismatch(Curation.class, "지원하지 않는 큐레이션 블록 타입입니다: %s", type);
        };
    }

    private static List<Long> productIds(JsonNode node, DeserializationContext context) throws JacksonException {
        List<Long> products = new ArrayList<>();
        for (JsonNode product : array(node, "products", context)) {
            products.add(number(product, "product_id", context));
        }
        return products;
    }

    private static List<CurationFilter> filters(JsonNode node, DeserializationContext context) throws JacksonException {
        List<CurationFilter> filters = new ArrayList<>();
        for (JsonNode filter : array(node, "filters", context)) {
            filters.add(
                new CurationFilter(
                    UUID.fromString(text(filter, "id", context)),
                    text(filter, "label", context)
                )
            );
        }
        return filters;
    }

    private static List<CurationProductMapping> productMappings(
        JsonNode node,
        DeserializationContext context
    )
        throws JacksonException {
        List<CurationProductMapping> products = new ArrayList<>();
        for (JsonNode product : array(node, "products", context)) {
            List<UUID> filterIds = new ArrayList<>();
            for (JsonNode filterId : array(product, "filter_ids", context)) {
                if (!filterId.isString()) {
                    return context.reportInputMismatch(Curation.class, "필터 ID는 UUID 문자열이어야 합니다.");
                }
                filterIds.add(UUID.fromString(filterId.asString()));
            }
            products.add(new CurationProductMapping(number(product, "product_id", context), filterIds));
        }
        return products;
    }

    private static JsonNode required(JsonNode node, String field, DeserializationContext context)
        throws JacksonException {
        JsonNode value = node.get(field);
        if (value == null) {
            return context.reportInputMismatch(Curation.class, "큐레이션 필드가 없습니다: %s", field);
        }
        return value;
    }

    private static JsonNode array(JsonNode node, String field, DeserializationContext context) throws JacksonException {
        JsonNode value = required(node, field, context);
        if (!value.isArray()) {
            return context.reportInputMismatch(Curation.class, "배열이 필요합니다: %s", field);
        }
        return value;
    }

    private static long number(JsonNode node, String field, DeserializationContext context) throws JacksonException {
        JsonNode value = required(node, field, context);
        if (!value.isIntegralNumber() || !value.canConvertToLong()) {
            return context.reportInputMismatch(Curation.class, "Long 정수가 필요합니다: %s", field);
        }
        return value.asLong();
    }

    private static boolean booleanValue(JsonNode node, String field, DeserializationContext context)
        throws JacksonException {
        JsonNode value = required(node, field, context);
        if (!value.isBoolean()) {
            return context.reportInputMismatch(Curation.class, "boolean 값이 필요합니다: %s", field);
        }
        return value.asBoolean();
    }

    private static String text(JsonNode node, String field, DeserializationContext context) throws JacksonException {
        JsonNode value = required(node, field, context);
        if (!value.isString()) {
            return context.reportInputMismatch(Curation.class, "문자열이 필요합니다: %s", field);
        }
        return value.asString();
    }

    private static String nullableText(JsonNode node, String field, DeserializationContext context)
        throws JacksonException {
        JsonNode value = required(node, field, context);
        if (value.isNull()) {
            return null;
        }
        if (!value.isString()) {
            return context.reportInputMismatch(Curation.class, "문자열 또는 null이 필요합니다: %s", field);
        }
        return value.asString();
    }

    public Curations findAll() {
        return curations;
    }
}
