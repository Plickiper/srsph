package com.pecenio.backend.service;

import com.pecenio.businessmodel.entity.Product;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ProductService {
    
    List<Product> getAllProducts();
    
    Optional<Product> getProductById(Long id);
    
    Product createProduct(Product product);
    
    Product updateProduct(Long id, Product product);
    
    void deleteProduct(Long id);
    
    List<Product> getProductsByBrand(String brand);
    
    List<Product> getProductsByCategory(String category);
    
    List<Product> searchProducts(String search, String brand, String category, BigDecimal minPrice, 
                                 BigDecimal maxPrice, Integer minStock);
    
    List<String> getAllBrands();
    
    List<String> getAllCategories();
    
    boolean existsById(Long id);
    
    // Featured products methods
    List<Product> getFeaturedProducts();
    
    long getFeaturedProductsCount();
    
    // New arrivals methods
    List<Product> getNewArrivals();
    
    long getNewArrivalsCount();
    
    // Business logic for managing featured products and new arrivals
    Product setFeaturedProduct(Long productId, boolean isFeatured);
    
    void enforceFeaturedProductsLimit();
    
    void enforceNewArrivalsLimit();
    
    // Get products updated since a specific timestamp
    List<Product> getProductsUpdatedSince(String timestamp);
}
