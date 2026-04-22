package com.realtimeeditor.dto;

public record TokenValidationResponse(
        boolean valid,
        String email,
        String name
) {
}
