import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AuthProvider } from "./context/ContextApiProvider";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "./providers/QueryProvider";

export const metadata: Metadata = {
  title: "Flowfoundry - Project Management",
  description: "Plan projects, track tasks, and keep teams aligned.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <QueryProvider>
              <Navbar />
              {children}
              <Toaster />
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

