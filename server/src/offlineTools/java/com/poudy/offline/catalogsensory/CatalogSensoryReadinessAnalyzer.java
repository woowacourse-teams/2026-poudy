package com.poudy.offline.catalogsensory;

import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientTag;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.CatalogSummary;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.CategoryCount;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.CategoryInference;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.ConfidenceDistribution;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.Coverage;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.DisclosedAmountSummary;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.DuplicateIngredientReference;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.InferenceSummary;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.IngredientCountDistribution;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.IngredientFrequency;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.IngredientListQuality;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.InputFile;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.LevelDistribution;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.LevelFields;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.LevelPairCount;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.LevelStatus;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.RoleCoverage;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.RoleUsage;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.SourceFieldPresence;
import com.poudy.product.domain.sensory.HeuristicProductSensoryEstimator;
import com.poudy.product.domain.sensory.ProductSensory;
import com.poudy.product.domain.sensory.ProductSensoryEstimator;
import com.poudy.product.domain.sensory.SensoryModelVersion;
import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.TagCategory;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

public final class CatalogSensoryReadinessAnalyzer {

    private static final String PRODUCTS_FILE = "products.json";
    private static final String INGREDIENTS_FILE = "ingredients.json";
    private static final String CATEGORIES_FILE = "categories.json";
    private static final int FREQUENCY_LIMIT = 20;

    private static final ObjectMapper MAPPER = JsonMapper.builder().build();

    private static final Set<String> SENSORY_SCREENING_ROLES = Set.of(
            FormulationRole.ABSORBENT.name(),
            FormulationRole.EMOLLIENT.name(),
            FormulationRole.FILM_FORMING.name(),
            FormulationRole.HUMECTANT.name(),
            FormulationRole.MOISTURISING.name(),
            FormulationRole.VISCOSITY_CONTROLLING.name());

    private final ProductSensoryEstimator sensoryEstimator;

    public CatalogSensoryReadinessAnalyzer() {
        this(new HeuristicProductSensoryEstimator());
    }

    CatalogSensoryReadinessAnalyzer(ProductSensoryEstimator sensoryEstimator) {
        this.sensoryEstimator = sensoryEstimator;
    }

    public CatalogSensoryReadinessReport analyze(Path catalogDirectory) throws IOException, JacksonException {
        Path productsFile = catalogDirectory.resolve(PRODUCTS_FILE);
        Path ingredientsFile = catalogDirectory.resolve(INGREDIENTS_FILE);
        Path categoriesFile = catalogDirectory.resolve(CATEGORIES_FILE);

        CatalogInput productsInput = readArray(productsFile, "products");
        CatalogInput ingredientsInput = readArray(ingredientsFile, "ingredients");
        CatalogInput categoriesInput = readArray(categoriesFile, "categories");
        JsonNode products = productsInput.values;
        JsonNode ingredients = ingredientsInput.values;
        JsonNode categories = categoriesInput.values;

        IngredientCatalog ingredientCatalog = inspectIngredients(ingredients);
        CategoryCatalog categoryCatalog = inspectCategories(categories);
        ProductInspection productInspection = inspectProducts(
                products,
                ingredientCatalog.values(),
                categoryCatalog.values(),
                sensoryEstimator);

        CatalogSummary catalogSummary = new CatalogSummary(
                products.size(),
                ingredients.size(),
                categories.size(),
                productInspection.referencedIngredientIds.size(),
                productInspection.malformedProducts,
                ingredientCatalog.malformed,
                categoryCatalog.malformed,
                productInspection.duplicateProductIds,
                ingredientCatalog.duplicates,
                categoryCatalog.duplicates,
                productInspection.unknownCategoryReferences,
                ingredientCatalog.malformedTagMappings,
                ingredientCatalog.unrecognizedFormulationRoles);

        return new CatalogSensoryReadinessReport(
                CatalogSensoryReadinessReport.SCHEMA_VERSION,
                CatalogSensoryReadinessReport.TOOL_VERSION,
                List.of(productsInput.metadata, ingredientsInput.metadata, categoriesInput.metadata),
                catalogSummary,
                productInspection.categoryCounts(categoryCatalog.values()),
                new LevelFields(productInspection.moisture.toReport(), productInspection.oil.toReport()),
                productInspection.inference.toReport(sensoryEstimator.modelVersion()),
                productInspection.ingredientListQuality(ingredientCatalog.values()),
                distributionOf(productInspection.ingredientCounts),
                productInspection.roleCoverage(ingredientCatalog.values()),
                productInspection.roleUsage(ingredientCatalog.values()),
                productInspection.disclosedAmounts.toReport(),
                productInspection.sourceFields.toReport(),
                productInspection.frequencies(ingredientCatalog.values(), FrequencySelection.ALL),
                productInspection.frequencies(ingredientCatalog.values(), FrequencySelection.SENSORY_ROLE),
                productInspection.frequencies(ingredientCatalog.values(), FrequencySelection.WITHOUT_SENSORY_ROLE));
    }

