import AuthGate from "../../components/AuthGate";

export const instant = false;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}