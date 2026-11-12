/** Shapes shared by the Worker, the client and the preview fixtures. */

export type MediaType = 'movie' | 'tv';

/** How a service offers a title in a region. TMDB calls stream "flatrate". */
export type OfferType = 'stream' | 'free' | 'ads' | 'rent' | 'buy';

export const OFFER_TYPES: readonly OfferType[] = ['stream', 'free', 'ads', 'rent', 'buy'];

export const OFFER_LABELS: Record<OfferType, string> = {
  stream: 'Stream',
  free: 'Free',
  ads: 'With ads',
  rent: 'Rent',
  buy: 'Buy',
};

export interface SearchItem {
  id: number;
  type: MediaType;
  title: string;
  year: string | null;
  poster: string | null;
  overview: string;
}

export interface Provider {
  id: number;
  name: string;
  logo: string | null;
  priority?: number;
}

export interface RegionOffers {
  /** ISO 3166-1 alpha-2, upper case. */
  cc: string;
  /** TMDB watch page for this title and region. */
  link: string | null;
  offers: Partial<Record<OfferType, number[]>>;
}

export interface TitleDetail {
  id: number;
  type: MediaType;
  title: string;
  year: string | null;
  runtime: number | null;
  seasons: number | null;
  episodes: number | null;
  genres: string[];
  overview: string;
  tagline: string;
  poster: string | null;
  backdrop: string | null;
  providers: Record<string, Provider>;
  regions: RegionOffers[];
}

export interface Region {
  cc: string;
  name: string;
}

export interface Meta {
  configured: boolean;
  country: string | null;
}

export interface ApiError {
  error: string;
  message?: string;
}
