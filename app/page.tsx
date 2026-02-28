'use client';

import { BoardForm } from '@/components/BoardForm';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-nafeth-blue">
          مولد لوحات إنفاذ
        </h1>
        <p className="mt-2 text-gray-500">
          أنشئ لوحات إعلانية للمزادات بحجم 4م × 2م بصيغة PDF
        </p>
      </div>

      {/* Main Form */}
      <BoardForm />
    </main>
  );
}
