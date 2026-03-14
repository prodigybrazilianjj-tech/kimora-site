import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export type CartItem = {
  id: string; // `${flavor}-${type}`
  flavor: string;
  type: "onetime" | "subscribe";
  price: number;
  quantity: number;
  frequency?: string; // for subscriptions
  image: string;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  cartCount: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

function normalizeCartItem(raw: any): CartItem | null {
  const id = String(raw?.id ?? "").trim();
  const flavor = String(raw?.flavor ?? "").trim();
  const type: CartItem["type"] = raw?.type === "subscribe" ? "subscribe" : "onetime";
  const price = Number(raw?.price);
  const quantityRaw = Number(raw?.quantity);
  const quantity = Number.isFinite(quantityRaw) ? Math.max(1, Math.floor(quantityRaw)) : 1;
  const frequency =
    raw?.frequency == null || raw?.frequency === "" ? undefined : String(raw.frequency);
  const image = String(raw?.image ?? "").trim();

  if (!id || !flavor || !Number.isFinite(price)) return null;

  return {
    id,
    flavor,
    type,
    price,
    quantity,
    frequency,
    image,
  };
}

function readStoredCart(): CartItem[] {
  try {
    const savedCart = localStorage.getItem("kimora-cart");
    if (!savedCart) return [];

    const parsed = JSON.parse(savedCart);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeCartItem)
      .filter((item): item is CartItem => Boolean(item));
  } catch (e) {
    console.error("Failed to parse cart", e);
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { toast } = useToast();

  // Load from localStorage on mount
  useEffect(() => {
    setItems(readStoredCart());
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("kimora-cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (newItem: CartItem) => {
    const normalized = normalizeCartItem(newItem);
    if (!normalized) return;

    setItems((prev) => {
      const existing = prev.find((i) => i.id === normalized.id);

      if (existing) {
        return prev.map((i) =>
          i.id === normalized.id
            ? { ...i, quantity: Math.max(1, i.quantity + normalized.quantity) }
            : i
        );
      }

      return [...prev, normalized];
    });

    toast({
      title: "Added to cart",
      description: `${normalized.quantity}x ${normalized.flavor} added.`,
    });
  };

  const removeFromCart = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    const safeDelta = Number.isFinite(delta) ? Math.trunc(delta) : 0;
    if (!safeDelta) return;

    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const newQty = Math.max(1, i.quantity + safeDelta);
          return { ...i, quantity: newQty };
        }
        return i;
      })
    );
  };

  const setQuantity = (id: string, quantity: number) => {
    const safeQty = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;

    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          return { ...i, quantity: safeQty };
        }
        return i;
      })
    );
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        setQuantity,
        clearCart,
        subtotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}