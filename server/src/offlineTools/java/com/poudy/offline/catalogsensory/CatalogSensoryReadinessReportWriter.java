package com.poudy.offline.catalogsensory;

import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.CategoryCount;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.CategoryInference;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.ConfidenceDistribution;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.Coverage;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.DuplicateIngredientReference;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.InferenceSummary;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.IngredientFrequency;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.InputFile;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.LevelDistribution;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.LevelPairCount;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.LevelStatus;
import com.poudy.offline.catalogsensory.CatalogSensoryReadinessReport.RoleUsage;
import com.poudy.product.domain.sensory.SensoryModelVersion;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

public final class CatalogSensoryReadinessReportWriter {

    public static final String JSON_FILE_NAME = "catalog-sensory-readiness-report.json";
    public static final String MARKDOWN_FILE_NAME = "catalog-sensory-readiness-report.md";

    private static final ObjectMapper MAPPER = JsonMapper.builder().build();

    public void write(CatalogSensoryReadinessReport report, Path outputDirectory)
            throws IOException,
            JacksonException {
        String json = renderJson(report);
        String markdown = renderMarkdown(report);
        Files.createDirectories(outputDirectory);

        Path jsonTarget = outputDirectory.resolve(JSON_FILE_NAME);
        Path markdownTarget = outputDirectory.resolve(MARKDOWN_FILE_NAME);
        replacePair(
                jsonTarget,
                json.getBytes(StandardCharsets.UTF_8),
                markdownTarget,
                markdown.getBytes(StandardCharsets.UTF_8));
    }

    public String renderJson(CatalogSensoryReadinessReport report) throws JacksonException {
        return normalizeNewlines(MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(report)) + "\n";
    }

    public String renderMarkdown(CatalogSensoryReadinessReport report) {
        StringBuilder markdown = new StringBuilder();
        markdown.append("# Catalog sensory readiness report\n\n");
        markdown.append("Schema: `").append(report.schemaVersion()).append("`\n\n");
        markdown.append("Tool: `").append(report.toolVersion()).append("`\n\n");
        markdown.append("이 보고서는 입력 파일명과 내용 해시만 기록하며 실행 시각과 절대 경로를 기록하지 않는다. ")
                .append("같은 스키마·도구 버전과 같은 입력이면 같은 결과를 생성한다. ")
                .append("계산 규칙이 바뀌면 도구 버전을 올린다.\n\n");

        appendInputs(markdown, report.inputs());
        appendCatalog(markdown, report);
        appendCategories(markdown, report.categories());
        appendLevels(markdown, report);
        appendInference(markdown, report.inference());
        appendIngredientQuality(markdown, report);
        appendRoleCoverage(markdown, report);
        appendRoleUsage(markdown, report.roleUsage());
        appendDisclosedAmounts(markdown, report);
        appendSourceFields(markdown, report);
        appendFrequencies(markdown, "상위 빈출 성분", report.topFrequentIngredients());
        appendFrequencies(markdown, "감각 역할 기반 선별 후보", report.sensoryRoleCandidates());
        appendFrequencies(markdown, "감각 역할이 없는 상위 빈출 성분", report.frequentWithoutSensoryRole());

        return markdown.toString().stripTrailing() + "\n";
    }

    private static void appendInputs(StringBuilder markdown, List<InputFile> inputs) {
        markdown.append("## Inputs\n\n");
        markdown.append("| File | Bytes | SHA-256 |\n");
        markdown.append("| --- | ---: | --- |\n");
        for (InputFile input : inputs) {
            markdown.append("| ").append(escape(input.name()))
                    .append(" | ").append(input.bytes())
                    .append(" | `").append(input.sha256()).append("` |\n");
        }
        markdown.append('\n');
    }

