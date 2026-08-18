package com.poudy.product.repository;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.common.json.JsonDataReader;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductFactory;
import com.poudy.product.domain.ProductVariant;
import com.poudy.product.domain.ProductVariants;
import com.poudy.product.domain.Products;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
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
    private static final String IMAGE_URL_FIELD = "image_url";
    private static final String VARIANTS_FIELD = "variants";
    private static final String PRICE_FIELD = "price";
    private static final String VOLUME_VALUE_FIELD = "volume_value";
    private static final String VOLUME_UNIT_FIELD = "volume_unit";
    private static final String STATUS_FIELD = "status";
    private static final String UPDATED_AT_FIELD = "updated_at";
    private static final String INGREDIENTS_FIELD = "ingredients";
    private static final String INGREDIENT_ID_FIELD = "ingredient_id";

    private final Products products;

    public ProductRepository(
            JsonDataReader jsonDataReader,
            Brands brands,
            Categories categories,
            Ingredients ingredients,
            ProductFactory productFactory) {
        this.products = new Products(
                jsonDataReader.readList(
                        PRODUCTS_FILE_NAME,
                        Product.class,
                        resolvedWith(brands, categories, ingredients, productFactory)));
    }

    private static JacksonModule resolvedWith(
            Brands brands,
            Categories categories,
            Ingredients ingredients,
            ProductFactory productFactory) {
        SimpleModule resolution = new SimpleModule("제품 참조 해석");
        resolution.addDeserializer(Product.class, new ValueDeserializer<Product>() {

            @Override
            public Product deserialize(JsonParser parser, DeserializationContext context) throws JacksonException {
                JsonNode product = context.readTree(parser);
                Category category = categoryOf(product, categories, context);
                Ingredients productIngredients = ingredientsOf(product, ingredients, context);

                return productFactory.create(
                        idOf(product, ID_FIELD, context),
                        requiredTextOf(product, PRODUCT_NAME_FIELD, context),
                        brandOf(product, brands, context),
                        category,
                        productIngredients,
                        nullableTextOf(product, IMAGE_URL_FIELD, context),
                        variantsOf(product, context),
                        updatedAtOf(product, context));
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

        List<Long> unresolved = ids.stream()
                .filter(id -> ingredients.findById(id).isEmpty())
                .distinct()
                .toList();
        if (!unresolved.isEmpty()) {
            return context.reportInputMismatch(
                    Ingredients.class,
                    "제품이 존재하지 않는 성분 ID를 참조합니다: %s",
                    unresolved);
        }

        return ingredients.findAllById(ids);
    }

    private static ProductVariants variantsOf(JsonNode product, DeserializationContext context)
            throws JacksonException {
        JsonNode variants = product.get(VARIANTS_FIELD);
        if (variants == null || !variants.isArray() || variants.size() == 0) {
            return context.reportInputMismatch(ProductVariants.class, "제품 용량 옵션은 하나 이상이어야 합니다.");
        }

        List<ProductVariant> values = new ArrayList<>();
        for (JsonNode variant : variants) {
            values.add(
                    new ProductVariant(
                            idOf(variant, ID_FIELD, context),
                            longOf(variant, PRICE_FIELD, context),
                            decimalOf(variant, VOLUME_VALUE_FIELD, context),
                            requiredTextOf(variant, VOLUME_UNIT_FIELD, context),
                            requiredTextOf(variant, STATUS_FIELD, context)));
        }

        return new ProductVariants(values);
    }

    private static Long idOf(JsonNode value, String field, DeserializationContext context) throws JacksonException {
        return longOf(value, field, context);
    }

    private static Long longOf(JsonNode value, String field, DeserializationContext context) throws JacksonException {
        JsonNode id = value.get(field);
        if (id == null || !id.isIntegralNumber()) {
            return context.reportInputMismatch(Product.class, "제품의 \"%s\" 필드는 정수여야 합니다.", field);
        }

        return id.asLong();
    }

    private static BigDecimal decimalOf(JsonNode value, String field, DeserializationContext context)
            throws JacksonException {
        JsonNode number = value.get(field);
        if (number == null || !number.isNumber()) {
            return context.reportInputMismatch(ProductVariant.class, "제품 용량 옵션의 \"%s\" 필드는 숫자여야 합니다.", field);
        }

        return new BigDecimal(number.asText());
    }

    private static String requiredTextOf(JsonNode value, String field, DeserializationContext context)
            throws JacksonException {
        String text = textOf(value, field);
        if (text == null || text.isBlank()) {
            return context.reportInputMismatch(Product.class, "제품의 \"%s\" 필드는 문자열이어야 합니다.", field);
        }

        return text;
    }

    private static String nullableTextOf(JsonNode value, String field, DeserializationContext context)
            throws JacksonException {
        JsonNode text = value.get(field);
        if (text == null || text.isNull()) {
            return null;
        }
        if (!text.isTextual()) {
            return context.reportInputMismatch(
                    Product.class,
                    "제품의 \"%s\" 필드는 문자열 또는 null이어야 합니다.",
                    field);
        }

        return text.asText();
    }

    private static String textOf(JsonNode value, String field) {
        JsonNode text = value.get(field);
        if (text == null || !text.isTextual()) {
            return null;
        }

        return text.asText();
    }

    private static OffsetDateTime updatedAtOf(JsonNode product, DeserializationContext context)
            throws JacksonException {
        String updatedAt = requiredTextOf(product, UPDATED_AT_FIELD, context);
        try {
            return OffsetDateTime.parse(updatedAt);
        } catch (DateTimeParseException exception) {
            return context.reportInputMismatch(Product.class, "제품의 \"%s\" 필드는 날짜와 시간이어야 합니다.", UPDATED_AT_FIELD);
        }
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
