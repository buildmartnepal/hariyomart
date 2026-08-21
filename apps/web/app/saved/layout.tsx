import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Saved products | Hariyo Mart Nepal",
  robots: { index: false, follow: false },
};

export default function UtilityLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