    private static CatalogInput readArray(Path file, String rootName) throws IOException, JacksonException {
        if (!Files.isRegularFile(file)) {
            throw new IOException("필수 카탈로그 파일이 없습니다: " + file.getFileName());
        }

        byte[] snapshot = Files.readAllBytes(file);
        JsonNode document = MAPPER.readTree(snapshot);
        JsonNode root = document == null ? null : document.get(rootName);
        if (root == null || !root.isArray()) {
            throw new IllegalArgumentException(
                    "카탈로그 최상위 필드는 배열이어야 합니다: %s (\"%s\")"
                            .formatted(file.getFileName(), rootName));
        }
        InputFile metadata = new InputFile(
                file.getFileName().toString(),
                snapshot.length,
                sha256(snapshot));
        return new CatalogInput(metadata, root);
    }

    private static IngredientCatalog inspectIngredients(JsonNode ingredients) {
        Map<Long, IngredientInfo> values = new HashMap<>();
        int malformed = 0;
        int duplicates = 0;
        int malformedTagMappings = 0;
        int unrecognizedFormulationRoles = 0;

        for (JsonNode ingredient : ingredients) {
            if (!ingredient.isObject()) {
                malformed++;
                continue;
            }

            Long id = positiveLongOf(ingredient, "id");
            if (id == null) {
                malformed++;
                continue;
            }

            RoleInspection roles = rolesOf(ingredient.get("tag_mappings"));
            malformedTagMappings += roles.malformed;
            unrecognizedFormulationRoles += roles.unrecognizedFormulationRoles;
            IngredientInfo previous = values.putIfAbsent(
                    id,
                    new IngredientInfo(
                            textOf(ingredient, "korean_name"),
                            roles.formulationRoles,
                            roles.sensoryRoles));
            if (previous != null) {
                duplicates++;
            }
        }

        return new IngredientCatalog(
                Map.copyOf(values),
                malformed,
                duplicates,
                malformedTagMappings,
                unrecognizedFormulationRoles);
    }

    private static RoleInspection rolesOf(JsonNode mappings) {
        if (mappings == null || mappings.isNull()) {
            return new RoleInspection(Set.of(), Set.of(), 0, 0);
        }
        if (!mappings.isArray()) {
            return new RoleInspection(Set.of(), Set.of(), 1, 0);
        }

        Set<String> formulationRoles = new TreeSet<>();
        int malformed = 0;
        int unrecognizedFormulationRoles = 0;
        for (JsonNode mapping : mappings) {
            if (!mapping.isObject()) {
                malformed++;
                continue;
            }

            JsonNode category = mapping.get("category");
            JsonNode name = mapping.get("name");
            if (category == null || !category.isString() || name == null || !name.isString()) {
                malformed++;
                continue;
            }
            if ("FUNCTION".equals(category.stringValue())) {
                if (FormulationRole.from(name.stringValue()).isPresent()) {
                    formulationRoles.add(name.stringValue());
                } else {
                    unrecognizedFormulationRoles++;
                }
            }
        }

        Set<String> sensoryRoles = new TreeSet<>(formulationRoles);
        sensoryRoles.retainAll(SENSORY_SCREENING_ROLES);
        return new RoleInspection(
                Set.copyOf(formulationRoles),
                Set.copyOf(sensoryRoles),
                malformed,
                unrecognizedFormulationRoles);
    }