    private static void appendCatalog(StringBuilder markdown, CatalogSensoryReadinessReport report) {
        CatalogSensoryReadinessReport.CatalogSummary catalog = report.catalog();
        markdown.append("## Catalog\n\n");
        markdown.append("- Products: ").append(catalog.products()).append('\n');
        markdown.append("- Ingredients: ").append(catalog.ingredients()).append('\n');
        markdown.append("- Categories: ").append(catalog.categories()).append('\n');
        markdown.append("- Referenced unique ingredients: ")
                .append(catalog.referencedUniqueIngredients()).append('\n');
        markdown.append("- Malformed records (product/ingredient/category): ")
                .append(catalog.malformedProducts()).append(" / ")
                .append(catalog.malformedIngredients()).append(" / ")
                .append(catalog.malformedCategories()).append('\n');
        markdown.append("- Duplicate IDs (product/ingredient/category): ")
                .append(catalog.duplicateProductIds()).append(" / ")
                .append(catalog.duplicateIngredientIds()).append(" / ")
                .append(catalog.duplicateCategoryIds()).append('\n');
        markdown.append("- Unknown category references: ")
                .append(catalog.unknownCategoryReferences()).append('\n');
        markdown.append("- Malformed tag mappings: ")
                .append(catalog.malformedTagMappings()).append('\n');
        markdown.append("- Unrecognized formulation roles: ")
                .append(catalog.unrecognizedFormulationRoles()).append("\n\n");
    }

    private static void appendCategories(StringBuilder markdown, List<CategoryCount> categories) {
        markdown.append("## Category distribution\n\n");
        markdown.append("| ID | Parent ID | Path | Products |\n");
        markdown.append("| ---: | ---: | --- | ---: |\n");
        for (CategoryCount category : categories) {
            markdown.append("| ").append(category.id())
                    .append(" | ").append(category.parentId() == null ? "-" : category.parentId())
                    .append(" | ").append(escape(category.path()))
                    .append(" | ").append(category.products()).append(" |\n");
        }
        markdown.append('\n');
    }

    private static void appendLevels(StringBuilder markdown, CatalogSensoryReadinessReport report) {
        markdown.append("## Existing sensory fields\n\n");
        markdown.append("| Field | Absent | Explicit null | Valid 0-3 | Invalid |\n");
        markdown.append("| --- | ---: | ---: | ---: | ---: |\n");
        appendLevel(markdown, "moisture_level", report.levels().moistureLevel());
        appendLevel(markdown, "oil_level", report.levels().oilLevel());
        markdown.append('\n');
    }

    private static void appendLevel(StringBuilder markdown, String field, LevelStatus status) {
        markdown.append("| `").append(field).append("` | ")
                .append(status.absent()).append(" | ")
                .append(status.explicitNull()).append(" | ")
                .append(status.valid()).append(" | ")
                .append(status.invalid()).append(" |\n");
    }

    private static void appendInference(StringBuilder markdown, InferenceSummary inference) {
        SensoryModelVersion version = inference.modelVersion();
        markdown.append("## v0 inferred sensory distribution\n\n");
        markdown.append("수동 레벨을 읽지 않고 runtime과 같은 estimator로 계산한 baseline이다. ")
                .append("관능 정답이나 임상 효능이 아니며, 해석과 보완 기준은 ")
                .append("[감각 추론 v0 기준과 한계](sensory-inference-v0.md)에 있다. ")
                .append("초기 leave-on 범위 밖 category는 낮은 confidence의 탐색 결과일 뿐 ")
                .append("검증 표본으로 세지 않는다.\n\n");
        markdown.append("- Candidate products: ").append(inference.candidateProducts()).append('\n');
        markdown.append("- Inferred products: ").append(inference.inferredProducts()).append('\n');
        markdown.append("- Skipped products: ").append(inference.skippedProducts()).append('\n');
        markdown.append("- Ingredient profile version: `")
                .append(version.ingredientProfileVersion()).append("`\n");
        markdown.append("- Category prior version: `")
                .append(version.categoryPriorVersion()).append("`\n");
        markdown.append("- Level model version: `")
                .append(version.levelModelVersion()).append("`\n");
        markdown.append("- Assessment protocol version: `")
                .append(version.assessmentProtocolVersion()).append("`\n");
        markdown.append("- Data builder version: `")
                .append(version.dataBuilderVersion()).append("`\n\n");

        markdown.append("### Overall levels\n\n");
        markdown.append("| Axis | Level 0 | Level 1 | Level 2 | Level 3 |\n");
        markdown.append("| --- | ---: | ---: | ---: | ---: |\n");
        appendLevelDistribution(markdown, "Moisture", inference.moistureLevels());
        appendLevelDistribution(markdown, "Oil", inference.oilLevels());
        markdown.append('\n');

        markdown.append("### Level pairs\n\n");
        markdown.append("| Moisture | Oil | Products |\n");
        markdown.append("| ---: | ---: | ---: |\n");
        for (LevelPairCount pair : inference.levelPairs()) {
            markdown.append("| ").append(pair.moistureLevel())
                    .append(" | ").append(pair.oilLevel())
                    .append(" | ").append(pair.products()).append(" |\n");
        }
        markdown.append('\n');

        ConfidenceDistribution confidence = inference.confidence();
        markdown.append("### Confidence\n\n");
        markdown.append("내부 confidence는 실제 정답 확률로 보정되지 않은 상대적 근거 부족 신호다.\n\n");
        markdown.append("| Minimum | P25 | Median | P75 | Maximum | Mean |\n");
        markdown.append("| ---: | ---: | ---: | ---: | ---: | ---: |\n");
        markdown.append("| ").append(confidence.minimum())
                .append(" | ").append(confidence.percentile25())
                .append(" | ").append(confidence.median())
                .append(" | ").append(confidence.percentile75())
                .append(" | ").append(confidence.maximum())
                .append(" | ").append(confidence.mean()).append(" |\n\n");

        markdown.append("### Category inference\n\n");
        markdown.append("| ID | Path | Products | Moisture 0/1/2/3 | Oil 0/1/2/3 | Mean confidence |\n");
        markdown.append("| ---: | --- | ---: | --- | --- | ---: |\n");
        for (CategoryInference category : inference.categories()) {
            markdown.append("| ").append(category.id())
                    .append(" | ").append(escape(category.path()))
                    .append(" | ").append(category.products())
                    .append(" | ").append(levels(category.moistureLevels()))
                    .append(" | ").append(levels(category.oilLevels()))
                    .append(" | ").append(category.meanConfidence()).append(" |\n");
        }
        markdown.append('\n');
    }

