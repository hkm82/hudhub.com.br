import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Product from "@/pages/Product";
import Cart from "@/pages/Cart";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Checkout from "@/pages/Checkout";
import OrderConfirmation from "@/pages/OrderConfirmation";
import Account from "@/pages/Account";
import Admin from "@/pages/Admin";

function App() {
  return (
    <div className="App grain bg-[#050505] min-h-screen text-white">
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Header />
            <main className="relative z-10">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/produto/:id" element={<Product />} />
                <Route path="/carrinho" element={<Cart />} />
                <Route path="/login" element={<Login />} />
                <Route path="/cadastro" element={<Register />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/pedido-confirmado/:id" element={<OrderConfirmation />} />
                <Route path="/minha-conta" element={<Account />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
            <Toaster theme="dark" position="top-right" richColors />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
