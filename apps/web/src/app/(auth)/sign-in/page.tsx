// @version 0.5.0 - Echo: sign-in page using Clerk component
"use client";

import dynamic from "next/dynamic";

const SignIn = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.SignIn),
  { ssr: false }
);

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        variables: {
          colorPrimary: "#2D1B69",
          colorBackground: "#FDF9F2",
          fontFamily: "DM Sans, system-ui, sans-serif",
        },
      }}
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      fallbackRedirectUrl="/home"
    />
  );
}
