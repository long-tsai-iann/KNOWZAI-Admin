"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadToken } from "../lib/auth";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(loadToken() ? "/dashboard" : "/login");
  }, [router]);

  return null;
}
