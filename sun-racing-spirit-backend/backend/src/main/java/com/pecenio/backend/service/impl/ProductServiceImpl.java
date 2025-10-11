package com.pecenio.backend.service.impl;

import com.pecenio.backend.service.ProductService;
import com.pecenio.businessmodel.entity.Product;
import com.pecenio.datamodel.entity.ProductEntity;
import com.pecenio.datamodel.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductServiceImpl implements ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Product> getAllProducts() {
        List<ProductEntity> entities = productRepository.findAll();
        return entities.stream()
                .map(ProductEntity::toBusinessModel)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Product> getProductById(Long id) {
        return productRepository.findById(id)
                .map(ProductEntity::toBusinessModel);
    }

    @Override
    public Product createProduct(Product product) {
        ProductEntity entity = new ProductEntity(product);
        ProductEntity savedEntity = productRepository.save(entity);
        return savedEntity.toBusinessModel();
    }

    @Override
    public Product updateProduct(Long id, Product product) {
        Optional<ProductEntity> existingEntity = productRepository.findById(id);
        if (existingEntity.isPresent()) {
            ProductEntity entity = existingEntity.get();
            entity.updateFromBusinessModel(product);
            ProductEntity savedEntity = productRepository.save(entity);
            return savedEntity.toBusinessModel();
        }
        throw new RuntimeException("Product not found with id: " + id);
    }

    @Override
    public void deleteProduct(Long id) {
        if (productRepository.existsById(id)) {
            productRepository.deleteById(id);
        } else {
            throw new RuntimeException("Product not found with id: " + id);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<Product> getProductsByBrand(String brand) {
        List<ProductEntity> entities = productRepository.findByBrand(brand);
        return entities.stream()
                .map(ProductEntity::toBusinessModel)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<Product> getProductsByCategory(String category) {
        List<ProductEntity> entities = productRepository.findByCategory(category);
        return entities.stream()
                .map(ProductEntity::toBusinessModel)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<Product> searchProducts(String search, String brand, String category, BigDecimal minPrice, 
                                       BigDecimal maxPrice, Integer minStock) {
        // Get all products first, then filter by brand using variant-based logic
        List<ProductEntity> entities = productRepository.findWithFilters(null, category, minPrice, maxPrice, minStock);
        
        return entities.stream()
                .map(ProductEntity::toBusinessModel)
                .filter(product -> matchesBrandFilter(product, brand))
                .filter(product -> matchesSearchFilter(product, search))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getAllBrands() {
        // Return only Yamaha and Honda based on variant analysis
        return Arrays.asList("Yamaha", "Honda");
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getAllCategories() {
        return productRepository.findAllCategories();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(Long id) {
        return productRepository.existsById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Product> getFeaturedProducts() {
        List<ProductEntity> entities = productRepository.findByIsFeaturedTrueAndIsPublishedTrueOrderByUpdatedAtDesc();
        return entities.stream()
                .map(ProductEntity::toBusinessModel)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long getFeaturedProductsCount() {
        return productRepository.countFeaturedProducts();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Product> getNewArrivals() {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        List<ProductEntity> entities = productRepository.findNewArrivals(thirtyDaysAgo);
        return entities.stream()
                .map(ProductEntity::toBusinessModel)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long getNewArrivalsCount() {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        return productRepository.countNewArrivals(thirtyDaysAgo);
    }

    @Override
    @Transactional
    public Product setFeaturedProduct(Long productId, boolean isFeatured) {
        Optional<ProductEntity> existingEntity = productRepository.findById(productId);
        if (existingEntity.isPresent()) {
            ProductEntity entity = existingEntity.get();
            entity.setIsFeatured(isFeatured);
            entity.setUpdatedAt(LocalDateTime.now());
            
            // Enforce the 5 featured products limit
            if (isFeatured) {
                enforceFeaturedProductsLimit();
            }
            
            ProductEntity savedEntity = productRepository.save(entity);
            return savedEntity.toBusinessModel();
        }
        throw new RuntimeException("Product not found with id: " + productId);
    }

    @Override
    @Transactional
    public void enforceFeaturedProductsLimit() {
        long featuredCount = productRepository.countFeaturedProducts();
        if (featuredCount > 5) {
            // Get all featured products ordered by updatedAt (oldest first)
            List<ProductEntity> featuredProducts = productRepository.findByIsFeaturedTrueAndIsPublishedTrueOrderByUpdatedAtDesc();
            
            // Remove featured status from the oldest products to keep only 5
            for (int i = 5; i < featuredProducts.size(); i++) {
                ProductEntity entity = featuredProducts.get(i);
                entity.setIsFeatured(false);
                entity.setUpdatedAt(LocalDateTime.now());
                productRepository.save(entity);
            }
        }
    }

    @Override
    @Transactional
    public void enforceNewArrivalsLimit() {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        long newArrivalsCount = productRepository.countNewArrivals(thirtyDaysAgo);
        
        if (newArrivalsCount > 5) {
            // The system will naturally handle this with FIFO since we only show the 5 most recent
            // in the frontend, but we can add additional logic here if needed
        }
    }

    // Helper method to extract brand from product variants, name, and compatibility
    private String extractBrandFromVariants(Product product) {
        
        // First, check the product name for brand indicators
        String productName = product.getName().toLowerCase();
        if (productName.contains("yamaha") || productName.contains("mio") || productName.contains("aerox") || productName.contains("nmax")) {
            return "Yamaha";
        } else if (productName.contains("honda") || productName.contains("click") || productName.contains("pcx") || productName.contains("beat")) {
            return "Honda";
        }
        
        // Check compatibility field
        if (product.getCompatibility() != null) {
            String compatibility = product.getCompatibility().toLowerCase();
            if (compatibility.contains("yamaha") || compatibility.contains("mio") || compatibility.contains("aerox") || compatibility.contains("nmax")) {
                return "Yamaha";
            } else if (compatibility.contains("honda") || compatibility.contains("click") || compatibility.contains("pcx") || compatibility.contains("beat")) {
                return "Honda";
            }
        }
        
        // Then check variants if they exist
        if (product.getVariants() != null && !product.getVariants().isEmpty()) {
            try {
                ObjectMapper objectMapper = new ObjectMapper();
                List<Map<String, Object>> variants = objectMapper.readValue(
                    product.getVariants(), 
                    new TypeReference<List<Map<String, Object>>>() {}
                );


                // Extract brands from variant models
                Set<String> brands = new HashSet<>();
                for (Map<String, Object> variant : variants) {
                    String model = (String) variant.get("model");
                    if (model != null) {
                        String modelLower = model.toLowerCase();
                        // Check if model contains Yamaha or Honda
                        if (modelLower.contains("yamaha") || modelLower.contains("mio") || modelLower.contains("aerox") || modelLower.contains("nmax")) {
                            brands.add("Yamaha");
                        } else if (modelLower.contains("honda") || modelLower.contains("click") || modelLower.contains("pcx") || modelLower.contains("beat")) {
                            brands.add("Honda");
                        }
                    }
                }

                // Return the first brand found
                if (!brands.isEmpty()) {
                    String extractedBrand = brands.iterator().next();
                    return extractedBrand;
                }
            } catch (Exception e) {
                System.err.println("Error parsing variants for brand extraction: " + e.getMessage());
            }
        } else {
        }

        return product.getBrand(); // Fallback to existing brand field
    }

    // Helper method to check if product matches brand filter based on variants
    private boolean matchesBrandFilter(Product product, String brandFilter) {
        
        if (brandFilter == null || brandFilter.isEmpty()) {
            return true;
        }

        String extractedBrand = extractBrandFromVariants(product);
        boolean matches = brandFilter.equalsIgnoreCase(extractedBrand);
        return matches;
    }

    // Helper method to check if product matches search filter
    private boolean matchesSearchFilter(Product product, String searchFilter) {
        if (searchFilter == null || searchFilter.trim().isEmpty()) {
            return true;
        }

        String searchTerm = searchFilter.toLowerCase().trim();
        String productName = product.getName().toLowerCase();
        String productDescription = product.getDescription() != null ? product.getDescription().toLowerCase() : "";
        String productBrand = product.getBrand() != null ? product.getBrand().toLowerCase() : "";
        String productCategory = product.getCategory() != null ? product.getCategory().toLowerCase() : "";

        // Use word boundaries for more accurate matching
        // Check for exact word matches first, then partial matches
        boolean exactMatch = productName.equals(searchTerm) ||
                           productBrand.equals(searchTerm) ||
                           productCategory.equals(searchTerm);
        
        if (exactMatch) {
            return true;
        }

        // Check for word boundary matches (more accurate than contains)
        boolean wordBoundaryMatch = hasWordBoundaryMatch(productName, searchTerm) ||
                                  hasWordBoundaryMatch(productDescription, searchTerm) ||
                                  hasWordBoundaryMatch(productBrand, searchTerm) ||
                                  hasWordBoundaryMatch(productCategory, searchTerm);
        
        if (wordBoundaryMatch) {
            return true;
        }

        // Fallback to contains for very short search terms (2 characters or less)
        if (searchTerm.length() <= 2) {
            return productName.contains(searchTerm) ||
                   productDescription.contains(searchTerm) ||
                   productBrand.contains(searchTerm) ||
                   productCategory.contains(searchTerm);
        }

        return false;
    }

    // Helper method to check for word boundary matches
    private boolean hasWordBoundaryMatch(String text, String searchTerm) {
        if (text == null || text.isEmpty()) {
            return false;
        }
        
        // Use word boundaries for more accurate matching
        // This prevents "cvt" from matching "center" or other partial words
        String pattern = "\\b" + java.util.regex.Pattern.quote(searchTerm) + "\\b";
        return text.matches(".*" + pattern + ".*");
    }

    @Override
    public List<Product> getProductsUpdatedSince(String timestamp) {
        try {
            // URL decode the timestamp first
            String decodedTimestamp = java.net.URLDecoder.decode(timestamp, "UTF-8");
            
            // Parse the timestamp - handle both ISO format with Z and without
            LocalDateTime sinceTime;
            if (decodedTimestamp.endsWith("Z")) {
                // Remove Z and parse as LocalDateTime
                String withoutZ = decodedTimestamp.substring(0, decodedTimestamp.length() - 1);
                sinceTime = LocalDateTime.parse(withoutZ);
            } else {
                sinceTime = LocalDateTime.parse(decodedTimestamp);
            }
            
            // Get all products and filter by updatedAt
            List<ProductEntity> entities = productRepository.findAll();
            return entities.stream()
                    .filter(entity -> entity.getUpdatedAt().isAfter(sinceTime))
                    .map(ProductEntity::toBusinessModel)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            System.err.println("Error getting products updated since " + timestamp + ": " + e.getMessage());
            return new ArrayList<>();
        }
    }
}