    private static void appendLevelDistribution(
            StringBuilder markdown,
            String name,
            LevelDistribution levels) {
        markdown.append("| ").append(name)
                .append(" | ").append(levels.level0())
                .append(" | ").append(levels.level1())
                .append(" | ").append(levels.level2())
                .append(" | ").append(levels.level3()).append(" |\n");
    }

    private static String levels(LevelDistribution levels) {
        return "%d/%d/%d/%d".formatted(
                levels.level0(),
                levels.level1(),
                levels.level2(),
                levels.level3());
    }

    private static void appendIngredientQuality(
            StringBuilder markdown,
            CatalogSensoryReadinessReport report) {
        CatalogSensoryReadinessReport.IngredientListQuality quality = report.ingredientLists();
        CatalogSensoryReadinessReport.IngredientCountDistribution distribution = report.ingredientCountDistribution();

        markdown.append("## Ingredient list quality\n\n");
        markdown.append("제품의 `ingredients` 배열 순서가 구조적으로 보존되는지만 확인했다. ")
                .append("source URL 존재 여부만 집계하고 외부 원문을 대조하지 않으므로 ")
                .append("공식 전성분의 순서와 완전성은 검증하지 않았다.\n\n");
        markdown.append("- Ordered arrays: ").append(quality.orderedArrays()).append('\n');
        markdown.append("- Missing or invalid arrays: ").append(quality.missingOrInvalidArrays()).append('\n');
        markdown.append("- Empty arrays: ").append(quality.emptyArrays()).append('\n');
        markdown.append("- References (resolved/unresolved/malformed): ")
                .append(quality.references()).append(" (")
                .append(quality.resolvedReferences()).append(" / ")
                .append(quality.unresolvedReferences()).append(" / ")
                .append(quality.malformedReferences()).append(")\n");
        markdown.append("- Duplicate references: ").append(quality.duplicateReferences()).append('\n');
        markdown.append("- Ingredient counts (samples/min/p25/median/p75/p90/max/mean): ")
                .append(distribution.samples()).append(" / ")
                .append(distribution.minimum()).append(" / ")
                .append(distribution.percentile25()).append(" / ")
                .append(distribution.median()).append(" / ")
                .append(distribution.percentile75()).append(" / ")
                .append(distribution.percentile90()).append(" / ")
                .append(distribution.maximum()).append(" / ")
                .append(distribution.mean()).append("\n\n");

        if (!quality.unresolvedIngredientIds().isEmpty()) {
            markdown.append("Unresolved ingredient IDs: ")
                    .append(joinNumbers(quality.unresolvedIngredientIds())).append("\n\n");
        }
        appendDuplicates(markdown, quality.duplicates());
    }