    private static CategoryCatalog inspectCategories(JsonNode categories) {
        Map<Long, CategoryInfo> values = new HashMap<>();
        int malformed = 0;
        int duplicates = 0;

        for (JsonNode category : categories) {
            if (!category.isObject()) {
                malformed++;
                continue;
            }

            Long id = positiveLongOf(category, "id");
            String name = textOf(category, "name");
            Long parentId = nullablePositiveLongOf(category, "parent_id");
            boolean invalidParent = category.hasNonNull("parent_id") && parentId == null;
            if (id == null || name.isBlank() || invalidParent) {
                malformed++;
                continue;
            }
            if (values.putIfAbsent(id, new CategoryInfo(parentId, name)) != null) {
                duplicates++;
            }
        }

        return new CategoryCatalog(Map.copyOf(values), malformed, duplicates);
    }

    private static ProductInspection inspectProducts(
            JsonNode products,
            Map<Long, IngredientInfo> ingredients,
            Map<Long, CategoryInfo> categories,
            ProductSensoryEstimator sensoryEstimator) {
        ProductInspection inspection = new ProductInspection();
        Set<Long> productIds = new HashSet<>();
        int productIndex = 0;

        for (JsonNode product : products) {
            productIndex++;
            if (!product.isObject()) {
                inspection.malformedProducts++;
                inspection.inference.skip();
                continue;
            }

            Long productId = positiveLongOf(product, "id");
            if (productId == null) {
                inspection.malformedProducts++;
            } else if (!productIds.add(productId)) {
                inspection.duplicateProductIds++;
            }

            inspection.moisture.accept(product, "moisture_level");
            inspection.oil.accept(product, "oil_level");
            inspection.sourceFields.accept(product);
            Long categoryId = inspection.acceptCategory(product, categories);
            Ingredients productIngredients = inspection.acceptIngredients(
                    product,
                    productId,
                    productIndex,
                    ingredients);
            inspection.acceptInference(
                    categoryId,
                    productIngredients,
                    categories,
                    sensoryEstimator);
        }

        return inspection;
    }

    private static IngredientCountDistribution distributionOf(List<Integer> counts) {
        if (counts.isEmpty()) {
            return new IngredientCountDistribution(0, 0, 0, 0, 0, 0, 0, BigDecimal.ZERO.setScale(2));
        }

        List<Integer> sorted = counts.stream().sorted().toList();
        BigDecimal sum = sorted.stream()
                .map(BigDecimal::valueOf)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal mean = sum.divide(BigDecimal.valueOf(sorted.size()), 2, RoundingMode.HALF_UP);

        return new IngredientCountDistribution(
                sorted.size(),
                sorted.get(0),
                percentile(sorted, 25),
                percentile(sorted, 50),
                percentile(sorted, 75),
                percentile(sorted, 90),
                sorted.get(sorted.size() - 1),
                mean);
    }

    private static int percentile(List<Integer> sorted, int percentage) {
        int index = Math.floorDiv((sorted.size() - 1) * percentage, 100);
        return sorted.get(index);
    }

    private static String sha256(byte[] snapshot) {
        MessageDigest digest;
        try {
            digest = MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("JDK가 SHA-256을 제공하지 않습니다.", exception);
        }

        return HexFormat.of().formatHex(digest.digest(snapshot));
    }

    private static Long positiveLongOf(JsonNode object, String field) {
        JsonNode value = object.get(field);
        if (value == null || !value.isIntegralNumber()) {
            return null;
        }
        BigInteger number = value.bigIntegerValue();
        if (number.signum() <= 0 || number.compareTo(BigInteger.valueOf(Long.MAX_VALUE)) > 0) {
            return null;
        }
        return number.longValue();
    }

