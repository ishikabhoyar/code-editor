package com.realtimeeditor.service.impl;

import com.realtimeeditor.dto.DocumentResponse;
import com.realtimeeditor.dto.DocumentUpsertRequest;
import com.realtimeeditor.dto.ExecutionResponse;
import com.realtimeeditor.entity.AppUserEntity;
import com.realtimeeditor.entity.DocumentEntity;
import com.realtimeeditor.entity.ExecutionRecordEmbeddable;
import com.realtimeeditor.exception.BadRequestException;
import com.realtimeeditor.exception.ResourceNotFoundException;
import com.realtimeeditor.repository.AppUserRepository;
import com.realtimeeditor.repository.DocumentRepository;
import com.realtimeeditor.service.DocumentService;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class DocumentServiceImpl implements DocumentService {

    private final DocumentRepository documentRepository;
    private final AppUserRepository userRepository;

    public DocumentServiceImpl(DocumentRepository documentRepository, AppUserRepository userRepository) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
    }

    @Override
    public DocumentResponse create(String ownerEmail, DocumentUpsertRequest request) {
        AppUserEntity owner = getUser(ownerEmail);
        DocumentEntity document = new DocumentEntity(
                request.title().trim(),
                owner.getEmail(),
                owner.getName(),
                normalizeLanguage(request.language()),
                request.content(),
                Instant.now(),
                Instant.now()
        );
        document.getCollaborators().add(owner.getName());
        documentRepository.save(document);
        return map(document);
    }

    @Override
    public List<DocumentResponse> list(String ownerEmail) {
        return documentRepository.findByOwnerEmailOrderByUpdatedAtDesc(ownerEmail).stream().map(this::map).toList();
    }

    @Override
    public DocumentResponse load(String ownerEmail, Long documentId) {
        // Any authenticated user can load a document by ID (collaboration via shared URL)
        DocumentEntity document = findDocument(documentId);
        // Auto-add them as a collaborator if not already
        AppUserEntity user = getUser(ownerEmail);
        if (!document.getOwnerEmail().equalsIgnoreCase(ownerEmail)
                && !document.getCollaborators().contains(user.getName())) {
            document.getCollaborators().add(user.getName());
            documentRepository.save(document);
        }
        return map(document);
    }

    @Override
    public DocumentResponse save(String ownerEmail, Long documentId, DocumentUpsertRequest request) {
        DocumentEntity document = ensureAccess(ownerEmail, documentId);
        document.setTitle(request.title().trim());
        document.setContent(request.content());
        document.setLanguage(normalizeLanguage(request.language()));
        document.setUpdatedAt(Instant.now());
        AppUserEntity user = getUser(ownerEmail);
        document.setOwnerEmail(user.getEmail());
        document.setOwnerName(user.getName());
        return map(documentRepository.save(document));
    }

    @Override
    public void delete(String ownerEmail, Long documentId) {
        DocumentEntity document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        if (!document.getOwnerEmail().equalsIgnoreCase(ownerEmail)) {
            throw new BadRequestException("Only the owner can delete this document");
        }
        documentRepository.delete(document);
    }

    @Override
    public DocumentResponse getAccessibleDocument(String ownerEmail, Long documentId) {
        return map(ensureAccess(ownerEmail, documentId));
    }

    public DocumentEntity findDocument(Long documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
    }

    public DocumentEntity ensureAccess(String ownerEmail, Long documentId) {
        DocumentEntity document = findDocument(documentId);
        AppUserEntity user = getUser(ownerEmail);
        boolean isOwner = document.getOwnerEmail().equalsIgnoreCase(ownerEmail);
        boolean isCollaborator = document.getCollaborators().contains(user.getName());
        if (!isOwner && !isCollaborator) {
            throw new BadRequestException("You do not have access to this document");
        }
        return document;
    }

    public DocumentEntity getOwnedDocument(String ownerEmail, Long documentId) {
        return documentRepository.findByIdAndOwnerEmail(documentId, ownerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
    }

    public DocumentEntity saveEntity(DocumentEntity document) {
        return documentRepository.save(document);
    }

    private AppUserEntity getUser(String email) {
        return userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private String normalizeLanguage(String language) {
        String normalized = language.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "html" -> "HTML";
            case "javascript", "js" -> "JavaScript";
            default -> "Java";
        };
    }

    private DocumentResponse map(DocumentEntity document) {
        List<ExecutionResponse> history = document.getExecutionHistory().stream()
                .map(this::mapExecution)
                .collect(Collectors.toList());
        return new DocumentResponse(
                document.getId(),
                document.getTitle(),
                document.getOwnerName(),
                document.getOwnerEmail(),
                document.getLanguage(),
                document.getContent(),
                List.copyOf(document.getCollaborators()),
                document.getUpdatedAt(),
                history
        );
    }

    private ExecutionResponse mapExecution(ExecutionRecordEmbeddable record) {
        return new ExecutionResponse(
                record.getExecutionId(),
                record.getStatus(),
                record.getStdout(),
                record.getStderr(),
                record.getDurationMs(),
                record.getExecutedAt()
        );
    }
}
