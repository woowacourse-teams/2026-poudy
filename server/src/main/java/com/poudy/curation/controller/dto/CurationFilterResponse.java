package com.poudy.curation.controller.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CurationFilterResponse(@NotNull UUID id, @NotNull String label) {
}
