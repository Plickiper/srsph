package com.pecenio.backend.controller;

import com.pecenio.backend.service.ProductService;
import com.pecenio.backend.service.AuditLogService;
import com.pecenio.backend.service.JwtService;
import com.pecenio.backend.util.JwtAuthUtil;
import com.pecenio.backend.dto.ProductRequest;
import com.pecenio.backend.util.ApiResponseUtil;
import com.pecenio.businessmodel.entity.Product;
import com.pecenio.businessmodel.entity.AuditLog;
import com.pecenio.datamodel.entity.UserEntity;
import com.pecenio.datamodel.repository.UserRepository;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private static final Logger logger = LoggerFactory.getLogger(ProductController.class);

    @Autowired
    private ProductService productService;
    
    @Autowired
    private AuditLogService auditLogService;
    
    @Autowired
    private JwtAuthUtil jwtAuthUtil;
    
    @Autowired
    private JwtService jwtService;
    
    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllProducts() {
        logger.info("🛍️ GET /api/products - Fetching products");
        try {
            List<Product> products = productService.getAllProducts();
            logger.info("✅ Found {} products", products.size());
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
    

    @PostMapping
    public ResponseEntity<Map<String, Object>> createProduct(@Valid @RequestBody ProductRequest productRequest, HttpServletRequest request) {
        try {
            // Convert DTO to entity
            Product product = convertToProduct(productRequest);
            
            Product createdProduct = productService.createProduct(product);
            
            // Log the product creation
            try {
                UserEntity currentAdmin = getCurrentAdminUser(request);
                if (currentAdmin != null) {
                    auditLogService.logAction(
                        currentAdmin.getId(),
                        currentAdmin.getFirstName() + " " + currentAdmin.getLastName(),
                        currentAdmin.getEmail(),
                        "CREATE_PRODUCT",
                        "PRODUCT",
                        createdProduct.getId(),
                        createdProduct.getName(),
                        "Product '" + createdProduct.getName() + "' was created by " + currentAdmin.getFirstName() + " " + currentAdmin.getLastName(),
                        getClientIpAddress(request),
                        request.getHeader("User-Agent"),
                        AuditLog.ActionType.CREATE,
                        AuditLog.Severity.MEDIUM
                    );
                } else {
                    // Fallback to default admin if no user found
                    auditLogService.logAction(
                        1L,
                        "Admin",
                        "admin@sunracing.com",
                        "CREATE_PRODUCT",
                        "PRODUCT",
                        createdProduct.getId(),
                        createdProduct.getName(),
                        "Product '" + createdProduct.getName() + "' was created by Admin",
                        getClientIpAddress(request),
                        request.getHeader("User-Agent"),
                        AuditLog.ActionType.CREATE,
                        AuditLog.Severity.MEDIUM
                    );
                }
            } catch (Exception e) {
                logger.warn("Failed to log product creation audit: {}", e.getMessage());
            }
            
            return ApiResponseUtil.created(createdProduct, "Product created successfully");
        } catch (Exception e) {
            return ApiResponseUtil.error("Failed to create product: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateProduct(@PathVariable Long id, @RequestBody Map<String, Object> requestBody, HttpServletRequest request) {
        try {
            
            // Extract product information from request
            Product product = extractProductFromRequest(requestBody);
            
            
            Product updatedProduct = productService.updateProduct(id, product);
            
            // Log the product update
            try {
                UserEntity currentAdmin = getCurrentAdminUser(request);
                if (currentAdmin != null) {
                    auditLogService.logAction(
                        currentAdmin.getId(),
                        currentAdmin.getFirstName() + " " + currentAdmin.getLastName(),
                        currentAdmin.getEmail(),
                        "UPDATE_PRODUCT",
                        "PRODUCT",
                        updatedProduct.getId(),
                        updatedProduct.getName(),
                        "Product '" + updatedProduct.getName() + "' was updated by " + currentAdmin.getFirstName() + " " + currentAdmin.getLastName(),
                        getClientIpAddress(request),
                        request.getHeader("User-Agent"),
                        AuditLog.ActionType.UPDATE,
                        AuditLog.Severity.MEDIUM
                    );
                } else {
                    // Fallback to default admin if no user found
                    auditLogService.logAction(
                        1L,
                        "Admin",
                        "admin@sunracing.com",
                        "UPDATE_PRODUCT",
                        "PRODUCT",
                        updatedProduct.getId(),
                        updatedProduct.getName(),
                        "Product '" + updatedProduct.getName() + "' was updated by Admin",
                        getClientIpAddress(request),
                        request.getHeader("User-Agent"),
                        AuditLog.ActionType.UPDATE,
                        AuditLog.Severity.MEDIUM
                    );
                }
            } catch (Exception e) {
                logger.warn("Failed to log product update audit: {}", e.getMessage());
            }
            
            
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
            
            // Product deletion will be logged with current admin user from JWT token
            
            
            productService.deleteProduct(id);
            
            // Log the product deletion
            try {
                UserEntity currentAdmin = getCurrentAdminUser(request);
                if (currentAdmin != null) {
                    auditLogService.logAction(
                        currentAdmin.getId(),
                        currentAdmin.getFirstName() + " " + currentAdmin.getLastName(),
                        currentAdmin.getEmail(),
                        "DELETE_PRODUCT",
                        "PRODUCT",
                        id,
                        productName,
                        "Product '" + productName + "' was deleted by " + currentAdmin.getFirstName() + " " + currentAdmin.getLastName(),
                        getClientIpAddress(request),
                        request.getHeader("User-Agent"),
                        AuditLog.ActionType.DELETE,
                        AuditLog.Severity.HIGH
                    );
                } else {
                    // Fallback to default admin if no user found
                    auditLogService.logAction(
                        1L,
                        "Admin",
                        "admin@sunracing.com",
                        "DELETE_PRODUCT",
                        "PRODUCT",
                        id,
                        productName,
                        "Product '" + productName + "' was deleted by Admin",
                        getClientIpAddress(request),
                        request.getHeader("User-Agent"),
                        AuditLog.ActionType.DELETE,
                        AuditLog.Severity.HIGH
                    );
                }
            } catch (Exception e) {
                logger.warn("Failed to log product deletion audit: {}", e.getMessage());
            }
            
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
    
    
    // Helper method to get current admin user from JWT token
    private UserEntity getCurrentAdminUser(HttpServletRequest request) {
        try {
            String token = jwtAuthUtil.extractTokenFromRequest(request);
            logger.info("🔍 ProductController - Token extracted: {}", token != null ? "YES" : "NO");
            
            if (token != null && jwtAuthUtil.isTokenValid(token)) {
                String username = jwtService.extractUsername(token);
                logger.info("🔍 ProductController - Username extracted: {}", username);
                
                UserEntity user = userRepository.findByUsername(username).orElse(null);
                if (user != null) {
                    logger.info("🔍 ProductController - User found: {} {} ({})", user.getFirstName(), user.getLastName(), user.getRole());
                } else {
                    logger.warn("🔍 ProductController - User not found for username: {}", username);
                }
                return user;
            } else {
                logger.warn("🔍 ProductController - Token is null or invalid");
            }
        } catch (Exception e) {
            logger.warn("Failed to extract admin user from token: {}", e.getMessage());
        }
        return null;
    }
}
