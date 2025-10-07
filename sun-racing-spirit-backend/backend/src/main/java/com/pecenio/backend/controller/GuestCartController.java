package com.pecenio.backend.controller;

import com.pecenio.backend.service.CartService;
import com.pecenio.businessmodel.entity.Cart;
import com.pecenio.businessmodel.entity.CartItem;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/guest/cart")
public class GuestCartController {

    @Autowired
    private CartService cartService;

    @GetMapping("/{sessionId}")
    public ResponseEntity<Cart> getGuestCart(@PathVariable String sessionId) {
        Optional<Cart> cart = cartService.getCartBySessionId(sessionId);
        if (cart.isPresent()) {
            return ResponseEntity.ok(cart.get());
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{sessionId}")
    public ResponseEntity<Cart> createGuestCart(@PathVariable String sessionId) {
        try {
            Cart cart = cartService.createGuestCart(sessionId);
            return ResponseEntity.status(HttpStatus.CREATED).body(cart);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{sessionId}/add-item")
    public ResponseEntity<Cart> addItemToGuestCart(@PathVariable String sessionId, @Valid @RequestBody CartItem cartItem) {
        try {
            Cart cart = cartService.addItemToGuestCart(sessionId, cartItem);
            return ResponseEntity.ok(cart);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/item/{itemId}")
    public ResponseEntity<Cart> updateCartItem(@PathVariable Long itemId, @Valid @RequestBody CartItem cartItem) {
        try {
            Cart cart = cartService.updateCartItem(itemId, cartItem);
            return ResponseEntity.ok(cart);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/item/{itemId}")
    public ResponseEntity<Map<String, Object>> removeCartItem(@PathVariable Long itemId) {
        Map<String, Object> response = new HashMap<>();
        try {
            cartService.removeCartItem(itemId);
            response.put("success", true);
            response.put("message", "Item removed from cart");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", "Item not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    @DeleteMapping("/{sessionId}")
    public ResponseEntity<Map<String, Object>> clearGuestCart(@PathVariable String sessionId) {
        Map<String, Object> response = new HashMap<>();
        try {
            cartService.clearGuestCart(sessionId);
            response.put("success", true);
            response.put("message", "Cart cleared");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to clear cart");
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/{sessionId}/merge-to-user/{userId}")
    public ResponseEntity<Cart> mergeGuestCartToUser(@PathVariable String sessionId, @PathVariable Long userId) {
        try {
            Cart cart = cartService.mergeGuestCartToUser(sessionId, userId);
            if (cart != null) {
                return ResponseEntity.ok(cart);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}