    private static void appendDuplicates(
            StringBuilder markdown,
            List<DuplicateIngredientReference> duplicates) {
        if (duplicates.isEmpty()) {
            return;
        }

        markdown.append("### Duplicate ingredient references\n\n");
        markdown.append("| Product ID | Product | Ingredient ID | Ingredient | Positions |\n");
        markdown.append("| ---: | --- | ---: | --- | --- |\n");
        for (DuplicateIngredientReference duplicate : duplicates) {
            markdown.append("| ").append(duplicate.productId() == null ? "-" : duplicate.productId())
                    .append(" | ").append(escape(duplicate.productName()))
                    .append(" | ").append(duplicate.ingredientId())
                    .append(" | ").append(escape(duplicate.ingredientName()))
                    .append(" | ").append(duplicate.firstPosition())
                    .append(", ").append(duplicate.duplicatePosition()).append(" |\n");
        }
        markdown.append('\n');
    }

    private static void appendRoleCoverage(StringBuilder markdown, CatalogSensoryReadinessReport report) {
        markdown.append("## Formulation role coverage\n\n");
        markdown.append("감각 역할은 프로필이나 실제 영향 판정이 아니라 1차 선별 신호다.\n\n");
        markdown.append("| Coverage | Unique ingredients | Occurrences |\n");
        markdown.append("| --- | ---: | ---: |\n");
        appendCoverage(markdown, "Recognized formulation role", report.roleCoverage().recognizedFormulationRole());
        appendCoverage(markdown, "Sensory screening role", report.roleCoverage().sensoryScreeningRole());
        markdown.append('\n');
    }

    private static void appendCoverage(StringBuilder markdown, String name, Coverage coverage) {
        markdown.append("| ").append(name).append(" | ")
                .append(coverage.coveredUniqueIngredients()).append(" / ")
                .append(coverage.referencedUniqueIngredients()).append(" (")
                .append(percent(coverage.coveredUniqueIngredients(), coverage.referencedUniqueIngredients()))
                .append(") | ")
                .append(coverage.coveredOccurrences()).append(" / ")
                .append(coverage.validIngredientOccurrences()).append(" (")
                .append(percent(coverage.coveredOccurrences(), coverage.validIngredientOccurrences()))
                .append(") |\n");
    }

    private static void appendRoleUsage(StringBuilder markdown, List<RoleUsage> roleUsage) {
        markdown.append("### Role usage\n\n");
        markdown.append("| Role | Sensory screening | Unique ingredients | Products | Occurrences |\n");
        markdown.append("| --- | --- | ---: | ---: | ---: |\n");
        for (RoleUsage usage : roleUsage) {
            markdown.append("| `").append(usage.role()).append("` | ")
                    .append(usage.sensoryScreeningRole()).append(" | ")
                    .append(usage.referencedUniqueIngredients()).append(" | ")
                    .append(usage.products()).append(" | ")
                    .append(usage.occurrences()).append(" |\n");
        }
        markdown.append('\n');
    }

    private static void appendDisclosedAmounts(StringBuilder markdown, CatalogSensoryReadinessReport report) {
        CatalogSensoryReadinessReport.DisclosedAmountSummary amounts = report.disclosedAmounts();
        markdown.append("## Disclosed amounts\n\n");
        markdown.append("- Products: ").append(amounts.products()).append('\n');
        markdown.append("- References: ").append(amounts.references()).append('\n');
        markdown.append("- Malformed: ").append(amounts.malformed()).append('\n');
        markdown.append("- Types: ").append(joinMap(amounts.types())).append('\n');
        markdown.append("- Units: ").append(joinMap(amounts.units())).append("\n\n");
    }

    private static void appendSourceFields(StringBuilder markdown, CatalogSensoryReadinessReport report) {
        CatalogSensoryReadinessReport.SourceFieldPresence fields = report.sourceFields();
        markdown.append("## Source and formulation fields\n\n");
        markdown.append("- `application_type`: ").append(fields.applicationTypeProducts()).append(" products\n");
        markdown.append("- `usage_variant`: ").append(fields.usageVariantProducts()).append(" products\n");
        markdown.append("- `formula_archetype`: ").append(fields.formulaArchetypeProducts()).append(" products\n");
        markdown.append("- `source_url`: ").append(fields.sourceUrlProducts()).append(" products\n");
        markdown.append("- Official ingredient order verified: ")
                .append(fields.officialIngredientOrderVerified()).append("\n\n");
    }

