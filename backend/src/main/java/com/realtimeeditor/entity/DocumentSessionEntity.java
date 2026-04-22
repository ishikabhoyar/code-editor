package com.realtimeeditor.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "document_sessions")
public class DocumentSessionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long documentId;

    @Column(nullable = false)
    private String collaboratorName;

    @Column(nullable = false)
    private boolean active;

    @Column(nullable = false)
    private Instant lastHeartbeatAt;

    protected DocumentSessionEntity() {
    }

    public DocumentSessionEntity(Long documentId, String collaboratorName, boolean active, Instant lastHeartbeatAt) {
        this.documentId = documentId;
        this.collaboratorName = collaboratorName;
        this.active = active;
        this.lastHeartbeatAt = lastHeartbeatAt;
    }

    public Long getId() {
        return id;
    }

    public Long getDocumentId() {
        return documentId;
    }

    public String getCollaboratorName() {
        return collaboratorName;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getLastHeartbeatAt() {
        return lastHeartbeatAt;
    }

    public void setDocumentId(Long documentId) {
        this.documentId = documentId;
    }

    public void setCollaboratorName(String collaboratorName) {
        this.collaboratorName = collaboratorName;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public void setLastHeartbeatAt(Instant lastHeartbeatAt) {
        this.lastHeartbeatAt = lastHeartbeatAt;
    }
}
