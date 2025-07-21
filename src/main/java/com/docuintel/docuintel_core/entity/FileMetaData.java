package com.docuintel.docuintel_core.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
public class FileMetaData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String fileName;
    private String fileType;
    private long size;
    private String s3ObjectKey;
    @Column(columnDefinition = "TEXT")
    private String summary;
    private String classification;
    private LocalDateTime uploadTimestamp;
} 