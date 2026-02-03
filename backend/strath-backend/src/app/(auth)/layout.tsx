import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strathspace - Sign In",
  description: "Sign in to Strathspace and connect with students at your university",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
