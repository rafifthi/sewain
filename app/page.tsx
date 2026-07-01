import { SewainApp } from "@/components/sewain-app";
import { AuthGuard } from "@/components/context/auth-guard";

export default function Home() {
  return (
    <AuthGuard>
      <SewainApp />
    </AuthGuard>
  );
}
