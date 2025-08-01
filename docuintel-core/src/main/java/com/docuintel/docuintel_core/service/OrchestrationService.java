package com.docuintel.docuintel_core.service;

import com.docuintel.docuintel_core.dto.ProcessedResponse;
import com.docuintel.docuintel_core.dto.TextRequest;
import com.docuintel.docuintel_core.entity.FileMetaData;
import com.docuintel.docuintel_core.entity.Folder;
import com.docuintel.docuintel_core.repository.FileMetaDataRepository;
import com.docuintel.docuintel_core.repository.FolderRepository;
import jakarta.annotation.Nullable;
import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.io.ByteArrayInputStream;
import java.io.IOException;

@Service
public class OrchestrationService {

    private static final Logger log = LoggerFactory.getLogger(OrchestrationService.class);

    @Autowired
    FileMetaDataRepository metaDataRepository;

    @Autowired
    private S3Service s3Service;

    @Autowired
    private WebClient webClient;

    @Autowired
    private FolderRepository folderRepository;

    private final Tika tika = new Tika();

    @Async
    public void processAndCategorizeFile(Long metadataId, @Nullable Long folderId) {
        FileMetaData metaData = metaDataRepository.findById(metadataId)
                .orElseThrow(() -> new RuntimeException("Orchestration Error: Metadata not found for id: " + metadataId));

        String fileType = metaData.getFileType();
        if (fileType != null) {
            if (fileType.startsWith("image/")) {
                assignToFolder(metaData, "Photos", "Categorized as Image");
                return;
            }
            if (fileType.startsWith("video/")) {
                assignToFolder(metaData, "Videos", "Categorized as Video");
                return;
            }
        }

        byte[] fileContent = s3Service.downloadFile(metaData.getS3ObjectKey());
        String extractedText;
        try {
            extractedText = tika.parseToString(new ByteArrayInputStream(fileContent));
        } catch (IOException | TikaException e) {
            log.error("Failed to extract text from file: {}", metaData.getFileName(), e);
            updateWithError(metaData, "Text extraction failed.", "Unclassified");
            return;
        }

        if (extractedText == null || extractedText.isBlank()) {
            log.warn("Extracted text is empty for file: {}. Placing in 'Unclassified'.", metaData.getFileName());
            assignToFolder(metaData, "Unclassified", "Document is empty or contains no readable text.");
            return;
        }

        log.info("Text extracted. Calling Gemini AI service for file: {}", metaData.getFileName());
        callProcessDocumentService(extractedText).subscribe(
                processedResponse -> {
                    String summary = processedResponse.summary();
                    String classification = processedResponse.classification();

                    if (folderId != null) {
                        // If a folder was specified, use it.
                        Folder targetFolder = folderRepository.findById(folderId)
                                .orElseThrow(() -> new RuntimeException("Target folder not found for id: " + folderId));
                        assignToFolder(metaData, targetFolder.getName(), summary);
                    } else {
                        // If no folder was specified, use the classification from Gemini.
                        assignToFolder(metaData, classification, summary);
                    }
                },
                error -> {
                    // This error handling works for the new service call too.
                    log.error("Error during AI service call for file: {}", metaData.getFileName(), error);
                    updateWithError(metaData, "AI service call failed.", "Unclassified");
                }
        );
    }

    private void assignToFolder(FileMetaData metaData, String folderName, String summary) {
        Folder folder = folderRepository.findByName(folderName)
                .orElseGet(() -> folderRepository.save(new Folder(folderName)));

        metaData.setFolder(folder);
        metaData.setSummary(summary);
        metaData.setClassification(folderName);
        metaDataRepository.save(metaData);

        log.info("Successfully assigned file '{}' to folder '{}' with summary.", metaData.getFileName(), folderName);
    }

    private Mono<ProcessedResponse> callProcessDocumentService(String text) {
        log.debug("Calling new Gemini document processing service...");
        TextRequest request = new TextRequest(text);
        return webClient.post()
                .uri("/process-document") // New endpoint URI
                .bodyValue(request)
                .retrieve()
                .bodyToMono(ProcessedResponse.class)
                .onErrorResume(e -> {
                    log.error("Error connecting to Gemini service: " + e.getMessage());
                    return Mono.just(new ProcessedResponse("Error: Could not process document.", "Unclassified"));
                });
    }

    private void updateWithError(FileMetaData metadata, String errorMessage, String folderName) {
        log.warn("Updating metadataId {} with error state: {}", metadata.getId(), errorMessage);
        assignToFolder(metadata, folderName, "Processing Error: " + errorMessage);
    }
}