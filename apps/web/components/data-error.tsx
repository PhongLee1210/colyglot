"use client";

import { useRouter } from "next/navigation";

import { ErrorInline } from "@/components/ui/error-inline";

export function DataError({ message }: { message: string }) {
  const router = useRouter();
  return <ErrorInline message={message} onRetry={() => router.refresh()} />;
}
