package com.realtimeeditor.dto;

import java.time.Instant;

public record ExecutionResponse(
        String executionId,
        String status,
        String stdout,
        String stderr,
        long durationMs,
        Instant executedAt
) {
}
