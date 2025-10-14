package com.pecenio.backend.controller;

import com.pecenio.backend.util.ApiResponseUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:51316", "http://localhost:53172"})
public class ProductImageController {

    private static final String UPLOAD_DIR = "upload-dir/product-images";

    @PostMapping("/upload-image")
    public ResponseEntity<Map<String, Object>> uploadProductImage(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            System.out.println("=== IMAGE UPLOAD DEBUG ===");
            System.out.println("File received: " + (file != null ? "Yes" : "No"));
            System.out.println("File name: " + (file != null ? file.getOriginalFilename() : "null"));
            System.out.println("File size: " + (file != null ? file.getSize() : "null"));
            System.out.println("File content type: " + (file != null ? file.getContentType() : "null"));
            
            // Validate file
            if (file.isEmpty()) {
                System.out.println("ERROR: File is empty");
                return ApiResponseUtil.error("File is empty", HttpStatus.BAD_REQUEST);
            }

            // Check file type
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                System.out.println("ERROR: Invalid file type: " + contentType);
                return ApiResponseUtil.error("File must be an image", HttpStatus.BAD_REQUEST);
            }

            // Check file size (max 5MB)
            if (file.getSize() > 5 * 1024 * 1024) {
                System.out.println("ERROR: File too large: " + file.getSize());
                return ApiResponseUtil.error("File size must not exceed 5MB", HttpStatus.BAD_REQUEST);
            }

            // Create upload directory if it doesn't exist
            Path uploadPath = Paths.get(UPLOAD_DIR);
            System.out.println("Upload path: " + uploadPath.toAbsolutePath());
            System.out.println("Directory exists: " + Files.exists(uploadPath));
            
            if (!Files.exists(uploadPath)) {
                System.out.println("Creating directory: " + uploadPath);
                Files.createDirectories(uploadPath);
                System.out.println("Directory created successfully");
            }
            
            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = "product_" + UUID.randomUUID().toString() + extension;
            Path filePath = uploadPath.resolve(filename);
            
            System.out.println("Saving file to: " + filePath.toAbsolutePath());
            
            // Save file
            Files.copy(file.getInputStream(), filePath);
            System.out.println("File saved successfully");
            
            // Return the relative URL path
            String imageUrl = "/api/products/images/" + filename;
            
            response.put("success", true);
            response.put("imageUrl", imageUrl);
            response.put("filename", filename);
            response.put("message", "Image uploaded successfully");
            
            System.out.println("Returning success response");
            return ResponseEntity.ok(response);
            
        } catch (IOException e) {
            System.out.println("IO Exception: " + e.getMessage());
            e.printStackTrace();
            return ApiResponseUtil.error("Failed to upload image: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            System.out.println("Unexpected Exception: " + e.getMessage());
            e.printStackTrace();
            return ApiResponseUtil.error("Unexpected error: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/images/{filename}")
    public ResponseEntity<org.springframework.core.io.Resource> serveProductImage(@PathVariable String filename) {
        try {
            Path filePath = Paths.get(UPLOAD_DIR).resolve(filename).normalize();
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(filePath.toUri());
            
            if (resource.exists() && resource.isReadable()) {
                return ResponseEntity.ok()
                    .header("Content-Type", "image/jpeg")
                    .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
