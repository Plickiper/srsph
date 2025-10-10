package com.pecenio.backend.controller;

import com.pecenio.backend.service.ProductService;
import com.pecenio.backend.service.AuditLogService;
import com.pecenio.backend.dto.ProductRequest;
import com.pecenio.backend.util.ApiResponseUtil;
import com.pecenio.businessmodel.entity.Product;
import com.pecenio.businessmodel.entity.AuditLog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductService productService;
    
    @Autowired
    private AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllProducts() {
        try {
            List<Product> products = productService.getAllProducts();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("products", products);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Failed to retrieve products");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getProductById(@PathVariable Long id) {
        try {
            Optional<Product> product = productService.getProductById(id);
            if (product.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("product", product.get());
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("error", "Product not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Failed to retrieve product: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    @GetMapping("/test-db")
    public ResponseEntity<Map<String, Object>> testDatabase() {
        try {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Database connection test");
            response.put("timestamp", java.time.LocalDateTime.now());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Database test failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    @GetMapping("/debug/{id}")
    public ResponseEntity<Map<String, Object>> debugProduct(@PathVariable Long id) {
        try {
            Optional<Product> product = productService.getProductById(id);
            if (product.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("product", product.get());
                response.put("variants_raw", product.get().getVariants());
                response.put("compatibility_raw", product.get().getCompatibility());
                response.put("stock_quantity_raw", product.get().getStockQuantity());
                response.put("price_raw", product.get().getPrice());
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("error", "Product not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Failed to retrieve product: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createProduct(@Valid @RequestBody ProductRequest productRequest, HttpServletRequest request) {
        try {
            // Convert DTO to entity
            Product product = convertToProduct(productRequest);
            
            Product createdProduct = productService.createProduct(product);
            
            // Log the product creation
            auditLogService.logAction(
                1L, // Default admin user ID
                "Admin", // Use current user or default
                "admin@sunracing.com", // Default admin email
                "CREATE_PRODUCT",
                "PRODUCT",
                createdProduct.getId(),
                createdProduct.getName(),
                "Product '" + createdProduct.getName() + "' was created",
                getClientIpAddress(request),
                request.getHeader("User-Agent"),
                AuditLog.ActionType.CREATE,
                AuditLog.Severity.MEDIUM
            );
            
            return ApiResponseUtil.created(createdProduct, "Product created successfully");
        } catch (Exception e) {
            return ApiResponseUtil.error("Failed to create product: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateProduct(@PathVariable Long id, @RequestBody Map<String, Object> requestBody, HttpServletRequest request) {
        try {
            System.out.println("Update product request received for ID: " + id);
            System.out.println("Request body keys: " + requestBody.keySet());
            
            // Extract product and user information from request
            Product product = extractProductFromRequest(requestBody);
            String currentUser = extractCurrentUserFromRequest(requestBody);
            
            System.out.println("Extracted product: " + product.getName());
            System.out.println("Images field: " + product.getImages());
            
            Product updatedProduct = productService.updateProduct(id, product);
            
            // Log the product update
            auditLogService.logAction(
                1L, // Default admin user ID
                currentUser != null ? currentUser : "Admin", // Use current user or default
                "admin@sunracing.com", // Default admin email
                "UPDATE_PRODUCT",
                "PRODUCT",
                updatedProduct.getId(),
                updatedProduct.getName(),
                "Product '" + updatedProduct.getName() + "' was updated by " + (currentUser != null ? currentUser : "Admin"),
                getClientIpAddress(request),
                request.getHeader("User-Agent"),
                AuditLog.ActionType.UPDATE,
                AuditLog.Severity.MEDIUM
            );
            
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("product", updatedProduct);
            response.put("message", "Product updated successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Product not found or update failed");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteProduct(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> requestBody, HttpServletRequest request) {
        try {
            // Get product info before deletion for audit log
            Optional<Product> productToDelete = productService.getProductById(id);
            String productName = productToDelete.map(Product::getName).orElse("Unknown Product");
            
            // Extract current user from request body (if provided)
            String currentUser = null;
            if (requestBody != null) {
                currentUser = extractCurrentUserFromRequest(requestBody);
            }
            
            
            productService.deleteProduct(id);
            
            // Log the product deletion
            auditLogService.logAction(
                1L, // Default admin user ID
                currentUser != null ? currentUser : "Admin", // Use current user or default
                "admin@sunracing.com", // Default admin email
                "DELETE_PRODUCT",
                "PRODUCT",
                id,
                productName,
                "Product '" + productName + "' was deleted by " + (currentUser != null ? currentUser : "Admin"),
                getClientIpAddress(request),
                request.getHeader("User-Agent"),
                AuditLog.ActionType.DELETE,
                AuditLog.Severity.HIGH
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Product deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Product not found or deletion failed");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    @PostMapping("/add-missing-columns")
    public ResponseEntity<Map<String, Object>> addMissingColumns() {
        try {
            // This is a temporary endpoint to add missing columns
            // You can call this once to fix the database schema
            
            // Note: This would need to be implemented in the service layer
            // For now, we'll just return a message with instructions
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Please run the SQL script: add-missing-columns.sql");
            response.put("instructions", "Execute the SQL commands in MySQL Workbench or command line to add the missing columns");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Failed to add columns: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/brand/{brand}")
    public ResponseEntity<Map<String, Object>> getProductsByBrand(@PathVariable String brand) {
        try {
            List<Product> products = productService.getProductsByBrand(brand);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("products", products);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Failed to retrieve products by brand");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<Map<String, Object>> getProductsByCategory(@PathVariable String category) {
        try {
            List<Product> products = productService.getProductsByCategory(category);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("products", products);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Failed to retrieve products by category");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Integer minStock) {
        try {
            List<Product> products = productService.searchProducts(search, brand, category, minPrice, maxPrice, minStock);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("products", products);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Failed to search products");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/brands")
    public ResponseEntity<Map<String, Object>> getAllBrands() {
        try {
            List<String> brands = productService.getAllBrands();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("brands", brands);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Failed to retrieve brands");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/categories")
    public ResponseEntity<Map<String, Object>> getAllCategories() {
        try {
            List<String> categories = productService.getAllCategories();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("categories", categories);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Failed to retrieve categories");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/featured")
    public ResponseEntity<Map<String, Object>> getFeaturedProducts() {
        try {
            List<Product> products = productService.getFeaturedProducts();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("products", products);
            response.put("count", products.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Failed to retrieve featured products");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/new-arrivals")
    public ResponseEntity<Map<String, Object>> getNewArrivals() {
        try {
            List<Product> products = productService.getNewArrivals();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("products", products);
            response.put("count", products.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Failed to retrieve new arrivals");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/updated-since/{timestamp}")
    public ResponseEntity<Map<String, Object>> getProductsUpdatedSince(@PathVariable String timestamp) {
        try {
            List<Product> products = productService.getProductsUpdatedSince(timestamp);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("products", products);
            response.put("count", products.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Failed to retrieve updated products: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/{id}/featured")
    public ResponseEntity<Map<String, Object>> setFeaturedProduct(@PathVariable Long id, @RequestBody Map<String, Object> requestBody) {
        try {
            Boolean isFeatured = (Boolean) requestBody.get("isFeatured");
            if (isFeatured == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("error", "isFeatured field is required");
                return ResponseEntity.badRequest().body(response);
            }

            Product updatedProduct = productService.setFeaturedProduct(id, isFeatured);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("product", updatedProduct);
            response.put("message", "Product featured status updated successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Failed to update featured status: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // Helper method to get client IP address
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        return request.getRemoteAddr();
    }
    
    // Helper method to extract Product from request body
    private Product extractProductFromRequest(Map<String, Object> requestBody) {
        // Create a new Product object and populate it from the request
        Product product = new Product();
        
        if (requestBody.containsKey("name")) {
            product.setName((String) requestBody.get("name"));
        }
        if (requestBody.containsKey("brand")) {
            product.setBrand((String) requestBody.get("brand"));
        }
        if (requestBody.containsKey("category")) {
            product.setCategory((String) requestBody.get("category"));
        }
        if (requestBody.containsKey("partNumber")) {
            product.setPartNumber((String) requestBody.get("partNumber"));
        }
        if (requestBody.containsKey("compatibility")) {
            product.setCompatibility((String) requestBody.get("compatibility"));
        }
        if (requestBody.containsKey("material")) {
            product.setMaterial((String) requestBody.get("material"));
        }
        if (requestBody.containsKey("price")) {
            Object priceObj = requestBody.get("price");
            if (priceObj instanceof Number) {
                product.setPrice(new BigDecimal(priceObj.toString()));
            }
        }
        if (requestBody.containsKey("stockQuantity")) {
            Object stockObj = requestBody.get("stockQuantity");
            if (stockObj instanceof Number) {
                product.setStockQuantity(((Number) stockObj).intValue());
            }
        }
        if (requestBody.containsKey("description")) {
            product.setDescription((String) requestBody.get("description"));
        }
        if (requestBody.containsKey("imageUrl")) {
            Object imageUrlObj = requestBody.get("imageUrl");
            if (imageUrlObj == null) {
                product.setImageUrl(null);
            } else {
                product.setImageUrl((String) imageUrlObj);
            }
        }
        if (requestBody.containsKey("images")) {
            String imagesJson = (String) requestBody.get("images");
            product.setImages(imagesJson);
        }
        if (requestBody.containsKey("variants")) {
            String variantsJson = (String) requestBody.get("variants");
            System.out.println("Received variants JSON: " + variantsJson);
            product.setVariants(variantsJson);
        }
        if (requestBody.containsKey("isPublished")) {
            product.setIsPublished((Boolean) requestBody.get("isPublished"));
        }
        if (requestBody.containsKey("isFeatured")) {
            product.setIsFeatured((Boolean) requestBody.get("isFeatured"));
        }
        
        return product;
    }
    
    // Helper method to convert ProductRequest to Product
    private Product convertToProduct(ProductRequest request) {
        Product product = new Product();
        product.setName(request.getName());
        product.setBrand(request.getBrand());
        product.setCategory(request.getCategory());
        product.setPartNumber(request.getPartNumber());
        product.setCompatibility(request.getCompatibility());
        product.setMaterial(request.getMaterial());
        product.setPrice(request.getPrice());
        product.setStockQuantity(request.getStockQuantity());
        product.setDescription(request.getDescription());
        product.setImageUrl(request.getImageUrl());
        product.setImages(request.getImages());
        product.setVariants(request.getVariants());
        product.setIsPublished(request.getIsPublished());
        product.setIsFeatured(request.getIsFeatured());
        return product;
    }
    
    // Helper method to extract current user from request body
    private String extractCurrentUserFromRequest(Map<String, Object> requestBody) {
        if (requestBody.containsKey("currentUser")) {
            return (String) requestBody.get("currentUser");
        }
        return null;
    }
}
