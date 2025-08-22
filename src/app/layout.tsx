import React from 'react'
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
    variable: "--font-poppins",
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700", "900"],
});

export const metadata: Metadata = {
    title: "💡 Lucecis 💡",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="es">
        <body className={`${poppins.className} font-sans antialiased`}>
        {children}
        </body>
        </html>
    );
}
