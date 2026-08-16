package com.poudy.product.repository;

import com.poudy.common.json.JsonDataReader;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
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
public class ProductRepository {

    private static final String PRODUCTS_FILE_NAME = "products.json";
    private static final String INGREDIENT_ID_FIELD = "ingredient_id";

    private final Products products;

    public ProductRepository(JsonDataReader jsonDataReader, Ingredients ingredients) {
        this.products = new Products(
                jsonDataReader.readList(PRODUCTS_FILE_NAME, Product.class, resolvedWith(ingredients)));
    }

    private static JacksonModule resolvedWith(Ingredients ingredients) {
        SimpleModule resolution = new SimpleModule("제품 성분 해석");
        resolution.addDeserializer(Ingredients.class, new ValueDeserializer<Ingredients>() {

            @Override
            public Ingredients deserialize(JsonParser parser, DeserializationContext context) throws JacksonException {
                JsonNode references = context.readTree(parser);
                if (!references.isArray()) {
                    return context.reportInputMismatch(Ingredients.class, "제품 성분 참조는 배열이어야 합니다.");
                }

                List<Long> ids = new ArrayList<>();
                for (JsonNode reference : references) {
                    ids.add(ingredientIdOf(reference, context));
                }

                return ingredients.findAllById(ids);
            }
        });

        return resolution;
    }

    private static Long ingredientIdOf(JsonNode reference, DeserializationContext context) throws JacksonException {
        JsonNode ingredientId = reference.get(INGREDIENT_ID_FIELD);
        if (ingredientId == null || !ingredientId.isIntegralNumber()) {
            return context
                    .reportInputMismatch(Ingredients.class, "제품 성분 참조의 \"%s\" 필드는 정수여야 합니다.", INGREDIENT_ID_FIELD);
        }

        return ingredientId.asLong();
    }

    public Products findAll() {
        return products;
    }

    public long countContaining(Long ingredientId) {
        return products.countContaining(ingredientId);
    }
}
