package com.pecenio.backend.controller;

import com.pecenio.datamodel.entity.CartEntity;
import com.pecenio.datamodel.repository.CartRepository;
import com.pecenio.backend.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/debug")
public class DebugController {

    @Autowired
    private CartRepository cartRepository;
    
    @Autowired
    private CartService cartService;

    @GetMapping("/test-guest-cart")
    public ResponseEntity<Map<String, Object>> testGuestCart() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Try to create a test guest cart
            CartEntity testCart = new CartEntity();
            testCart.setSessionId("test_session_debug");
            testCart.setTotalPrice(java.math.BigDecimal.ZERO);
            testCart.setTotalQuantity(0);
            
            CartEntity savedCart = cartRepository.save(testCart);
            
            response.put("success", true);
            response.put("message", "Guest cart created successfully");
            response.put("cartId", savedCart.getId());
            response.put("sessionId", savedCart.getSessionId());
            
            // Clean up
            cartRepository.delete(savedCart);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error creating guest cart: " + e.getMessage());
            response.put("error", e.getClass().getSimpleName());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/test-add-item")
    public ResponseEntity<Map<String, Object>> testAddItem(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String sessionId = (String) request.get("sessionId");
            Long productId = Long.valueOf(request.get("productId").toString());
            Integer quantity = Integer.valueOf(request.get("quantity").toString());
            java.math.BigDecimal price = new java.math.BigDecimal(request.get("price").toString());
            String compatibility = (String) request.get("compatibility");
            
            // Create cart item
            com.pecenio.businessmodel.entity.CartItem cartItem = new com.pecenio.businessmodel.entity.CartItem();
            cartItem.setProductId(productId);
            cartItem.setQuantity(quantity);
            cartItem.setPrice(price);
            cartItem.setCompatibility(compatibility);
            cartItem.setCartId(0L); // Will be set by the service
            
            // Use the cart service
            com.pecenio.businessmodel.entity.Cart cart = cartService.addItemToGuestCart(sessionId, cartItem);
            
            response.put("success", true);
            response.put("message", "Item added successfully");
            response.put("cart", cart);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error adding item: " + e.getMessage());
            response.put("error", e.getClass().getSimpleName());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(response);
        }
    }
}