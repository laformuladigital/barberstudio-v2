import { Navigate, Route, Routes } from "react-router-dom";
import AdminPage from "../../features/admin/AdminPage";
import LoginPage from "../../features/auth/LoginPage";
import ResetPasswordPage from "../../features/auth/ResetPasswordPage";
import BarberPage from "../../features/barber/BarberPage";
import BookingPage from "../../features/booking/BookingPage";
import ClientPage from "../../features/client/ClientPage";
import HomePage from "../../features/home/HomePage";
import { RoleRoute } from "../../lib/guards";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/reservar" element={<BookingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/cliente"
        element={
          <RoleRoute allow={["cliente", "admin"]}>
            <ClientPage />
          </RoleRoute>
        }
      />
      <Route
        path="/barbero"
        element={
          <RoleRoute allow={["barbero", "admin"]}>
            <BarberPage />
          </RoleRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <RoleRoute allow={["admin"]}>
            <AdminPage />
          </RoleRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
