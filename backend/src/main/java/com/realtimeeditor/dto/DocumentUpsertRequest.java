package com.realtimeeditor.dto;

import jakarta.validation.constraints.NotBlank;

public record DocumentUpsertRequest(
        @NotBlank String title,
        @NotBlank String language,
        @NotBlank String content
) {
}
