package com.realtimeeditor.service;

import com.realtimeeditor.dto.DocumentResponse;
import com.realtimeeditor.dto.DocumentUpsertRequest;
import java.util.List;

public interface DocumentService {
    DocumentResponse create(String ownerEmail, DocumentUpsertRequest request);
    List<DocumentResponse> list(String ownerEmail);
    DocumentResponse load(String ownerEmail, Long documentId);
    DocumentResponse save(String ownerEmail, Long documentId, DocumentUpsertRequest request);
    void delete(String ownerEmail, Long documentId);
    DocumentResponse getAccessibleDocument(String ownerEmail, Long documentId);
}