    private static void appendFrequencies(
            StringBuilder markdown,
            String title,
            List<IngredientFrequency> frequencies) {
        markdown.append("## ").append(title).append("\n\n");
        markdown.append("| Ingredient ID | Ingredient | Products | Occurrences | Roles | Sensory roles |\n");
        markdown.append("| ---: | --- | ---: | ---: | --- | --- |\n");
        for (IngredientFrequency frequency : frequencies) {
            markdown.append("| ").append(frequency.ingredientId())
                    .append(" | ").append(escape(frequency.ingredientName()))
                    .append(" | ").append(frequency.products())
                    .append(" | ").append(frequency.occurrences())
                    .append(" | ").append(escape(String.join(", ", frequency.formulationRoles())))
                    .append(" | ").append(escape(String.join(", ", frequency.sensoryScreeningRoles())))
                    .append(" |\n");
        }
        markdown.append('\n');
    }

    private static void replacePair(
            Path firstTarget,
            byte[] firstContent,
            Path secondTarget,
            byte[] secondContent)
            throws IOException {
        PreviousFile firstPrevious = PreviousFile.capture(firstTarget);
        PreviousFile secondPrevious = PreviousFile.capture(secondTarget);
        Path firstTemporary = Files.createTempFile(firstTarget.getParent(), "catalog-json-", ".tmp");
        Path secondTemporary = Files.createTempFile(secondTarget.getParent(), "catalog-md-", ".tmp");
        boolean firstMoved = false;
        boolean secondMoved = false;

        try {
            Files.write(firstTemporary, firstContent);
            Files.write(secondTemporary, secondContent);
            moveReplacing(firstTemporary, firstTarget);
            firstMoved = true;
            moveReplacing(secondTemporary, secondTarget);
            secondMoved = true;
        } catch (IOException failure) {
            IOException rollbackFailure = rollback(
                    firstTarget,
                    firstPrevious,
                    firstMoved,
                    secondTarget,
                    secondPrevious,
                    secondMoved);
            if (rollbackFailure != null) {
                failure.addSuppressed(rollbackFailure);
            }
            throw failure;
        } finally {
            Files.deleteIfExists(firstTemporary);
            Files.deleteIfExists(secondTemporary);
        }
    }

    private static IOException rollback(
            Path firstTarget,
            PreviousFile firstPrevious,
            boolean firstMoved,
            Path secondTarget,
            PreviousFile secondPrevious,
            boolean secondMoved) {
        IOException failure = null;
        try {
            if (firstMoved) {
                firstPrevious.restore(firstTarget);
            }
        } catch (IOException exception) {
            failure = exception;
        }
        try {
            if (secondMoved) {
                secondPrevious.restore(secondTarget);
            }
        } catch (IOException exception) {
            if (failure == null) {
                failure = exception;
            } else {
                failure.addSuppressed(exception);
            }
        }
        return failure;
    }

    private static void moveReplacing(Path source, Path target) throws IOException {
        try {
            Files.move(
                    source,
                    target,
                    StandardCopyOption.ATOMIC_MOVE,
                    StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException exception) {
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private static String percent(int numerator, int denominator) {
        if (denominator == 0) {
            return "0.00%";
        }
        return BigDecimal.valueOf(numerator)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP)
                .toPlainString() + "%";
    }

    private static String joinMap(Map<String, Integer> values) {
        if (values.isEmpty()) {
            return "-";
        }
        StringJoiner joiner = new StringJoiner(", ");
        values.forEach((key, value) -> joiner.add(key + "=" + value));
        return joiner.toString();
    }

    private static String joinNumbers(List<Long> values) {
        StringJoiner joiner = new StringJoiner(", ");
        values.forEach(value -> joiner.add(value.toString()));
        return joiner.toString();
    }

    private static String escape(String value) {
        return value.replace("\\", "\\\\")
                .replace("|", "\\|")
                .replace("\r", " ")
                .replace("\n", " ");
    }

    private static String normalizeNewlines(String value) {
        return value.replace("\r\n", "\n").replace('\r', '\n');
    }

    private record PreviousFile(boolean existed, byte[] content) {

        private static PreviousFile capture(Path target) throws IOException {
            if (!Files.exists(target)) {
                return new PreviousFile(false, new byte[0]);
            }
            return new PreviousFile(true, Files.readAllBytes(target));
        }

        private void restore(Path target) throws IOException {
            if (!existed) {
                Files.deleteIfExists(target);
                return;
            }

            Path temporary = Files.createTempFile(target.getParent(), "catalog-restore-", ".tmp");
            try {
                Files.write(temporary, content);
                moveReplacing(temporary, target);
            } finally {
                Files.deleteIfExists(temporary);
            }
        }
    }
}