    private static Long nullablePositiveLongOf(JsonNode object, String field) {
        JsonNode value = object.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        return positiveLongOf(object, field);
    }

    private static String textOf(JsonNode object, String field) {
        JsonNode value = object.get(field);
        return value != null && value.isString() ? value.stringValue() : "";
    }

    private enum FrequencySelection {
        ALL,
        SENSORY_ROLE,
        WITHOUT_SENSORY_ROLE
    }

    private record IngredientCatalog(
            Map<Long, IngredientInfo> values,
            int malformed,
            int duplicates,
            int malformedTagMappings,
            int unrecognizedFormulationRoles) {
    }

    private record CatalogInput(InputFile metadata, JsonNode values) {
    }

    private record CategoryCatalog(Map<Long, CategoryInfo> values, int malformed, int duplicates) {
    }

    private record CategoryInfo(Long parentId, String name) {

        Category toDomain(Long id) {
            return new Category(id, parentId, name, parentId == null ? 0 : 1, null, null);
        }
    }

    private record IngredientInfo(String name, Set<String> formulationRoles, Set<String> sensoryRoles) {

        Ingredient toDomain(Long id) {
            List<IngredientTag> tags = formulationRoles.stream()
                    .sorted()
                    .map(
                            role -> new IngredientTag(
                                    role,
                                    TagCategory.FUNCTION,
                                    "catalog tag mapping"))
                    .toList();
            return new Ingredient(
                    id,
                    name,
                    "",
                    "",
                    "",
                    "",
                    List.of(),
                    tags,
                    null,
                    null);
        }
    }

    private record RoleInspection(
            Set<String> formulationRoles,
            Set<String> sensoryRoles,
            int malformed,
            int unrecognizedFormulationRoles) {
    }

    private static final class LevelInspection {

        private int absent;
        private int explicitNull;
        private int valid;
        private int invalid;

        private void accept(JsonNode product, String field) {
            if (!product.has(field)) {
                absent++;
                return;
            }

            JsonNode value = product.get(field);
            if (value == null || value.isNull()) {
                explicitNull++;
            } else if (isSensoryLevel(value)) {
                valid++;
            } else {
                invalid++;
            }
        }

        private LevelStatus toReport() {
            return new LevelStatus(absent, explicitNull, valid, invalid);
        }

        private static boolean isSensoryLevel(JsonNode value) {
            if (!value.isIntegralNumber()) {
                return false;
            }
            BigInteger number = value.bigIntegerValue();
            return number.signum() >= 0 && number.compareTo(BigInteger.valueOf(3)) <= 0;
        }
    }

    private static final class DisclosedAmountInspection {

        private final Set<Integer> productIndexes = new HashSet<>();
        private final Map<String, Integer> types = new TreeMap<>();
        private final Map<String, Integer> units = new TreeMap<>();
        private int references;
        private int malformed;

        private void accept(JsonNode reference, int productIndex) {
            if (!reference.has("disclosed_amount")) {
                return;
            }

            references++;
            productIndexes.add(productIndex);
            JsonNode amount = reference.get("disclosed_amount");
            if (amount == null || !amount.isObject()) {
                malformed++;
                return;
            }

            JsonNode type = amount.get("type");
            JsonNode unit = amount.get("unit");
            JsonNode value = amount.get("value");
            if (type == null || !type.isString() || type.stringValue().isBlank()
                    || unit == null || !unit.isString() || unit.stringValue().isBlank()
                    || value == null || !value.isNumber() || value.decimalValue().signum() < 0) {
                malformed++;
                return;
            }

            types.merge(type.stringValue(), 1, Integer::sum);
            units.merge(unit.stringValue(), 1, Integer::sum);
        }

        private DisclosedAmountSummary toReport() {
            return new DisclosedAmountSummary(
                    productIndexes.size(),
                    references,
                    malformed,
                    new TreeMap<>(types),
                    new TreeMap<>(units));
        }
    }

