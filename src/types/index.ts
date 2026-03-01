import { Country } from '@/constants';

export interface Product {
  id: string;
  product_id: string | null;
  company_id: string;
  name: string;
  description: string;
  product_url: string | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
  tech_category?: string | null;
  industry?: string | null;
}

export interface ProductInput {
  name: string;
  description: string;
  tech_category?: string | null;
  industry?: string | null;
}

export interface ProductClassification {
  id: string;
  product_id: string;
  company_id: string;
  tech_category: string | null;
  industry: string | null;
  created_at: string;
}

export interface Company {
  id: string;
  company_id: string | null;
  name: string;
  slug: string;
  company_url: string | null;
  linkedin_profile: string | null;
  description: string;
  logo: string | null;
  logo_bg: 'white' | 'black' | null;
  hq_country: Country;
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
  hq_country?: Country;
  tech_categories?: string[];
  industries?: string[];
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
  company_url?: string;
  linkedin_profile?: string;
  description: string;
  hq_country: Country;
  logo?: File;
  products?: ProductInput[];
}

export interface ApiError {
  error: string;
  message: string;
  status: number;
}
