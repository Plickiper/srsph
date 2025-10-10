package com.pecenio.backend.controller;

import com.pecenio.backend.dto.RatingRequest;
import com.pecenio.backend.util.ApiResponseUtil;
import com.pecenio.datamodel.entity.RatingEntity;
import com.pecenio.datamodel.entity.UserEntity;
import com.pecenio.datamodel.entity.ProductEntity;
import com.pecenio.datamodel.entity.OrderEntity;
import com.pecenio.datamodel.repository.RatingRepository;
import com.pecenio.datamodel.repository.UserRepository;
import com.pecenio.datamodel.repository.ProductRepository;
import com.pecenio.datamodel.repository.OrderRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;
import java.util.stream.Collectors;
import java.util.List;
import java.nio.file.*;
import java.io.IOException;

@RestController
@RequestMapping("/api/ratings")
public class RatingController {

    private static final String UPLOAD_DIR = "upload-dir/review-images";

    @Autowired
    private RatingRepository ratingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createRating(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @Valid @ModelAttribute RatingRequest ratingRequest) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Debug logging

            // Get entities
            Optional<UserEntity> userOpt = userRepository.findById(ratingRequest.getUserId());
            Optional<ProductEntity> productOpt = productRepository.findById(ratingRequest.getProductId());
            Optional<OrderEntity> orderOpt = orderRepository.findById(ratingRequest.getOrderId());

            if (userOpt.isEmpty() || productOpt.isEmpty() || orderOpt.isEmpty()) {
                return ApiResponseUtil.error("User, product, or order not found", HttpStatus.BAD_REQUEST);
            }

            UserEntity user = userOpt.get();
            ProductEntity product = productOpt.get();
            OrderEntity order = orderOpt.get();

            // Check if user already rated this product from this order
            boolean alreadyRated = ratingRepository.existsByUserAndProductAndOrder(user, product, order);
            
            if (alreadyRated) {
                return ApiResponseUtil.error("You have already rated this product from this order", HttpStatus.BAD_REQUEST);
            }

            // Check if order is delivered
            if (order.getStatus() != OrderEntity.OrderStatus.DELIVERED) {
                return ApiResponseUtil.error("You can only rate products from delivered orders", HttpStatus.BAD_REQUEST);
            }

            // Handle image upload if provided
            String reviewImageUrl = null;
            if (file != null && !file.isEmpty()) {
                try {
                    // Create upload directory if it doesn't exist
                    Path uploadPath = Paths.get(UPLOAD_DIR);
                    if (!Files.exists(uploadPath)) {
                        Files.createDirectories(uploadPath);
                    }
                    
                    // Generate unique filename including productId to avoid conflicts
                    String filename = "review_" + ratingRequest.getUserId() + "_" + ratingRequest.getOrderId() + "_" + ratingRequest.getProductId() + "_" + System.currentTimeMillis() + ".jpg";
                    Path filePath = uploadPath.resolve(filename);
                    Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
                    
                    reviewImageUrl = "/api/ratings/uploads/" + filename;
                } catch (IOException e) {
                    return ApiResponseUtil.internalError("Failed to upload review image: " + e.getMessage());
                }
            }

            // Create rating
            RatingEntity ratingEntity = new RatingEntity();
            ratingEntity.setUser(user);
            ratingEntity.setProduct(product);
            ratingEntity.setOrder(order);
            ratingEntity.setRating(ratingRequest.getRating());
            ratingEntity.setComment(ratingRequest.getComment());
            ratingEntity.setReviewImageUrl(reviewImageUrl);
            // Persist which variant was rated to avoid ambiguity when multiple same products exist in one order
            if (ratingRequest.getCompatibility() != null && !ratingRequest.getCompatibility().trim().isEmpty()) {
                ratingEntity.setRatedCompatibility(ratingRequest.getCompatibility().trim());
            } else {
                // Fallback: try to infer from the specific order item
                String inferred = null;
                if (order.getOrderItems() != null) {
                    var match = order.getOrderItems().stream()
                        .filter(i -> i.getProduct().getId().equals(product.getId()))
                        .findFirst();
                    if (match.isPresent() && match.get().getCompatibility() != null && !match.get().getCompatibility().trim().isEmpty()) {
                        inferred = match.get().getCompatibility();
                    }
                }
                ratingEntity.setRatedCompatibility(inferred);
            }

            ratingRepository.save(ratingEntity);

            // Update product rating statistics
            updateProductRatingStats(product);

