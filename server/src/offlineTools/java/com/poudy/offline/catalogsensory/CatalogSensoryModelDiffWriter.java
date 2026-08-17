package com.poudy.offline.catalogsensory;

import com.poudy.offline.catalogsensory.CatalogSensoryModelDiff.AxisChanges;
import com.poudy.offline.catalogsensory.CatalogSensoryModelDiff.ConfidenceChanges;
import com.poudy.offline.catalogsensory.CatalogSensoryModelDiff.DeltaCount;
import com.poudy.offline.catalogsensory.CatalogSensoryModelDiff.ProductChange;
import com.poudy.product.domain.sensory.SensoryModelVersion;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

public final class CatalogSensoryModelDiffWriter {

    public static final String JSON_FILE_NAME = "catalog-sensory-model-diff.json";
    public static final String MARKDOWN_FILE_NAME = "catalog-sensory-model-diff.md";

    private static final ObjectMapper MAPPER = JsonMapper.builder().build();

    public void write(CatalogSensoryModelDiff report, Path outputDirectory)
            throws IOException,
            JacksonException {
        String json = renderJson(report);
        String markdown = renderMarkdown(report);
        Files.createDirectories(outputDirectory);
        AtomicReportPairWriter.write(
                outputDirectory.resolve(JSON_FILE_NAME),
                json.getBytes(StandardCharsets.UTF_8),
                outputDirectory.resolve(MARKDOWN_FILE_NAME),
                markdown.getBytes(StandardCharsets.UTF_8));
    }

    public String renderJson(CatalogSensoryModelDiff report) throws JacksonException {
        return normalizeNewlines(MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(report)) + "\n";
    }

    public String renderMarkdown(CatalogSensoryModelDiff report) {
        StringBuilder markdown = new StringBuilder();
        markdown.append("# Catalog sensory model diff\n\n");
        markdown.append("Schema: `").append(report.schemaVersion()).append("`\n\n");
        markdown.append("Tool: `").append(report.toolVersion()).append("`\n\n");
        markdown.append("동일한 catalog 내용 해시에서 모델만 바꿔 비교한 외부 검수 산출물이다. ")
                .append("원본, 제품명, 전성분은 포함하지 않으며 제품 ID는 검수 대상을 찾는 데만 사용한다.\n\n");
        appendInputs(markdown, report);
        appendVersions(markdown, report);
        appendAxis(markdown, "Moisture", report.moisture());
        appendAxis(markdown, "Oil", report.oil());
        appendConfidence(markdown, report.confidence());
        appendChanges(markdown, report.changedProducts());
        return markdown.toString().stripTrailing() + "\n";
    }

    private static void appendInputs(StringBuilder markdown, CatalogSensoryModelDiff report) {
        markdown.append("## Comparison\n\n");
        markdown.append("- Compared products: ").append(report.comparedProducts()).append('\n');
        markdown.append("- Changed products: ").append(report.changedProducts().size()).append("\n\n");
        markdown.append("| File | Bytes | SHA-256 |\n");
        markdown.append("| --- | ---: | --- |\n");
        report.inputs().forEach(
                input -> markdown.append("| ")
                        .append(escape(input.name()))
                        .append(" | ").append(input.bytes())
                        .append(" | `").append(input.sha256()).append("` |\n"));
        markdown.append('\n');
    }

    private static void appendVersions(StringBuilder markdown, CatalogSensoryModelDiff report) {
        markdown.append("## Model versions\n\n");
        markdown.append("| Component | Baseline | Candidate |\n");
        markdown.append("| --- | --- | --- |\n");
        SensoryModelVersion baseline = report.baselineModelVersion();
        SensoryModelVersion candidate = report.candidateModelVersion();
        appendVersion(
                markdown,
                "Ingredient profile",
                baseline.ingredientProfileVersion(),
                candidate.ingredientProfileVersion());
        appendVersion(markdown, "Category prior", baseline.categoryPriorVersion(), candidate.categoryPriorVersion());
        appendVersion(markdown, "Level model", baseline.levelModelVersion(), candidate.levelModelVersion());
        appendVersion(
                markdown,
                "Assessment protocol",
                baseline.assessmentProtocolVersion(),
                candidate.assessmentProtocolVersion());
        appendVersion(markdown, "Data builder", baseline.dataBuilderVersion(), candidate.dataBuilderVersion());
        markdown.append('\n');
    }

    private static void appendVersion(
            StringBuilder markdown,
            String component,
            String baseline,
            String candidate) {
        markdown.append("| ").append(component)
                .append(" | `").append(escape(baseline))
                .append("` | `").append(escape(candidate)).append("` |\n");
    }

    private static void appendAxis(StringBuilder markdown, String name, AxisChanges changes) {
        markdown.append("## ").append(name).append(" changes\n\n");
        markdown.append("- Unchanged: ").append(changes.unchanged()).append('\n');
        markdown.append("- Increased: ").append(changes.increased()).append('\n');
        markdown.append("- Decreased: ").append(changes.decreased()).append('\n');
        markdown.append("- Changed by at least two levels: ")
                .append(changes.changedByAtLeastTwo()).append("\n\n");
        markdown.append("| Delta | Products |\n");
        markdown.append("| ---: | ---: |\n");
        for (DeltaCount delta : changes.deltas()) {
            markdown.append("| ").append(signed(delta.delta()))
                    .append(" | ").append(delta.products()).append(" |\n");
        }
        markdown.append('\n');
    }

    private static void appendConfidence(StringBuilder markdown, ConfidenceChanges changes) {
        markdown.append("## Confidence changes\n\n");
        markdown.append("confidence는 아직 실제 정답 확률로 보정되지 않았으므로 변화량은 ")
                .append("근거 커버리지의 변화로만 해석한다.\n\n");
        markdown.append("- Unchanged: ").append(changes.unchanged()).append('\n');
        markdown.append("- Increased: ").append(changes.increased()).append('\n');
        markdown.append("- Decreased: ").append(changes.decreased()).append('\n');
        markdown.append("- Mean delta: ").append(changes.meanDelta()).append('\n');
        markdown.append("- Maximum absolute delta: ")
                .append(changes.maximumAbsoluteDelta()).append("\n\n");
    }

    private static void appendChanges(StringBuilder markdown, java.util.List<ProductChange> changes) {
        markdown.append("## Changed products\n\n");
        if (changes.isEmpty()) {
            markdown.append("변경된 제품이 없다.\n\n");
            return;
        }
        markdown.append("| Product ID | Category ID | Moisture | Oil | Confidence |\n");
        markdown.append("| ---: | ---: | --- | --- | --- |\n");
        for (ProductChange change : changes) {
            markdown.append("| ").append(change.productId())
                    .append(" | ").append(change.categoryId())
                    .append(" | ").append(change.moistureBefore()).append(" → ")
                    .append(change.moistureAfter()).append(" (")
                    .append(signed(change.moistureDelta())).append(')')
                    .append(" | ").append(change.oilBefore()).append(" → ")
                    .append(change.oilAfter()).append(" (")
                    .append(signed(change.oilDelta())).append(')')
                    .append(" | ").append(change.confidenceBefore()).append(" → ")
                    .append(change.confidenceAfter()).append(" (")
                    .append(signed(change.confidenceDelta().toPlainString())).append(") |\n");
        }
        markdown.append('\n');
    }

    private static String signed(int value) {
        return value > 0 ? "+" + value : Integer.toString(value);
    }

    private static String signed(String value) {
        return value.startsWith("-") || "0".equals(value) ? value : "+" + value;
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

}
