"use client";

import { useEffect } from "react";

export default function JourneyEditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Journey editor failed to render", error);
  }, [error]);

  return (
    <section className="mx-auto my-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Journey editor recovery</p>
      <h2 className="mt-2 text-xl font-semibold">This workspace could not be displayed safely.</h2>
      <p className="mt-2 text-sm leading-6">
        Your revision has not been changed. Reload the workspace to try again; if the problem persists, ask an administrator to inspect this revision.
      </p>
      {error.digest ? <p className="mt-3 text-xs text-amber-800">Reference: {error.digest}</p> : null}
      <button type="button" onClick={reset} className="mt-5 min-h-10 rounded-lg bg-navy px-4 text-sm font-semibold text-white">
        Retry workspace
      </button>
    </section>
  );
}
