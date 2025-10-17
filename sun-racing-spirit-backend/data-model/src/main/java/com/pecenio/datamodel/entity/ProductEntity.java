package com.pecenio.datamodel.entity;

import com.pecenio.businessmodel.entity.Product;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "products")
public class ProductEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "name", nullable = false, length = 255)
    private String name;
    
    @Column(name = "brand", nullable = false, length = 100)
    private String brand;
    
    @Column(name = "category", nullable = false, length = 100)
    private String category;
    
    @Column(name = "part_number", nullable = false, length = 50)
    private String partNumber;
    
    @Column(name = "compatibility", columnDefinition = "TEXT")
    private String compatibility;
    
    
    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;
    
    @Column(name = "stock_quantity", nullable = false)
    private Integer stockQuantity;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Lob
    @Column(name = "image_url", columnDefinition = "LONGTEXT")
    private String imageUrl;
    
    @Column(name = "images", columnDefinition = "JSON")
    private String images; // JSON array of additional image URLs
    
    @Column(name = "variants", columnDefinition = "JSON")
    private String variants; // JSON array of variant pricing and stock
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    @Column(name = "is_published", nullable = false)
    private Boolean isPublished = true;
    
    @Column(name = "is_featured", nullable = false)
    private Boolean isFeatured = false;
    
    @Column(name = "rating", precision = 3, scale = 2)
    private BigDecimal rating = BigDecimal.ZERO;
    
    @Column(name = "review_count", nullable = false)
    private Integer reviewCount = 0;
    
    @Column(name = "sold_count", nullable = false)
    private Integer soldCount = 0;

    public ProductEntity(Product product) {
        this();
        this.name = product.getName();
        this.brand = product.getBrand();
        this.category = product.getCategory();
        this.partNumber = product.getPartNumber();
        this.compatibility = product.getCompatibility();
        this.price = product.getPrice();
        this.stockQuantity = product.getStockQuantity();
        this.description = product.getDescription();
        this.imageUrl = product.getImageUrl();
        this.isPublished = product.getIsPublished() != null ? product.getIsPublished() : true;
        this.isFeatured = product.getIsFeatured() != null ? product.getIsFeatured() : false;
        this.rating = product.getRating() != null ? product.getRating() : BigDecimal.ZERO;
        this.reviewCount = product.getReviewCount() != null ? product.getReviewCount() : 0;
        this.soldCount = product.getSoldCount() != null ? product.getSoldCount() : 0;
    }

    // Convert to business model
    public Product toBusinessModel() {
        Product product = new Product();
        product.setId(this.id);
        product.setName(this.name);
        product.setBrand(this.brand);
        product.setCategory(this.category);
        product.setPartNumber(this.partNumber);
        product.setCompatibility(this.compatibility);
        product.setPrice(this.price);
        product.setStockQuantity(this.stockQuantity);
        product.setDescription(this.description);
        product.setImageUrl(this.imageUrl);
        product.setImages(this.images);
        product.setVariants(this.variants);
        product.setIsPublished(this.isPublished);
        product.setIsFeatured(this.isFeatured);
        product.setRating(this.rating);
        product.setReviewCount(this.reviewCount);
        product.setSoldCount(this.soldCount);
        product.setCreatedAt(this.createdAt);
        product.setUpdatedAt(this.updatedAt);
        return product;
    }

    // Update from business model
    public void updateFromBusinessModel(Product product) {
        this.name = product.getName();
        this.brand = product.getBrand();
        this.category = product.getCategory();
        this.partNumber = product.getPartNumber();
        this.compatibility = product.getCompatibility();
        this.price = product.getPrice();
        this.stockQuantity = product.getStockQuantity();
        this.description = product.getDescription();
        this.imageUrl = product.getImageUrl();
        this.images = product.getImages();
        this.variants = product.getVariants();
        this.isPublished = product.getIsPublished() != null ? product.getIsPublished() : true;
        this.isFeatured = product.getIsFeatured() != null ? product.getIsFeatured() : false;
        this.rating = product.getRating() != null ? product.getRating() : BigDecimal.ZERO;
        this.reviewCount = product.getReviewCount() != null ? product.getReviewCount() : 0;
        // Preserve existing sold count if not provided in update
        this.soldCount = product.getSoldCount() != null ? product.getSoldCount() : this.soldCount;
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
