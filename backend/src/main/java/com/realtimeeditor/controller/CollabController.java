package com.realtimeeditor.controller;

import com.realtimeeditor.dto.CollabMessage;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class CollabController {

    /**
     * Receives an edit from one client and broadcasts it to all subscribers
     * of the document's topic, including the sender (filtered client-side).
     *
     * Client sends to:  /app/document/{documentId}/edit
     * Broadcast to:     /topic/document/{documentId}
     */
    @MessageMapping("/document/{documentId}/edit")
    @SendTo("/topic/document/{documentId}")
    public CollabMessage handleEdit(
            @DestinationVariable Long documentId,
            CollabMessage message) {
        return message;
    }
}
