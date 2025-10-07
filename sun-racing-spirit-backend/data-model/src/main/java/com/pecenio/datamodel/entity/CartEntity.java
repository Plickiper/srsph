package com.pecenio.datamodel.entity;

import com.pecenio.businessmodel.entity.Cart;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "carts")
public class CartEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id")
    private Long userId;
    
    @Column(name = "session_id", length = 255)
    private String sessionId;
    
    @OneToMany(mappedBy = "cartId", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<CartItemEntity> items;
    
    @Column(name = "total_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPrice = BigDecimal.ZERO;
    
    @Column(name = "total_quantity", nullable = false)
    private Integer totalQuantity = 0;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public CartEntity(Cart cart) {
        this();
        this.userId = cart.getUserId();
        this.sessionId = cart.getSessionId();
        this.totalPrice = cart.getTotalPrice();
        this.totalQuantity = cart.getTotalQuantity();
    }

    // Convert to business model
    public Cart toBusinessModel() {
        Cart cart = new Cart();
        cart.setId(this.id);
        cart.setUserId(this.userId);
        cart.setSessionId(this.sessionId);
        cart.setTotalPrice(this.totalPrice);
        cart.setTotalQuantity(this.totalQuantity);
        cart.setCreatedAt(this.createdAt);
        cart.setUpdatedAt(this.updatedAt);
        
        // Convert cart items if they exist
        if (this.items != null) {
            cart.setItems(this.items.stream()
                .map(CartItemEntity::toBusinessModel)
                .toList());
        }
        
        return cart;
    }

    // Update from business model
    public void updateFromBusinessModel(Cart cart) {
        this.userId = cart.getUserId();
        this.sessionId = cart.getSessionId();
        this.totalPrice = cart.getTotalPrice();
        this.totalQuantity = cart.getTotalQuantity();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}