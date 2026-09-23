package com.poudy.product.repository;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.mapping;
import static java.util.stream.Collectors.toList;
import static java.util.stream.Collectors.toMap;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.IngredientCatalog;
import com.poudy.ingredient.repository.IngredientRepository;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductVariant;
import com.poudy.product.domain.ProductVariants;
import com.poudy.product.domain.sensory.MoistureLevel;
import com.poudy.product.domain.sensory.OilLevel;
import com.poudy.product.domain.sensory.ProductSensory;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Component;

@Component
class ProductLoader {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final NamedParameterJdbcTemplate jdbc;
    private final IngredientRepository ingredientRepository;

    ProductLoader(NamedParameterJdbcTemplate jdbc, IngredientRepository ingredientRepository) {
        this.jdbc = jdbc;
        this.ingredientRepository = ingredientRepository;
    }

    List<Product> load(List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<String, Object> parameters = Map.of("ids", new SqlArrayValue("bigint", ids.stream().distinct().toArray()));
        Map<Long, List<ProductVariant>> variants = jdbc.query(
            """
                select * from product_variant where product_id = any(:ids) order by product_id, display_order
                """,
            parameters,
            (rs, row) -> Map.entry(
                rs.getLong("product_id"),
                new ProductVariant(
                    rs.getLong("id"),
                    rs.getLong("price"),
                    rs.getBigDecimal("volume_value"),
                    rs.getString("volume_unit"),
                    rs.getString("status")
                )
            )
        )
            .stream().collect(groupingBy(Map.Entry::getKey, mapping(Map.Entry::getValue, toList())));
        Map<Long, List<Long>> ingredientIds = jdbc.query("""
            select component.product_id, ingredient.ingredient_id
            from product_component component
            join product_ingredient ingredient on ingredient.component_id = component.id
            where component.product_id = any(:ids)
            order by component.product_id, component.display_order, ingredient.display_order
            """, parameters, (rs, row) -> Map.entry(rs.getLong("product_id"), rs.getLong("ingredient_id")))
            .stream().collect(groupingBy(Map.Entry::getKey, mapping(Map.Entry::getValue, toList())));
        IngredientCatalog ingredients = ingredientRepository.findByIds(
            ingredientIds.values().stream()
                .flatMap(List::stream).distinct().toList()
        );
        Map<Long, Product> loaded = jdbc.query("""
            select p.*, b.korean_name, b.english_name, b.image_url as brand_image,
                c.parent_id, c.name as category_name, c.depth from product p
            join brand b on b.id = p.brand_id join category c on c.id = p.category_id where p.id = any(:ids)
            """, parameters, (rs, row) -> {
            long id = rs.getLong("id");
            return new Product(
                id,
                rs.getString("product_name"),
                new Brand(
                    rs.getLong("brand_id"),
                    rs.getString("korean_name"),
                    rs.getString("english_name"),
                    rs.getString("brand_image")
                ),
                new Category(
                    rs.getLong("category_id"),
                    rs.getObject("parent_id", Long.class),
                    rs.getString("category_name"),
                    rs.getInt("depth")
                ),
                ingredients.resolveInOrder(ingredientIds.getOrDefault(id, List.of())),
                rs.getString("image_url"),
                new ProductVariants(variants.get(id)),
                new ProductSensory(
                    new MoistureLevel(rs.getInt("moisture_level")),
                    new OilLevel(rs.getInt("oil_level"))
                ),
                rs.getObject("updated_at", LocalDateTime.class).atZone(SEOUL).toOffsetDateTime()
            );
        }).stream().collect(toMap(Product::id, p -> p));
        return ids.stream().filter(loaded::containsKey).map(loaded::get).toList();
    }
}
