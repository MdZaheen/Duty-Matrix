import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./test.css";  // Using the test.css file we created earlier

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CIE Room Allocation System",
  description: "Manage professor duty allocation and student room allocation for CIE exams",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
