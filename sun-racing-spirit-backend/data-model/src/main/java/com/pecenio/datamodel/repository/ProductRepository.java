package com.pecenio.datamodel.repository;

import com.pecenio.datamodel.entity.ProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<ProductEntity, Long> {
    
    List<ProductEntity> findByBrand(String brand);
    
    List<ProductEntity> findByCategory(String category);
    
    List<ProductEntity> findByBrandAndCategory(String brand, String category);
    
    List<ProductEntity> findByPriceBetween(BigDecimal minPrice, BigDecimal maxPrice);
    
    List<ProductEntity> findByStockQuantityGreaterThan(Integer minStock);
    
    List<ProductEntity> findByNameContainingIgnoreCase(String name);
    
    @Query("SELECT p FROM ProductEntity p WHERE " +
           "(:brand IS NULL OR p.brand = :brand) AND " +
           "(:category IS NULL OR p.category = :category) AND " +
           "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR p.price <= :maxPrice) AND " +
           "(:minStock IS NULL OR p.stockQuantity >= :minStock)")
    List<ProductEntity> findWithFilters(
            @Param("brand") String brand,
            @Param("category") String category,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("minStock") Integer minStock
    );
    
    @Query("SELECT DISTINCT p.brand FROM ProductEntity p ORDER BY p.brand")
    List<String> findAllBrands();
    
    @Query("SELECT DISTINCT p.category FROM ProductEntity p ORDER BY p.category")
    List<String> findAllCategories();
    
    // Featured products methods
    List<ProductEntity> findByIsFeaturedTrueAndIsPublishedTrueOrderByUpdatedAtDesc();
    
    @Query("SELECT COUNT(p) FROM ProductEntity p WHERE p.isFeatured = true AND p.isPublished = true")
    long countFeaturedProducts();
    
    // New arrivals methods (products created in the last 30 days)
    @Query("SELECT p FROM ProductEntity p WHERE p.isPublished = true AND p.createdAt >= :thirtyDaysAgo ORDER BY p.createdAt DESC")
    List<ProductEntity> findNewArrivals(@Param("thirtyDaysAgo") java.time.LocalDateTime thirtyDaysAgo);
    
    @Query("SELECT COUNT(p) FROM ProductEntity p WHERE p.isPublished = true AND p.createdAt >= :thirtyDaysAgo")
    long countNewArrivals(@Param("thirtyDaysAgo") java.time.LocalDateTime thirtyDaysAgo);
}
