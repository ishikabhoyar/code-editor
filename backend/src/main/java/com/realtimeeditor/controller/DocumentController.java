package com.realtimeeditor.controller;

import com.realtimeeditor.dto.DocumentResponse;
import com.realtimeeditor.dto.DocumentUpsertRequest;
import com.realtimeeditor.dto.ExecutionRequest;
import com.realtimeeditor.dto.ExecutionResponse;
import com.realtimeeditor.dto.SessionActionRequest;
import com.realtimeeditor.dto.SessionResponse;
import com.realtimeeditor.service.DocumentService;
import com.realtimeeditor.service.ExecutionService;
import com.realtimeeditor.service.SessionService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final SessionService sessionService;
    private final ExecutionService executionService;

    public DocumentController(DocumentService documentService, SessionService sessionService, ExecutionService executionService) {
        this.documentService = documentService;
        this.sessionService = sessionService;
        this.executionService = executionService;
    }

    @PostMapping
    public DocumentResponse create(Principal principal, @Valid @RequestBody DocumentUpsertRequest request) {
        return documentService.create(principal.getName(), request);
    }

    @GetMapping
    public List<DocumentResponse> list(Principal principal) {
        return documentService.list(principal.getName());
    }

    @GetMapping("/{documentId}")
    public DocumentResponse load(Principal principal, @PathVariable Long documentId) {
        return documentService.load(principal.getName(), documentId);
    }

    @PutMapping("/{documentId}")
    public DocumentResponse save(Principal principal, @PathVariable Long documentId, @Valid @RequestBody DocumentUpsertRequest request) {
        return documentService.save(principal.getName(), documentId, request);
    }

    @DeleteMapping("/{documentId}")
    public void delete(Principal principal, @PathVariable Long documentId) {
        documentService.delete(principal.getName(), documentId);
    }

    @PostMapping("/{documentId}/sessions/join")
    public SessionResponse join(Principal principal, @PathVariable Long documentId, @Valid @RequestBody SessionActionRequest request) {
        return sessionService.join(principal.getName(), documentId, request);
    }

    @PostMapping("/{documentId}/sessions/leave")
    public SessionResponse leave(Principal principal, @PathVariable Long documentId, @Valid @RequestBody SessionActionRequest request) {
        return sessionService.leave(principal.getName(), documentId, request);
    }

    @PostMapping("/{documentId}/sessions/ping")
    public SessionResponse ping(Principal principal, @PathVariable Long documentId, @Valid @RequestBody SessionActionRequest request) {
        return sessionService.ping(principal.getName(), documentId, request);
    }

    @GetMapping("/{documentId}/sessions/active")
    public SessionResponse active(@PathVariable Long documentId) {
        return sessionService.active(documentId);
    }

    @PostMapping("/{documentId}/execute")
    public ExecutionResponse execute(Principal principal, @PathVariable Long documentId, @Valid @RequestBody ExecutionRequest request) {
        return executionService.execute(principal.getName(), documentId, request);
    }
}
