package com.realtimeeditor.service;

import com.realtimeeditor.dto.ExecutionRequest;
import com.realtimeeditor.dto.ExecutionResponse;

public interface ExecutionService {
    ExecutionResponse execute(String ownerEmail, Long documentId, ExecutionRequest request);
}
