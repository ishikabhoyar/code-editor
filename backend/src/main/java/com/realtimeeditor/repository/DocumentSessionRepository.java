package com.realtimeeditor.repository;

import com.realtimeeditor.entity.DocumentSessionEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentSessionRepository extends JpaRepository<DocumentSessionEntity, Long> {
    Optional<DocumentSessionEntity> findByDocumentIdAndCollaboratorName(Long documentId, String collaboratorName);
    List<DocumentSessionEntity> findByDocumentIdAndActiveTrue(Long documentId);
}
