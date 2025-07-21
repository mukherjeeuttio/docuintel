package com.docuintel.docuintel_core.service;

import com.docuintel.docuintel_core.entity.FileMetaData;
import com.docuintel.docuintel_core.repository.FileMetaDataRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class OrchestrationService {

    @Autowired
    FileMetaDataRepository metaDataRepository;

    private String extractTextFromFileInS3(String s3Key) {
        //logic to be implemented later
        return "This is the extracted text from the document.";
    }

    @Async
    public void processFile(Long metaDataId)
    {
        FileMetaData fileMetaData = metaDataRepository.findById(metaDataId)
                .orElseThrow(() -> new RuntimeException("Metadata not found"));

        String textContent = extractTextFromFileInS3(fileMetaData.getS3ObjectKey());

        // 1. Call Summarization Service (placeholder)
        // WebClient.create("http://fastapi-service:8000/summarize")...
        String summary = "This is a placeholder summary.";

        // 2. Call Classification Service (placeholder)
        // WebClient.create("http://fastapi-service:8000/classify")...
        String classification = "INVOICE"; // Placeholder

        // 3. update metadata in the database
        fileMetaData.setSummary(summary);
        fileMetaData.setClassification(classification);
        metaDataRepository.save(fileMetaData);
        System.out.println("Finished AI processing for file: " + fileMetaData.getFileName());
    }
}
