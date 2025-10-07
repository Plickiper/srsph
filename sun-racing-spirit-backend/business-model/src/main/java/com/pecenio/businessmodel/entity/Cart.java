package com.pecenio.businessmodel.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class Cart {
    
    private Long id;
    
    @NotNull(message = "User ID is required")
    private Long userId;
    
    private String sessionId;
    
    private List<CartItem> items;
    
    @DecimalMin(value = "0.0", message = "Total price must not be negative")
    private BigDecimal totalPrice = BigDecimal.ZERO;
    
    @Min(value = 0, message = "Total quantity must not be negative")
    private Integer totalQuantity = 0;
    
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    // Helper methods
    public void calculateTotals() {
        if (items != null && !items.isEmpty()) {
            this.totalQuantity = items.stream()
                .mapToInt(CartItem::getQuantity)
                .sum();
            
            this.totalPrice = items.stream()
                .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        } else {
            this.totalQuantity = 0;
            this.totalPrice = BigDecimal.ZERO;
        }
    }
}