package com.realtimeeditor.dto;

import java.time.Instant;
import java.util.List;

public record SessionResponse(
        Long documentId,
        List<String> activeCollaborators,
        int activeCount,
        Instant lastHeartbeatAt
) {
}
