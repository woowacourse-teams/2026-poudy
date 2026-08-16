package com.poudy.product.repository;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.common.json.JsonDataReader;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
    private static final String ID_FIELD = "id";
    private static final String BRAND_ID_FIELD = "brand_id";
    private static final String CATEGORY_ID_FIELD = "category_id";
    private static final String PRODUCT_NAME_FIELD = "product_name";
    private static final String INGREDIENTS_FIELD = "ingredients";
    private static final String INGREDIENT_ID_FIELD = "ingredient_id";

    private final Products products;

    public ProductRepository(
            JsonDataReader jsonDataReader,
            Brands brands,
            Categories categories,
            Ingredients ingredients) {
        this.products = new Products(
                jsonDataReader.readList(
                        PRODUCTS_FILE_NAME,
                        Product.class,
                        resolvedWith(brands, categories, ingredients)));
    }

    private static JacksonModule resolvedWith(Brands brands, Categories categories, Ingredients ingredients) {
        SimpleModule resolution = new SimpleModule("제품 참조 해석");
        resolution.addDeserializer(Product.class, new ValueDeserializer<Product>() {

            @Override
            public Product deserialize(JsonParser parser, DeserializationContext context) throws JacksonException {
                JsonNode product = context.readTree(parser);

                return new Product(
                        idOf(product, ID_FIELD, context),
                        brandOf(product, brands, context),
                        categoryOf(product, categories, context),
                        textOf(product, PRODUCT_NAME_FIELD),
                        ingredientsOf(product, ingredients, context));
            }
        });

        return resolution;
    }

    private static Brand brandOf(JsonNode product, Brands brands, DeserializationContext context)
            throws JacksonException {
        Long brandId = idOf(product, BRAND_ID_FIELD, context);
        Brand brand = brands.findById(brandId).orElse(null);
        if (brand == null) {
            return context.reportInputMismatch(
                    Product.class,
                    "제품이 존재하지 않는 브랜드 ID를 참조합니다: %d",
                    brandId);
        }

        return brand;
    }

    private static Category categoryOf(JsonNode product, Categories categories, DeserializationContext context)
            throws JacksonException {
        Long categoryId = idOf(product, CATEGORY_ID_FIELD, context);
        Category category = categories.findById(categoryId).orElse(null);
        if (category == null) {
            return context.reportInputMismatch(
                    Product.class,
                    "제품이 존재하지 않는 카테고리 ID를 참조합니다: %d",
                    categoryId);
        }

        return category;
    }

    private static Ingredients ingredientsOf(
            JsonNode product,
            Ingredients ingredients,
            DeserializationContext context)
            throws JacksonException {
        JsonNode references = product.get(INGREDIENTS_FIELD);
        if (references == null || !references.isArray()) {
            return context.reportInputMismatch(Ingredients.class, "제품 성분 참조는 배열이어야 합니다.");
        }

        List<Long> ids = new ArrayList<>();
        for (JsonNode reference : references) {
            ids.add(ingredientIdOf(reference, context));
        }

        return ingredients.findAllById(ids);
    }

    private static Long idOf(JsonNode value, String field, DeserializationContext context) throws JacksonException {
        JsonNode id = value.get(field);
        if (id == null || !id.isIntegralNumber()) {
            return context.reportInputMismatch(Product.class, "제품의 \"%s\" 필드는 정수여야 합니다.", field);
        }

        return id.asLong();
    }

    private static String textOf(JsonNode value, String field) {
        JsonNode text = value.get(field);
        if (text == null || text.isNull()) {
            return null;
        }

        return text.asText();
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

    public Map<Long, Long> countByCategoryId() {
        return products.countByCategoryId();
    }

    public Map<Long, Long> countByCategoryIdInBrand(Long brandId) {
        return products.countByCategoryIdInBrand(brandId);
    }

    public Map<Long, Long> countByBrandId() {
        return products.countByBrandId();
    }
}
