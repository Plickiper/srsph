package com.pecenio.datamodel.entity;

import com.pecenio.businessmodel.entity.CartItem;
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
@Table(name = "cart_items")
public class CartItemEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "cart_id", nullable = false)
    private Long cartId;
    
    @Column(name = "product_id", nullable = false)
    private Long productId;
    
    @Column(name = "quantity", nullable = false)
    private Integer quantity;
    
    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;
    
    @Column(name = "compatibility", columnDefinition = "TEXT")
    private String compatibility;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public CartItemEntity(CartItem cartItem) {
        this();
        this.cartId = cartItem.getCartId();
        this.productId = cartItem.getProductId();
        this.quantity = cartItem.getQuantity();
        this.price = cartItem.getPrice();
        this.compatibility = cartItem.getCompatibility();
    }

    // Convert to business model
    public CartItem toBusinessModel() {
        CartItem cartItem = new CartItem();
        cartItem.setId(this.id);
        cartItem.setCartId(this.cartId);
        cartItem.setProductId(this.productId);
        cartItem.setQuantity(this.quantity);
        cartItem.setPrice(this.price);
        cartItem.setCompatibility(this.compatibility);
        cartItem.setCreatedAt(this.createdAt);
        cartItem.setUpdatedAt(this.updatedAt);
        return cartItem;
    }

    // Update from business model
    public void updateFromBusinessModel(CartItem cartItem) {
        this.cartId = cartItem.getCartId();
        this.productId = cartItem.getProductId();
        this.quantity = cartItem.getQuantity();
        this.price = cartItem.getPrice();
        this.compatibility = cartItem.getCompatibility();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
