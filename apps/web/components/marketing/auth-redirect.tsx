"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    authClient.getSession().then((session) => {
      if (session?.data?.user) {
        router.replace("/mail");
      }
    });
  }, [router]);

  return null;
}
