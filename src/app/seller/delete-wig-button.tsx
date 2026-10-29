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
      <button type="submit" className="text-sm text-red-700 underline underline-offset-4 dark:text-red-400">
        Delete
      </button>
    </form>
  );
}
