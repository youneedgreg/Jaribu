/** The letter on a seller's account button: from their name, or their email if the name is blank. */
export function sellerInitial(name: string | null | undefined, email: string): string {
  const [first] = (name?.trim() || email.trim()).normalize();
  return first ? first.toUpperCase() : "?";
}
