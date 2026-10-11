"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="route-error">
      <h1>Something slipped out of sync.</h1>
      <p>Try loading your saved workspace again.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
