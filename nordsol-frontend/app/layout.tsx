
import './globals.css';
import React from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen w-full bg-gray-100 font-sans">
        <main className="min-h-screen w-full bg-white">
          {children}
        </main>
      </body>
    </html>
  );
}
