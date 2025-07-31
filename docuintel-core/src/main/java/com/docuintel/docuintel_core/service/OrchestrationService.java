package com.docuintel.docuintel_core.service;

import com.docuintel.docuintel_core.dto.ClassifyResponse;
import com.docuintel.docuintel_core.dto.SummarizeResponse;
import com.docuintel.docuintel_core.dto.TextRequest;
import com.docuintel.docuintel_core.entity.FileMetaData;
import com.docuintel.docuintel_core.entity.Folder;
import com.docuintel.docuintel_core.repository.FileMetaDataRepository;
import com.docuintel.docuintel_core.repository.FolderRepository;
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
    public void processAndCategorizeFile(Long metadataId){
        FileMetaData metaData = metaDataRepository.findById(metadataId).orElseThrow(() -> new RuntimeException("Orchestration Error: Metadata not found for id: " + metadataId));
        String fileType = metaData.getFileType();

        if (fileType != null && fileType.startsWith("image/")) {
            assignToFolder(metaData, "Photos", "Categorized as Image");
            return;
        }

        if (fileType != null && fileType.startsWith("video/")) {
            assignToFolder(metaData, "Videos", "Categorized as Video");
            return;
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

        log.info("Text extracted. Calling AI services for file: {}", metaData.getFileName());
        Mono<SummarizeResponse> summaryMono = callSummarizeService(extractedText);
        Mono<ClassifyResponse> classifyMono = callClassifyService(extractedText);

        Mono.zip(summaryMono, classifyMono).subscribe(
                tuple -> {
                    SummarizeResponse summaryResponse = tuple.getT1();
                    ClassifyResponse classifyResponse = tuple.getT2();

                    String folderName = classifyResponse.classification();
                    log.info("AI classification for '{}' is '{}'. Assigning to folder.", metaData.getFileName(), folderName);

                    assignToFolder(metaData, folderName, summaryResponse.summary());
                },
                error -> {
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

    private Mono<SummarizeResponse> callSummarizeService(String text) {
        log.debug("Calling summarization service...");
        TextRequest request = new TextRequest(text);
        return webClient.post()
                .uri("/summarize")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(SummarizeResponse.class)
                .onErrorResume(e -> Mono.just(new SummarizeResponse("Summary not available."))); // Fallback
    }

    private Mono<ClassifyResponse> callClassifyService(String text) {
        log.debug("Calling classification service...");
        TextRequest request = new TextRequest(text);
        return webClient.post()
                .uri("/classify")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(ClassifyResponse.class)
                .onErrorResume(e -> Mono.just(new ClassifyResponse("Unclassified", 0.0))); // Fallback
    }

    private void updateWithError(FileMetaData metadata, String errorMessage, String folderName) {
        log.warn("Updating metadataId {} with error state: {}", metadata.getId(), errorMessage);
        assignToFolder(metadata, folderName, "Processing Error: " + errorMessage);
    }
}