    private static final class SourceFieldInspection {

        private int applicationTypeProducts;
        private int usageVariantProducts;
        private int formulaArchetypeProducts;
        private int sourceUrlProducts;

        private void accept(JsonNode product) {
            if (product.hasNonNull("application_type")) {
                applicationTypeProducts++;
            }
            if (product.hasNonNull("usage_variant")) {
                usageVariantProducts++;
            }
            if (product.hasNonNull("formula_archetype")) {
                formulaArchetypeProducts++;
            }
            if (product.hasNonNull("source_url")) {
                sourceUrlProducts++;
            }
        }

        private SourceFieldPresence toReport() {
            return new SourceFieldPresence(
                    applicationTypeProducts,
                    usageVariantProducts,
                    formulaArchetypeProducts,
                    sourceUrlProducts,
                    false);
        }
    }

    private static final class InferenceInspection {

        private final int[] moistureLevels = new int[4];
        private final int[] oilLevels = new int[4];
        private final int[][] levelPairs = new int[4][4];
        private final List<BigDecimal> confidences = new ArrayList<>();
        private final Map<Long, CategoryInferenceInspection> categories = new TreeMap<>();
        private int candidateProducts;
        private int inferredProducts;
        private int skippedProducts;

        private void accept(Long categoryId, String categoryPath, ProductSensory sensory) {
            candidateProducts++;
            inferredProducts++;
            int moistureLevel = sensory.moisture().value();
            int oilLevel = sensory.oil().value();
            moistureLevels[moistureLevel]++;
            oilLevels[oilLevel]++;
            levelPairs[moistureLevel][oilLevel]++;
            confidences.add(sensory.confidence().value());
            categories
                    .computeIfAbsent(
                            categoryId,
                            ignored -> new CategoryInferenceInspection(categoryId, categoryPath))
                    .accept(sensory);
        }

        private void skip() {
            candidateProducts++;
            skippedProducts++;
        }

        private InferenceSummary toReport(SensoryModelVersion modelVersion) {
            List<LevelPairCount> pairs = new ArrayList<>();
            for (int moistureLevel = 0; moistureLevel < levelPairs.length; moistureLevel++) {
                for (int oilLevel = 0; oilLevel < levelPairs[moistureLevel].length; oilLevel++) {
                    int products = levelPairs[moistureLevel][oilLevel];
                    if (products > 0) {
                        pairs.add(new LevelPairCount(moistureLevel, oilLevel, products));
                    }
                }
            }

            return new InferenceSummary(
                    modelVersion,
                    candidateProducts,
                    inferredProducts,
                    skippedProducts,
                    levelDistributionOf(moistureLevels),
                    levelDistributionOf(oilLevels),
                    List.copyOf(pairs),
                    confidenceDistributionOf(confidences),
                    categories.values().stream()
                            .map(CategoryInferenceInspection::toReport)
                            .toList());
        }

        private static LevelDistribution levelDistributionOf(int[] levels) {
            return new LevelDistribution(levels[0], levels[1], levels[2], levels[3]);
        }

        private static ConfidenceDistribution confidenceDistributionOf(List<BigDecimal> values) {
            if (values.isEmpty()) {
                return new ConfidenceDistribution(
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO.setScale(4));
            }

            List<BigDecimal> sorted = values.stream()
                    .sorted(BigDecimal::compareTo)
                    .toList();
            return new ConfidenceDistribution(
                    sorted.getFirst(),
                    percentile(sorted, 25),
                    percentile(sorted, 50),
                    percentile(sorted, 75),
                    sorted.getLast(),
                    meanOf(sorted));
        }

        private static BigDecimal percentile(List<BigDecimal> sorted, int percentage) {
            int index = Math.floorDiv((sorted.size() - 1) * percentage, 100);
            return sorted.get(index);
        }

        private static BigDecimal meanOf(List<BigDecimal> values) {
            BigDecimal sum = values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            return sum.divide(BigDecimal.valueOf(values.size()), 4, RoundingMode.HALF_UP);
        }
    }

