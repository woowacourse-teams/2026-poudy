package com.poudy.curation.repository;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.common.json.JsonDataReader;
import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationStatus;
import com.poudy.curation.domain.Curations;
import com.poudy.exception.InfrastructureException;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import java.util.ArrayList;
import java.util.List;
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
    private static final String ID_FIELD = "id";
    private static final String TITLE_FIELD = "title";
    private static final String SUMMARY_FIELD = "summary";
    private static final String DESCRIPTION_FIELD = "description";
    private static final String IMAGE_URLS_FIELD = "image_urls";
    private static final String CATEGORY_IDS_FIELD = "category_ids";
    private static final String PRODUCT_IDS_FIELD = "product_ids";
    private static final String STATUS_FIELD = "status";

    private final Curations curations;

    public CurationRepository(
        JsonDataReader jsonDataReader,
        Categories categories,
        ProductRepository productRepository
    ) {
        try {
            this.curations = Curations.from(
                jsonDataReader.readList(
                    CURATIONS_FILE_NAME,
                    Curation.class,
                    resolvedWith(categories, productRepository.findAll())
                )
            );
        } catch (InfrastructureException exception) {
            throw exception;
        } catch (IllegalArgumentException exception) {
            throw new InfrastructureException("큐레이션 데이터가 올바르지 않습니다.", exception);
        }
    }

    private static JacksonModule resolvedWith(Categories categories, Products products) {
        SimpleModule resolution = new SimpleModule("큐레이션 참조 해석");
        resolution.addDeserializer(Curation.class, new ValueDeserializer<Curation>() {

            @Override
            public Curation deserialize(JsonParser parser, DeserializationContext context) throws JacksonException {
                JsonNode curation = context.readTree(parser);

                return new Curation(
                    longOf(curation, ID_FIELD, context),
                    requiredTextOf(curation, TITLE_FIELD, context),
                    requiredTextOf(curation, SUMMARY_FIELD, context),
                    requiredTextOf(curation, DESCRIPTION_FIELD, context),
                    textListOf(curation, IMAGE_URLS_FIELD, context),
                    categoriesOf(curation, categories, context),
                    productsOf(curation, products, context),
                    statusOf(curation, context)
                );
            }
        });

        return resolution;
    }

    private static List<Category> categoriesOf(
        JsonNode curation,
        Categories categories,
        DeserializationContext context
    )
        throws JacksonException {
        List<Long> ids = idListOf(curation, CATEGORY_IDS_FIELD, context);
        List<Category> resolved = new ArrayList<>();
        for (Long id : ids) {
            Category category = categories.findById(id).orElse(null);
            if (category == null) {
                return context.reportInputMismatch(Curation.class, "큐레이션이 존재하지 않는 카테고리 ID를 참조합니다: %d", id);
            }
            resolved.add(category);
        }
        return resolved;
    }

    private static List<Product> productsOf(
        JsonNode curation,
        Products products,
        DeserializationContext context
    )
        throws JacksonException {
        List<Long> ids = idListOf(curation, PRODUCT_IDS_FIELD, context);
        List<Product> resolved = new ArrayList<>();
        for (Long id : ids) {
            Product product = products.findById(id).orElse(null);
            if (product == null) {
                return context.reportInputMismatch(Curation.class, "큐레이션이 존재하지 않는 제품 ID를 참조합니다: %d", id);
            }
            resolved.add(product);
        }
        return resolved;
    }

    private static CurationStatus statusOf(JsonNode curation, DeserializationContext context) throws JacksonException {
        String status = requiredTextOf(curation, STATUS_FIELD, context);
        try {
            return CurationStatus.valueOf(status);
        } catch (IllegalArgumentException exception) {
            return context.reportInputMismatch(Curation.class, "큐레이션 상태가 올바르지 않습니다: %s", status);
        }
    }

    private static Long longOf(JsonNode value, String field, DeserializationContext context) throws JacksonException {
        JsonNode number = value.get(field);
        if (number == null || !number.isIntegralNumber()) {
            return context.reportInputMismatch(Curation.class, "큐레이션의 \"%s\" 필드는 정수여야 합니다.", field);
        }
        return number.asLong();
    }

    private static String requiredTextOf(
        JsonNode value,
        String field,
        DeserializationContext context
    )
        throws JacksonException {
        JsonNode text = value.get(field);
        if (text == null || !text.isString() || text.asString().isBlank()) {
            return context.reportInputMismatch(Curation.class, "큐레이션의 \"%s\" 필드는 문자열이어야 합니다.", field);
        }
        return text.asString();
    }

    private static List<String> textListOf(
        JsonNode value,
        String field,
        DeserializationContext context
    )
        throws JacksonException {
        JsonNode values = value.get(field);
        if (values == null || !values.isArray()) {
            return context.reportInputMismatch(Curation.class, "큐레이션의 \"%s\" 필드는 배열이어야 합니다.", field);
        }

        List<String> texts = new ArrayList<>();
        for (JsonNode text : values) {
            if (!text.isString() || text.asString().isBlank()) {
                return context.reportInputMismatch(Curation.class, "큐레이션의 \"%s\" 값은 문자열이어야 합니다.", field);
            }
            texts.add(text.asString());
        }
        return texts;
    }

    private static List<Long> idListOf(
        JsonNode value,
        String field,
        DeserializationContext context
    )
        throws JacksonException {
        JsonNode values = value.get(field);
        if (values == null || !values.isArray()) {
            return context.reportInputMismatch(Curation.class, "큐레이션의 \"%s\" 필드는 배열이어야 합니다.", field);
        }

        List<Long> ids = new ArrayList<>();
        for (JsonNode id : values) {
            if (!id.isIntegralNumber()) {
                return context.reportInputMismatch(Curation.class, "큐레이션의 \"%s\" 값은 정수여야 합니다.", field);
            }
            ids.add(id.asLong());
        }
        return ids;
    }

    public Curations findAll() {
        return curations;
    }
}
