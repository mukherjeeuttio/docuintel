package com.docuintel.docuintel_core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class DocuintelCoreApplication {

	public static void main(String[] args) {
		SpringApplication.run(DocuintelCoreApplication.class, args);
	}

}