    private static final class CategoryInferenceInspection {

        private final Long categoryId;
        private final String categoryPath;
        private final int[] moistureLevels = new int[4];
        private final int[] oilLevels = new int[4];
        private final List<BigDecimal> confidences = new ArrayList<>();

        private CategoryInferenceInspection(Long categoryId, String categoryPath) {
            this.categoryId = categoryId;
            this.categoryPath = categoryPath;
        }

        private void accept(ProductSensory sensory) {
            moistureLevels[sensory.moisture().value()]++;
            oilLevels[sensory.oil().value()]++;
            confidences.add(sensory.confidence().value());
        }

        private CategoryInference toReport() {
            return new CategoryInference(
                    categoryId,
                    categoryPath,
                    confidences.size(),
                    InferenceInspection.levelDistributionOf(moistureLevels),
                    InferenceInspection.levelDistributionOf(oilLevels),
                    InferenceInspection.meanOf(confidences));
        }
    }

    private static final class FrequencyInspection {

        private final Set<Integer> productIndexes = new HashSet<>();
        private int occurrences;

        private void accept(int productIndex) {
            productIndexes.add(productIndex);
            occurrences++;
        }
    }

    private static final class ProductInspection {

        private final LevelInspection moisture = new LevelInspection();
        private final LevelInspection oil = new LevelInspection();
        private final DisclosedAmountInspection disclosedAmounts = new DisclosedAmountInspection();
        private final SourceFieldInspection sourceFields = new SourceFieldInspection();
        private final InferenceInspection inference = new InferenceInspection();
        private final Map<Long, Long> categoryProducts = new TreeMap<>();
        private final Map<Long, FrequencyInspection> ingredientFrequencies = new HashMap<>();
        private final Set<Long> referencedIngredientIds = new HashSet<>();
        private final Set<Long> unresolvedIngredientIds = new TreeSet<>();
        private final List<DuplicateIngredientReference> duplicateReferences = new ArrayList<>();
        private final List<Integer> ingredientCounts = new ArrayList<>();
        private int malformedProducts;
        private int duplicateProductIds;
        private int unknownCategoryReferences;
        private int orderedArrays;
        private int invalidArrays;
        private int emptyArrays;
        private int references;
        private int resolvedReferences;
        private int malformedReferences;

        private Long acceptCategory(JsonNode product, Map<Long, CategoryInfo> categories) {
            Long categoryId = positiveLongOf(product, "category_id");
            if (categoryId == null) {
                unknownCategoryReferences++;
                return null;
            }

            categoryProducts.merge(categoryId, 1L, Long::sum);
            if (!categories.containsKey(categoryId)) {
                unknownCategoryReferences++;
                return null;
            }
            return categoryId;
        }

        private Ingredients acceptIngredients(
                JsonNode product,
                Long productId,
                int productIndex,
                Map<Long, IngredientInfo> ingredients) {
            JsonNode ingredientList = product.get("ingredients");
            if (ingredientList == null || !ingredientList.isArray()) {
                invalidArrays++;
                return null;
            }

            orderedArrays++;
            ingredientCounts.add(ingredientList.size());
            if (ingredientList.size() == 0) {
                emptyArrays++;
            }

            Map<Long, Integer> firstPositions = new HashMap<>();
            List<Ingredient> inferenceIngredients = new ArrayList<>();
            boolean inferable = true;
            int position = 0;
            for (JsonNode reference : ingredientList) {
                position++;
                references++;
                if (!reference.isObject()) {
                    malformedReferences++;
                    inferable = false;
                    continue;
                }

                disclosedAmounts.accept(reference, productIndex);
                Long ingredientId = positiveLongOf(reference, "ingredient_id");
                if (ingredientId == null) {
                    malformedReferences++;
                    inferable = false;
                    continue;
                }

                referencedIngredientIds.add(ingredientId);
                ingredientFrequencies
                        .computeIfAbsent(ingredientId, key -> new FrequencyInspection())
                        .accept(productIndex);

                IngredientInfo ingredient = ingredients.get(ingredientId);
                if (ingredient == null) {
                    unresolvedIngredientIds.add(ingredientId);
                    inferable = false;
                } else {
                    resolvedReferences++;
                    inferenceIngredients.add(ingredient.toDomain(ingredientId));
                }

                Integer firstPosition = firstPositions.putIfAbsent(ingredientId, position);
                if (firstPosition != null) {
                    duplicateReferences.add(
                            new DuplicateIngredientReference(
                                    productId,
                                    textOf(product, "product_name"),
                                    ingredientId,
                                    ingredient == null ? "" : ingredient.name,
                                    firstPosition,
                                    position));
                }
            }
            return inferable ? new Ingredients(inferenceIngredients) : null;
        }

