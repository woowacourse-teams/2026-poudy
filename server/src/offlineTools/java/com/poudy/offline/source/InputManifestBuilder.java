package com.poudy.offline.source;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class InputManifestBuilder {

    private final Map<InputManifestEntry.InputReference, InputManifestEntry> entries = new HashMap<>();

    private boolean built;

    public InputManifestBuilder addStableInput(StableId stableId, byte[] content) {
        return addBytes(
                new InputManifestEntry.InputReference.StableIdentifier(stableId),
                content);
    }

    public InputManifestBuilder addLogicalFileInput(String logicalFileName, byte[] content) {
        return addBytes(
                new InputManifestEntry.InputReference.LogicalFileName(logicalFileName),
                content);
    }

    public InputManifest build() {
        ensureNotBuilt();
        InputManifest manifest = new InputManifest(List.copyOf(entries.values()));
        built = true;
        return manifest;
    }

    private InputManifestBuilder addBytes(
            InputManifestEntry.InputReference inputReference,
            byte[] content) {
        ensureNotBuilt();
        if (content == null) {
            throw new IllegalArgumentException("manifest 입력 byte가 필요합니다.");
        }

        InputManifestEntry entry = new InputManifestEntry(
                inputReference,
                content.length,
                ContentSha256.digest(content));
        return addEntry(entry);
    }

    private InputManifestBuilder addEntry(InputManifestEntry entry) {
        InputManifestEntry existing = entries.putIfAbsent(entry.inputReference(), entry);
        if (existing == null) {
            return this;
        }
        if (existing.equals(entry)) {
            throw new IllegalArgumentException("같은 manifest 입력을 두 번 추가할 수 없습니다.");
        }
        throw new IllegalArgumentException("같은 manifest 입력 식별자에 서로 다른 byte가 있습니다.");
    }

    private void ensureNotBuilt() {
        if (built) {
            throw new IllegalStateException("완성된 manifest builder는 다시 사용할 수 없습니다.");
        }
    }
}
