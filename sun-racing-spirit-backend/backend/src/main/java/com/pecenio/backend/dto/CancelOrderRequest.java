package com.pecenio.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CancelOrderRequest {
    
    @NotNull(message = "Order ID is required")
    private Long orderId;
    
    @NotBlank(message = "Cancellation reason is required")
    private String reason;
    
    // Predefined cancellation reasons
    public enum CancellationReason {
        CHANGED_MIND("Changed my mind"),
        FOUND_BETTER_PRICE("Found a better price elsewhere"),
        NO_LONGER_NEEDED("No longer needed"),
        WRONG_ITEM("Ordered wrong item"),
        DELIVERY_ISSUES("Delivery issues"),
        PAYMENT_PROBLEMS("Payment problems"),
        OTHER("Other");
        
        private final String displayName;
        
        CancellationReason(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
}


