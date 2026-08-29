import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">Sign-in didn&apos;t go through</h1>
      <p className="text-sm text-muted">
        Something went wrong finishing sign-in with Google. Give it another try.
      </p>
      <Link href="/" className="text-sm text-accent-green hover:underline">
        ← Back to home
      </Link>
    </main>
  );
}
