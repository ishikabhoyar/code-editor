package com.realtimeeditor.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.time.Instant;

@Embeddable
public class ExecutionRecordEmbeddable {

    @Column(nullable = false)
    private String executionId;

    @Column(nullable = false)
    private Instant executedAt;

    @Column(nullable = false)
    private String status;

    @Column(columnDefinition = "TEXT")
    private String stdout;

    @Column(columnDefinition = "TEXT")
    private String stderr;

    @Column(nullable = false)
    private long durationMs;

    protected ExecutionRecordEmbeddable() {
    }

    public ExecutionRecordEmbeddable(String executionId, Instant executedAt, String status, String stdout, String stderr, long durationMs) {
        this.executionId = executionId;
        this.executedAt = executedAt;
        this.status = status;
        this.stdout = stdout;
        this.stderr = stderr;
        this.durationMs = durationMs;
    }

    public String getExecutionId() {
        return executionId;
    }

    public Instant getExecutedAt() {
        return executedAt;
    }

    public String getStatus() {
        return status;
    }

    public String getStdout() {
        return stdout;
    }

    public String getStderr() {
        return stderr;
    }

    public long getDurationMs() {
        return durationMs;
    }
}
