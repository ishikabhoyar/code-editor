package com.realtimeeditor.service;

import com.realtimeeditor.dto.SessionActionRequest;
import com.realtimeeditor.dto.SessionResponse;

public interface SessionService {
    SessionResponse join(String ownerEmail, Long documentId, SessionActionRequest request);
    SessionResponse leave(String ownerEmail, Long documentId, SessionActionRequest request);
    SessionResponse ping(String ownerEmail, Long documentId, SessionActionRequest request);
    SessionResponse active(Long documentId);
}
