// @version 0.5.0 - Echo: auth layout — centered on linen background
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center px-4">
      {children}
    </div>
  );
}
