package com.realtimeeditor.service.impl;

import com.realtimeeditor.dto.SessionActionRequest;
import com.realtimeeditor.dto.SessionResponse;
import com.realtimeeditor.entity.DocumentEntity;
import com.realtimeeditor.entity.DocumentSessionEntity;
import com.realtimeeditor.exception.BadRequestException;
import com.realtimeeditor.repository.DocumentSessionRepository;
import com.realtimeeditor.service.SessionService;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SessionServiceImpl implements SessionService {

    private final DocumentServiceImpl documentService;
    private final DocumentSessionRepository sessionRepository;

    public SessionServiceImpl(DocumentServiceImpl documentService, DocumentSessionRepository sessionRepository) {
        this.documentService = documentService;
        this.sessionRepository = sessionRepository;
    }

    @Override
    public SessionResponse join(String ownerEmail, Long documentId, SessionActionRequest request) {
        if (request.collaboratorName().isBlank()) {
            throw new BadRequestException("Collaborator name is required");
        }

        DocumentEntity document = documentService.findDocument(documentId);
        upsertSession(documentId, request.collaboratorName(), true);
        document.getCollaborators().add(request.collaboratorName().trim());
        document.setUpdatedAt(Instant.now());
        documentService.saveEntity(document);
        return active(documentId);
    }

    @Override
    public SessionResponse leave(String ownerEmail, Long documentId, SessionActionRequest request) {
        DocumentEntity document = documentService.findDocument(documentId);
        DocumentSessionEntity session = sessionRepository.findByDocumentIdAndCollaboratorName(documentId, request.collaboratorName().trim())
                .orElseThrow(() -> new BadRequestException("Session not found for collaborator"));
        session.setActive(false);
        session.setLastHeartbeatAt(Instant.now());
        sessionRepository.save(session);
        document.getCollaborators().remove(request.collaboratorName().trim());
        document.setUpdatedAt(Instant.now());
        documentService.saveEntity(document);
        return active(documentId);
    }

    @Override
    public SessionResponse ping(String ownerEmail, Long documentId, SessionActionRequest request) {
        documentService.findDocument(documentId);
        DocumentSessionEntity session = upsertSession(documentId, request.collaboratorName(), true);
        session.setLastHeartbeatAt(Instant.now());
        sessionRepository.save(session);
        return active(documentId);
    }

    @Override
    public SessionResponse active(Long documentId) {
        List<DocumentSessionEntity> sessions = sessionRepository.findByDocumentIdAndActiveTrue(documentId);
        List<String> collaborators = sessions.stream().map(DocumentSessionEntity::getCollaboratorName).distinct().toList();
        Instant lastHeartbeat = sessions.stream()
                .map(DocumentSessionEntity::getLastHeartbeatAt)
                .max(Instant::compareTo)
                .orElse(Instant.now());
        return new SessionResponse(documentId, collaborators, collaborators.size(), lastHeartbeat);
    }

    private DocumentSessionEntity upsertSession(Long documentId, String collaboratorName, boolean active) {
        String normalizedName = collaboratorName.trim();
        DocumentSessionEntity session = sessionRepository.findByDocumentIdAndCollaboratorName(documentId, normalizedName)
                .orElseGet(() -> new DocumentSessionEntity(documentId, normalizedName, active, Instant.now()));
        session.setDocumentId(documentId);
        session.setCollaboratorName(normalizedName);
        session.setActive(active);
        session.setLastHeartbeatAt(Instant.now());
        return sessionRepository.save(session);
    }
}
