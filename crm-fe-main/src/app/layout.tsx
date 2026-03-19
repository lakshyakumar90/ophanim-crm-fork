import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { DepartmentProvider } from "@/providers/department-context";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SWRProvider } from "@/providers/swr-provider";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CRM - Customer Relationship Management",
  description: "Manage your leads, tasks, and team efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full overflow-hidden">
      <body
        className={`${dmSans.variable} font-sans antialiased h-full overflow-hidden`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="system">
          <AuthProvider>
            <DepartmentProvider>
              <SWRProvider>
                <div className="h-full overflow-hidden">
                  {children}
                  <Toaster duration={8000} />
                </div>
              </SWRProvider>
            </DepartmentProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
