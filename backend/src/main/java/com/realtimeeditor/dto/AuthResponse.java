package com.realtimeeditor.dto;

public record AuthResponse(
        String token,
        String name,
        String email
) {
}