        private void acceptInference(
                Long categoryId,
                Ingredients ingredients,
                Map<Long, CategoryInfo> categories,
                ProductSensoryEstimator sensoryEstimator) {
            if (categoryId == null || ingredients == null) {
                inference.skip();
                return;
            }

            CategoryInfo category = categories.get(categoryId);
            ProductSensory sensory = sensoryEstimator.estimate(category.toDomain(categoryId), ingredients);
            inference.accept(
                    categoryId,
                    categoryPathOf(categoryId, categories, new HashSet<>()),
                    sensory);
        }

        private List<CategoryCount> categoryCounts(Map<Long, CategoryInfo> categories) {
            return categoryProducts.entrySet().stream()
                    .map(entry -> categoryCountOf(entry.getKey(), entry.getValue(), categories))
                    .toList();
        }

        private static CategoryCount categoryCountOf(
                Long categoryId,
                long products,
                Map<Long, CategoryInfo> categories) {
            CategoryInfo category = categories.get(categoryId);
            if (category == null) {
                return new CategoryCount(categoryId, null, "<unknown>", products);
            }

            return new CategoryCount(
                    categoryId,
                    category.parentId,
                    categoryPathOf(categoryId, categories, new HashSet<>()),
                    products);
        }

        private static String categoryPathOf(
                Long categoryId,
                Map<Long, CategoryInfo> categories,
                Set<Long> visited) {
            CategoryInfo category = categories.get(categoryId);
            if (category == null) {
                return "<unknown>/" + categoryId;
            }
            if (!visited.add(categoryId)) {
                return "<cycle>/" + category.name;
            }
            if (category.parentId == null) {
                return category.name;
            }
            return categoryPathOf(category.parentId, categories, visited) + "/" + category.name;
        }

        private IngredientListQuality ingredientListQuality(Map<Long, IngredientInfo> ingredients) {
            List<DuplicateIngredientReference> sortedDuplicates = duplicateReferences.stream()
                    .sorted(
                            Comparator.comparing(
                                    DuplicateIngredientReference::productId,
                                    Comparator.nullsLast(Comparator.naturalOrder()))
                                    .thenComparing(DuplicateIngredientReference::duplicatePosition))
                    .toList();

            return new IngredientListQuality(
                    orderedArrays,
                    invalidArrays,
                    emptyArrays,
                    references,
                    resolvedReferences,
                    unresolvedReferenceCount(),
                    malformedReferences,
                    duplicateReferences.size(),
                    List.copyOf(unresolvedIngredientIds),
                    sortedDuplicates);
        }

        private RoleCoverage roleCoverage(Map<Long, IngredientInfo> ingredients) {
            int recognizedUnique = 0;
            int sensoryUnique = 0;
            int recognizedOccurrences = 0;
            int sensoryOccurrences = 0;
            int validOccurrences = ingredientFrequencies.values().stream()
                    .mapToInt(value -> value.occurrences)
                    .sum();

            for (Long ingredientId : referencedIngredientIds) {
                IngredientInfo ingredient = ingredients.get(ingredientId);
                if (ingredient == null) {
                    continue;
                }

                FrequencyInspection frequency = ingredientFrequencies.get(ingredientId);
                if (!ingredient.formulationRoles.isEmpty()) {
                    recognizedUnique++;
                    recognizedOccurrences += frequency.occurrences;
                }
                if (!ingredient.sensoryRoles.isEmpty()) {
                    sensoryUnique++;
                    sensoryOccurrences += frequency.occurrences;
                }
            }

            return new RoleCoverage(
                    new Coverage(
                            recognizedUnique,
                            referencedIngredientIds.size(),
                            recognizedOccurrences,
                            validOccurrences),
                    new Coverage(
                            sensoryUnique,
                            referencedIngredientIds.size(),
                            sensoryOccurrences,
                            validOccurrences));
        }

