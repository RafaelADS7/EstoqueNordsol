// components/Header.tsx
import React from 'react';

export default function Header() {
  return (
    // bg-[#0a1f3e] é o azul marinho explícito. shadow-sm adiciona uma leve sombra profissional.
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0a1f3e] text-white flex items-center px-6 z-50 shadow-sm border-b border-white/5">
      <h1 className="text-xl font-bold uppercase tracking-tight">NORDSOL</h1>
    </header>
  );
}