// @version 0.5.0 - Echo: sign-up page using Clerk component
"use client";

import dynamic from "next/dynamic";

const SignUp = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.SignUp),
  { ssr: false }
);

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        variables: {
          colorPrimary: "#2D1B69",
          colorBackground: "#FDF9F2",
          fontFamily: "DM Sans, system-ui, sans-serif",
        },
      }}
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
      fallbackRedirectUrl="/home"
    />
  );
}
