package com.docuintel.docuintel_core.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class AwsConfig {
    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
                       .region(Region.AP_SOUTH_1) // Change to your AWS region if needed
                       .build();
    }
} 