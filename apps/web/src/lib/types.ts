export type AppRole = "cliente" | "barbero" | "admin";

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type BlockStatus = "pending" | "approved" | "rejected";

export type Service = {
  id: string;
  location_id?: string | null;
  name: string;
  description: string | null;
  duration_min: number;
  buffer_min: number;
  price_cents: number;
  active: boolean;
  order_index: number;
};

export type Barber = {
  id: string;
  location_id?: string | null;
  user_id: string | null;
  display_name: string;
  bio: string | null;
  specialties: string[];
  rating: number;
  is_active: boolean;
};
