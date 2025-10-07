package com.pecenio.backend.controller;

import com.pecenio.backend.service.CartService;
import com.pecenio.businessmodel.entity.Cart;
import com.pecenio.businessmodel.entity.CartItem;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartService cartService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<Cart> getCartByUserId(@PathVariable Long userId) {
        Optional<Cart> cart = cartService.getCartByUserId(userId);
        if (cart.isPresent()) {
            return ResponseEntity.ok(cart.get());
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/user/{userId}")
    public ResponseEntity<Cart> createCart(@PathVariable Long userId) {
        try {
            Cart cart = cartService.createCart(userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(cart);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/user/{userId}/add-item")
    public ResponseEntity<Cart> addItemToCart(@PathVariable Long userId, @Valid @RequestBody CartItem cartItem) {
        try {
            Cart cart = cartService.addItemToCart(userId, cartItem);
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
    public ResponseEntity<Cart> removeCartItem(@PathVariable Long itemId) {
        try {
            Cart cart = cartService.removeCartItem(itemId);
            return ResponseEntity.ok(cart);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/user/{userId}")
    public ResponseEntity<Void> clearCart(@PathVariable Long userId) {
        try {
            cartService.clearCart(userId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
