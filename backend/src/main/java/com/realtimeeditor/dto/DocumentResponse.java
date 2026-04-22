package com.realtimeeditor.dto;

import java.time.Instant;
import java.util.List;

public record DocumentResponse(
        Long id,
        String title,
        String ownerName,
        String ownerEmail,
        String language,
        String content,
        List<String> collaborators,
        Instant updatedAt,
        List<ExecutionResponse> history
) {
}
