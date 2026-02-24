import { Country } from '@/constants';

export interface Product {
  id: string;
  product_id: string | null;
  company_id: string;
  name: string;
  description: string;
  category: string | null;
  capabilities: string[];
  use_cases: string[];
  target_customers: string[];
  deployment: string[];
  maturity: string | null;
  pricing_model: string | null;
  confidence: number | null;
  sources: string[];
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name: string;
  description: string;
  category?: string;
  capabilities?: string[];
  use_cases?: string[];
  target_customers?: string[];
  deployment?: string[];
  maturity?: string;
  pricing_model?: string;
}

export interface Company {
  id: string;
  company_id: string | null;
  name: string;
  slug: string;
  website: string;
  description: string;
  logo: string | null;
  derived_capabilities: string[];
  domain_verticals: string[];
  hq_country: Country;
  hq_region: string | null;
  ai_infrastructure: boolean;
  ai_platform: boolean;
  scrape_confidence: number | null;
  status: 'pending' | 'approved' | 'rejected';
  embedding: number[] | null;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
  average_rating?: number;
  review_count?: number;
}

export interface CompanyEdit {
  id: string;
  company_id: string;
  proposed_data: Partial<Company>;
  submitted_by: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface Review {
  id: string;
  company_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user?: Pick<User, 'name' | 'avatar_url'>;
}

export interface CompanyWithProducts extends Company {
  products?: Product[];
}

export interface MatchingProduct {
  id: string;
  name: string;
  description: string;
}

export interface SearchResult {
  company: Company;
  score: number;
  matchingProduct?: MatchingProduct;
}

export interface SearchFilters {
  query?: string;
  derived_capabilities?: string[];
  domain_verticals?: string[];
  hq_country?: Country;
  ai_infrastructure?: boolean;
  ai_platform?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CompanyRegistrationInput {
  name: string;
  website: string;
  description: string;
  derived_capabilities: string[];
  domain_verticals: string[];
  hq_country: Country;
  hq_region?: string;
  ai_infrastructure?: boolean;
  ai_platform?: boolean;
  logo?: File;
  products?: ProductInput[];
}

export interface ApiError {
  error: string;
  message: string;
  status: number;
}