            response.put("success", true);
            response.put("message", "Rating submitted successfully");
            response.put("ratingId", ratingEntity.getId());
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to submit rating: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<Map<String, Object>>> getProductRatings(@PathVariable Long productId) {
        try {
            Optional<ProductEntity> productOpt = productRepository.findById(productId);
            if (productOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            List<RatingEntity> ratings = ratingRepository.findByProductOrderByCreatedAtDesc(productOpt.get());
            List<Map<String, Object>> response = new ArrayList<>();
            

            for (RatingEntity rating : ratings) {
                Map<String, Object> ratingData = new HashMap<>();
                ratingData.put("id", rating.getId());
                ratingData.put("userId", rating.getUser().getId());
                ratingData.put("productId", rating.getProduct().getId());
                ratingData.put("orderId", rating.getOrder().getId());
                ratingData.put("rating", rating.getRating());
                ratingData.put("comment", rating.getComment());
                ratingData.put("reviewImageUrl", rating.getReviewImageUrl());
                ratingData.put("createdAt", rating.getCreatedAt());
                ratingData.put("userName", rating.getUser().getUsername());
                ratingData.put("firstName", rating.getUser().getFirstName());
                ratingData.put("lastName", rating.getUser().getLastName());
                ratingData.put("avatarUrl", rating.getUser().getProfilePicture());
                
                // Get variant information from all order items that match the rated product
                String variant = "Standard";
                int variantCount = 1;
                List<String> allVariants = new ArrayList<>();
                
                if (rating.getOrder().getOrderItems() != null && !rating.getOrder().getOrderItems().isEmpty()) {
                    // Get all variants of this product from the same order
                    var matchingItems = rating.getOrder().getOrderItems().stream()
                        .filter(item -> item.getProduct().getId().equals(rating.getProduct().getId()))
                        .collect(Collectors.toList());
                    
                    if (!matchingItems.isEmpty()) {
                        // Collect all unique variants
                        Set<String> uniqueVariants = new HashSet<>();
                        for (var orderItem : matchingItems) {
                            String itemVariant = "Standard";
                            if (orderItem.getCompatibility() != null && !orderItem.getCompatibility().trim().isEmpty()) {
                                itemVariant = orderItem.getCompatibility();
                            }
                            uniqueVariants.add(itemVariant);
                        }
                        allVariants = new ArrayList<>(uniqueVariants);
                        
                        // Use the first variant as the primary variant (for backward compatibility)
                        variant = allVariants.get(0);
                        variantCount = allVariants.size();
                    }
                }
                
                ratingData.put("variant", variant);
                ratingData.put("variantCount", variantCount);
                ratingData.put("allVariants", allVariants);
                response.add(ratingData);
                
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/product/{productId}/stats")
    public ResponseEntity<Map<String, Object>> getProductRatingStats(@PathVariable Long productId) {
        try {
            Optional<ProductEntity> productOpt = productRepository.findById(productId);
            if (productOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            List<RatingEntity> ratings = ratingRepository.findByProductOrderByCreatedAtDesc(productOpt.get());
            
            if (ratings.isEmpty()) {
                Map<String, Object> stats = new HashMap<>();
                stats.put("averageRating", 0.0);
                stats.put("totalRatings", 0);
                stats.put("ratingDistribution", new int[]{0, 0, 0, 0, 0});
                return ResponseEntity.ok(stats);
            }

            double totalRating = 0;
            int[] distribution = new int[5];
            
            for (RatingEntity rating : ratings) {
                totalRating += rating.getRating();
                distribution[rating.getRating() - 1]++;
            }

            double averageRating = totalRating / ratings.size();
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("averageRating", Math.round(averageRating * 10.0) / 10.0);
            stats.put("totalRatings", ratings.size());
            stats.put("ratingDistribution", distribution);

            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    // Debug endpoint to clear all ratings (for testing)
    @DeleteMapping("/clear-all")
    public ResponseEntity<Map<String, Object>> clearAllRatings() {
        Map<String, Object> response = new HashMap<>();
        try {
            // Get all products before clearing ratings
            List<ProductEntity> allProducts = productRepository.findAll();
            
            // Clear all ratings
            ratingRepository.deleteAll();
            
            // Update all product statistics to reflect no ratings
            for (ProductEntity product : allProducts) {
                updateProductRatingStats(product);
            }
            
            response.put("success", true);
            response.put("message", "All ratings cleared and product statistics updated");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to clear ratings: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    // Endpoint to update all product rating statistics (for backfilling existing data)
    @PostMapping("/update-all-product-stats")
    public ResponseEntity<Map<String, Object>> updateAllProductStats() {
        Map<String, Object> response = new HashMap<>();
        try {
            // Get all products
            List<ProductEntity> allProducts = productRepository.findAll();
            int updatedCount = 0;
            
            for (ProductEntity product : allProducts) {
                updateProductRatingStats(product);
                updatedCount++;
            }
            
            response.put("success", true);
            response.put("message", "Updated rating statistics for " + updatedCount + " products");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to update product stats: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    // Serve review images
    @GetMapping("/uploads/{filename}")
    public ResponseEntity<org.springframework.core.io.Resource> serveReviewImage(@PathVariable String filename) {
        try {
            Path filePath = Paths.get(UPLOAD_DIR).resolve(filename).normalize();
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(filePath.toUri());
            
            if (resource.exists() && resource.isReadable()) {
                String contentType = Files.probeContentType(filePath);
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }
                
                return ResponseEntity.ok()
                        .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                        .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Helper method to update product rating statistics
    private void updateProductRatingStats(ProductEntity product) {
        try {
            // Get all ratings for this product
            List<RatingEntity> productRatings = ratingRepository.findByProductOrderByCreatedAtDesc(product);
            
            if (productRatings.isEmpty()) {
                // No ratings, reset to default values
                product.setRating(java.math.BigDecimal.ZERO);
                product.setReviewCount(0);
            } else {
                // Calculate average rating
                double averageRating = productRatings.stream()
                    .mapToInt(RatingEntity::getRating)
                    .average()
                    .orElse(0.0);
                
                // Update product with new statistics
                product.setRating(java.math.BigDecimal.valueOf(averageRating));
                product.setReviewCount(productRatings.size());
            }
            
            // Save the updated product
            productRepository.save(product);
            
        } catch (Exception e) {
            // Log error but don't fail the rating submission
            System.err.println("Error updating product rating stats: " + e.getMessage());
        }
    }
}
