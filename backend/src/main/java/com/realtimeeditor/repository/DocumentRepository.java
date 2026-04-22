package com.realtimeeditor.repository;

import com.realtimeeditor.entity.DocumentEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<DocumentEntity, Long> {
    List<DocumentEntity> findByOwnerEmailOrderByUpdatedAtDesc(String ownerEmail);
    Optional<DocumentEntity> findByIdAndOwnerEmail(Long id, String ownerEmail);
}
