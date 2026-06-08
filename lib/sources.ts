export type SourceId =
  | "blocket"
  | "tradera"
  | "musikborsen"
  | "guitargeeks"
  | "dlxmusic"
  | "halkans";

export type SourceMeta = {
  id: SourceId;
  label: string;
  /** Hex colour used for the marker dot and badges. */
  color: string;
  /** Origin kind — marketplaces are P2P, shops are retailers. */
  kind: "marketplace" | "shop";
};

export const SOURCES: Record<SourceId, SourceMeta> = {
  blocket: {
    id: "blocket",
    label: "Blocket",
    color: "#2D5F4A",
    kind: "marketplace",
  },
  tradera: {
    id: "tradera",
    label: "Tradera",
    color: "#B84B33",
    kind: "marketplace",
  },
  musikborsen: {
    id: "musikborsen",
    label: "Musikbörsen",
    color: "#3D4B8C",
    kind: "shop",
  },
  guitargeeks: {
    id: "guitargeeks",
    label: "GuitarGeeks",
    color: "#1F6B6B",
    kind: "shop",
  },
  dlxmusic: {
    id: "dlxmusic",
    label: "DLX Music",
    color: "#6B3F6B",
    kind: "shop",
  },
  halkans: {
    id: "halkans",
    label: "Halkans",
    color: "#9C6B3F",
    kind: "shop",
  },
};

export const SOURCE_IDS = Object.keys(SOURCES) as SourceId[];

export function getSource(id: string | null | undefined): SourceMeta | null {
  if (!id) return null;
  return (SOURCES as Record<string, SourceMeta>)[id] ?? null;
}

export type NormalizedAd = {
  sourceAdId: string;
  heading: string;
  priceAmount: number | null;
  priceCurrency: string | null;
  location: string | null;
  lat: number | null;
  lon: number | null;
  organisationName: string | null;
  isRetailer: boolean;
  tradeType: string | null;
  canonicalUrl: string;
  primaryImageUrl: string | null;
  imageUrls: string[];
  publishedAt: Date | null;
  isAuction: boolean;
  totalBids: number | null;
  auctionEndAt: Date | null;
  buyNowPrice: number | null;
};

export type Adapter = {
  id: SourceId;
  label: string;
  search(query: string, maxPages?: number): AsyncGenerator<NormalizedAd[]>;
};
