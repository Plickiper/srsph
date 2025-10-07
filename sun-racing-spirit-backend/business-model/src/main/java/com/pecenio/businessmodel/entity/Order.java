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
public class Order {
    
    private Long id;
    
    @NotNull(message = "User is required")
    private User user;
    
    @NotNull(message = "Total price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Total price must be greater than 0")
    @Digits(integer = 10, fraction = 2, message = "Total price must have at most 10 integer digits and 2 decimal places")
    private BigDecimal totalPrice;
    
    @NotBlank(message = "Status is required")
    @Pattern(regexp = "^(PENDING|CONFIRMED|SHIPPED|DELIVERED|CANCELLED)$", 
             message = "Status must be PENDING, CONFIRMED, SHIPPED, DELIVERED, or CANCELLED")
    private String status;
    
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    private List<OrderItem> orderItems;
    
    // Recipient information
    private String recipientName;
    private String recipientPhone;
    private String deliveryAddress;
    
    // Payment method
    private String paymentMethod;
    
    // Proof images
    private String waybillProofUrl;
    private String deliveryProofUrl;
}
