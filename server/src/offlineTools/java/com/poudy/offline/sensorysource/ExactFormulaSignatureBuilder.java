package com.poudy.offline.sensorysource;

import com.poudy.offline.source.ValidationStatus;
import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public final class ExactFormulaSignatureBuilder {

    public static final String VERSION = "formula-deduplication-v1";

    private static final byte[] HASH_DOMAIN = "poudy-exact-formula-signature-v1"
            .getBytes(StandardCharsets.UTF_8);

    private ExactFormulaSignatureBuilder() {
    }

    public static ExactFormulaSignature build(List<RawMaterialInput> orderedRawMaterialInputs) {
        FormulaMassBalanceAssessment massBalance = FormulaMassBalanceAssessment.assess(
                orderedRawMaterialInputs);
        if (massBalance.validationStatus() != ValidationStatus.ACCEPTED) {
            throw new IllegalArgumentException("exact formula signature에는 합계가 정확히 100인 처방이 필요합니다.");
        }

        List<NormalizedRawMaterial> normalizedInputs = normalize(orderedRawMaterialInputs);
        MessageDigest digest = sha256Digest();
        digest.update(HASH_DOMAIN);
        digest.update(intBytes(normalizedInputs.size()));
        normalizedInputs.forEach(input -> updateDigest(digest, input));
        return new ExactFormulaSignature(
                VERSION,
                new ExactFormulaSignatureSha256(HexFormat.of().formatHex(digest.digest())));
    }

    private static List<NormalizedRawMaterial> normalize(List<RawMaterialInput> inputs) {
        Map<String, NormalizedRawMaterial> inputsById = new TreeMap<>();
        for (RawMaterialInput input : inputs) {
            if (input.formulaAmount().value().compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }

            String rawMaterialId = input.rawMaterialId().value();
            NormalizedComposition composition = normalize(input.composition());
            NormalizedRawMaterial existing = inputsById.get(rawMaterialId);
            if (existing == null) {
                inputsById.put(
                        rawMaterialId,
                        new NormalizedRawMaterial(
                                rawMaterialId,
                                input.formulaAmount().value(),
                                composition));
                continue;
            }
            if (!existing.composition().equals(composition)) {
                throw new IllegalArgumentException("같은 canonical raw material ID에 서로 다른 composition이 있습니다.");
            }
            inputsById.put(
                    rawMaterialId,
                    new NormalizedRawMaterial(
                            rawMaterialId,
                            canonical(existing.amount().add(input.formulaAmount().value())),
                            composition));
        }
        if (inputsById.isEmpty()) {
            throw new IllegalArgumentException("exact formula signature에는 양수 질량의 원료가 필요합니다.");
        }
        return List.copyOf(inputsById.values());
    }

    private static NormalizedComposition normalize(RawMaterialComposition composition) {
        return switch (composition) {
            case RawMaterialComposition.KnownComposition known -> normalizeKnown(known);
            case RawMaterialComposition.UnquantifiedComposition unquantified ->
                normalizeUnquantified(unquantified);
        };
    }

    private static NormalizedComposition normalizeKnown(
            RawMaterialComposition.KnownComposition composition) {
        List<NormalizedKnownComponent> components = composition.components().stream()
                .map(
                        component -> new NormalizedKnownComponent(
                                resolvedIngredientId(component.ingredientResolution()),
                                component.fraction().value()))
                .sorted(Comparator.comparingLong(NormalizedKnownComponent::ingredientId))
                .toList();
        rejectDuplicateIngredientIds(
                components.stream().map(NormalizedKnownComponent::ingredientId).toList());
        return new NormalizedKnownComposition(components);
    }

    private static NormalizedComposition normalizeUnquantified(
            RawMaterialComposition.UnquantifiedComposition composition) {
        List<Long> ingredientIds = composition.components().stream()
                .map(component -> resolvedIngredientId(component.ingredientResolution()))
                .sorted()
                .toList();
        rejectDuplicateIngredientIds(ingredientIds);
        return new NormalizedUnquantifiedComposition(ingredientIds);
    }

    private static long resolvedIngredientId(IngredientResolution resolution) {
        if (resolution instanceof IngredientResolution.Resolved resolved) {
            return resolved.canonicalIngredientId();
        }
        throw new IllegalArgumentException("exact formula signature에는 해석 완료된 canonical 성분 ID가 필요합니다.");
    }

    private static void rejectDuplicateIngredientIds(List<Long> ingredientIds) {
        Long previous = null;
        for (Long ingredientId : ingredientIds) {
            if (ingredientId.equals(previous)) {
                throw new IllegalArgumentException("raw material composition에 canonical 성분 ID가 중복됩니다.");
            }
            previous = ingredientId;
        }
    }

    private static void updateDigest(MessageDigest digest, NormalizedRawMaterial input) {
        updateLengthPrefixed(digest, input.rawMaterialId());
        updateLengthPrefixed(digest, decimal(input.amount()));
        switch (input.composition()) {
            case NormalizedKnownComposition known -> {
                digest.update((byte) 1);
                digest.update(intBytes(known.components().size()));
                for (NormalizedKnownComponent component : known.components()) {
                    digest.update(longBytes(component.ingredientId()));
                    updateLengthPrefixed(digest, decimal(component.fraction()));
                }
            }
            case NormalizedUnquantifiedComposition unquantified -> {
                digest.update((byte) 2);
                digest.update(intBytes(unquantified.ingredientIds().size()));
                unquantified.ingredientIds().forEach(
                        ingredientId -> digest.update(longBytes(ingredientId)));
            }
        }
    }

    private static void updateLengthPrefixed(MessageDigest digest, String value) {
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        digest.update(intBytes(bytes.length));
        digest.update(bytes);
    }

    private static String decimal(BigDecimal value) {
        return canonical(value).toPlainString();
    }

    private static BigDecimal canonical(BigDecimal value) {
        BigDecimal stripped = value.stripTrailingZeros();
        return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
    }

    private static MessageDigest sha256Digest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("JVM에서 SHA-256을 사용할 수 없습니다.", exception);
        }
    }

    private static byte[] intBytes(int value) {
        return ByteBuffer.allocate(Integer.BYTES).putInt(value).array();
    }

    private static byte[] longBytes(long value) {
        return ByteBuffer.allocate(Long.BYTES).putLong(value).array();
    }

    private record NormalizedRawMaterial(
            String rawMaterialId,
            BigDecimal amount,
            NormalizedComposition composition) {
    }

    private sealed interface NormalizedComposition
            permits NormalizedKnownComposition, NormalizedUnquantifiedComposition {
    }

    private record NormalizedKnownComposition(List<NormalizedKnownComponent> components)
            implements
                NormalizedComposition {
    }

    private record NormalizedKnownComponent(long ingredientId, BigDecimal fraction) {
    }

    private record NormalizedUnquantifiedComposition(List<Long> ingredientIds)
            implements
                NormalizedComposition {
    }
}
