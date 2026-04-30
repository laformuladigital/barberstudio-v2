import { AppLayout } from "./app/layouts/AppLayout";
import { AppRouter } from "./app/router/AppRouter";
import { SessionProvider } from "./app/providers/SessionProvider";

export default function App() {
  return (
    <SessionProvider>
      <AppLayout>
        <AppRouter />
      </AppLayout>
    </SessionProvider>
  );
}