        private List<RoleUsage> roleUsage(Map<Long, IngredientInfo> ingredients) {
            return List.of(FormulationRole.values()).stream()
                    .sorted(Comparator.comparing(Enum::name))
                    .map(role -> usageOf(role, ingredients))
                    .toList();
        }

        private RoleUsage usageOf(FormulationRole role, Map<Long, IngredientInfo> ingredients) {
            Set<Long> usedIngredients = new HashSet<>();
            Set<Integer> products = new HashSet<>();
            int occurrences = 0;

            for (Map.Entry<Long, FrequencyInspection> entry : ingredientFrequencies.entrySet()) {
                IngredientInfo ingredient = ingredients.get(entry.getKey());
                if (ingredient == null || !ingredient.formulationRoles.contains(role.name())) {
                    continue;
                }

                usedIngredients.add(entry.getKey());
                products.addAll(entry.getValue().productIndexes);
                occurrences += entry.getValue().occurrences;
            }

            return new RoleUsage(
                    role.name(),
                    SENSORY_SCREENING_ROLES.contains(role.name()),
                    usedIngredients.size(),
                    products.size(),
                    occurrences);
        }

        private List<IngredientFrequency> frequencies(
                Map<Long, IngredientInfo> ingredients,
                FrequencySelection selection) {
            return ingredientFrequencies.entrySet().stream()
                    .filter(entry -> includes(selection, ingredients.get(entry.getKey())))
                    .sorted(
                            Map.Entry.<Long, FrequencyInspection>comparingByValue(
                                    Comparator.comparingInt(
                                            (FrequencyInspection value) -> value.productIndexes.size())
                                            .reversed()
                                            .thenComparing(
                                                    Comparator.comparingInt(
                                                            (FrequencyInspection value) -> value.occurrences)
                                                            .reversed()))
                                    .thenComparing(Map.Entry.comparingByKey()))
                    .limit(FREQUENCY_LIMIT)
                    .map(entry -> frequencyOf(entry.getKey(), entry.getValue(), ingredients.get(entry.getKey())))
                    .toList();
        }

        private int unresolvedReferenceCount() {
            return ingredientFrequencies.entrySet().stream()
                    .filter(entry -> unresolvedIngredientIds.contains(entry.getKey()))
                    .mapToInt(entry -> entry.getValue().occurrences)
                    .sum();
        }

        private static IngredientFrequency frequencyOf(
                Long ingredientId,
                FrequencyInspection frequency,
                IngredientInfo ingredient) {
            String name = ingredient == null ? "<unresolved>" : ingredient.name;
            List<String> formulationRoles = ingredient == null
                    ? List.of()
                    : ingredient.formulationRoles.stream().sorted().toList();
            List<String> sensoryRoles = ingredient == null
                    ? List.of()
                    : ingredient.sensoryRoles.stream().sorted().toList();

            return new IngredientFrequency(
                    ingredientId,
                    name,
                    frequency.productIndexes.size(),
                    frequency.occurrences,
                    formulationRoles,
                    sensoryRoles);
        }
    }

    private static boolean includes(FrequencySelection selection, IngredientInfo ingredient) {
        return switch (selection) {
            case ALL -> true;
            case SENSORY_ROLE -> ingredient != null && !ingredient.sensoryRoles.isEmpty();
            case WITHOUT_SENSORY_ROLE -> ingredient == null || ingredient.sensoryRoles.isEmpty();
        };
    }
}
