"use client";

import { deleteWigAction } from "./wigs/actions";

/** Deletes a wig after the seller confirms. */
export function DeleteWigButton({ wigId, name }: { wigId: string; name: string }) {
  return (
    <form
      action={deleteWigAction}
      onSubmit={(e) => {
        if (!window.confirm(`Delete "${name}"? Links to it will stop working.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="wigId" value={wigId} />
      <button type="submit" className="inline-flex min-h-10 items-center text-sm text-danger underline underline-offset-4">
        Delete
      </button>
    </form>
  );
}
