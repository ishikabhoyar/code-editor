package com.realtimeeditor.dto;

import jakarta.validation.constraints.NotBlank;

public record SessionActionRequest(
        @NotBlank String collaboratorName
) {
}
