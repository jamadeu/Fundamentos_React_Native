import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useEffect,
} from 'react';

import AsyncStorage from '@react-native-community/async-storage';
import api from 'src/services/api';
import { Product } from 'src/pages/Cart/styles';

interface Product {
  id: string;
  title: string;
  image_url: string;
  price: number;
  quantity: number;
}

interface CartContext {
  products: Product[];
  addToCart(item: Product): void;
  increment(id: string): void;
  decrement(id: string): void;
}

const CartContext = createContext<CartContext | null>(null);

const CartProvider: React.FC = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function loadProducts(): Promise<void> {
      const [productsLoaded] = await AsyncStorage.multiGet(['Products']);

      if (productsLoaded[1]) {
        setProducts([...products, JSON.parse(productsLoaded[1])]);
      }
    }

    loadProducts();
  }, [products]);

  const addToCart = useCallback(
    async (product: Product) => {
      await api.post('products', product);

      await AsyncStorage.setItem('products', JSON.stringify(product));

      setProducts([...products, product]);
    },
    [products],
  );

  const increment = useCallback(
    async (id: string) => {
      const response = await api.get(`products/${id}`);

      const loadedProduct = response.data;

      if (!loadedProduct) {
        throw new Error('Product not found');
      }

      loadedProduct.quantity += 1;

      await api.put(`products/${id}`, loadedProduct);

      setProducts(
        products.map(product => {
          if (product.id === id) {
            return loadedProduct;
          }
          return product;
        }),
      );
    },
    [products],
  );

  const decrement = useCallback(
    async (id: string) => {
      const response = await api.get(`products/${id}`);

      const loadedProduct = response.data;

      if (!loadedProduct) {
        throw new Error('Product not found');
      }

      loadedProduct.quantity -= 1;

      if (loadedProduct.quantity === 0) {
        await api.delete(`products/${id}`);
        setProducts(products.filter(product => product.id !== id));
      } else {
        await api.put(`products/${id}`, loadedProduct);

        setProducts(
          products.map(product => {
            if (product.id === id) {
              return loadedProduct;
            }
            return product;
          }),
        );
      }
    },
    [products],
  );

  const value = React.useMemo(
    () => ({ addToCart, increment, decrement, products }),
    [products, addToCart, increment, decrement],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

function useCart(): CartContext {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(`useCart must be used within a CartProvider`);
  }

  return context;
}

export { CartProvider, useCart };
