package com.realtimeeditor.dto;

import jakarta.validation.constraints.NotBlank;

public record ExecutionRequest(
        @NotBlank String language,
        @NotBlank String code,
        Integer timeoutSeconds
) {
}
