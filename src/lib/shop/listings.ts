import "server-only";
import { cache } from "react";
import { shopById, shopBySlug } from "@/lib/seller/shop";
import { wigById, wigsForShop } from "@/lib/seller/wigs";
import { DEMO_SHOP, findDemoWig, type Shop, type Wig } from "./demo";
import { sellerShop } from "./seller-listing";

// Every shop and wig a shopper can open: the demo shop's from code, sellers' from the database.
// Wrapped in React's cache so a page and its metadata share one lookup per request.

const LINK = /^[a-z0-9-]{1,40}$/;

/** The shop with this link (`demo` for the demo shop), with its wigs, or null. */
export const findShop = cache(async (link: string): Promise<Shop | null> => {
  if (link === DEMO_SHOP.id) return DEMO_SHOP;
  if (!LINK.test(link)) return null;
  const shop = await shopBySlug(link);
  return shop ? sellerShop(shop, await wigsForShop(shop.id)) : null;
});

/** A wig and the shop that sells it (with all its wigs, for the try-on's wig picker), or null. */
export const findWig = cache(async (id: string): Promise<{ wig: Wig; shop: Shop } | null> => {
  const demo = findDemoWig(id);
  if (demo) return { wig: demo, shop: DEMO_SHOP };

  const found = await wigById(id);
  if (!found) return null;
  const shop = await shopById(found.shopId);
  if (!shop) return null;
  const listing = sellerShop(shop, await wigsForShop(shop.id));
  const wig = listing.wigs.find((w) => w.id === id);
  return wig ? { wig, shop: listing } : null;
});
