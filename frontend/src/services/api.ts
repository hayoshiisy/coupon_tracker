import axios from 'axios';
import { Coupon } from '../types/coupon';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// JWT 토큰을 자동으로 포함하는 인터셉터 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('API 요청에 토큰 추가:', token.substring(0, 50) + '...');
    } else {
      console.log('로컬 스토리지에 토큰이 없습니다.');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// api 객체를 export
export { api };

export const couponApi = {
  // 페이지네이션된 쿠폰 조회
  getCoupons: async (page: number = 1, size: number = 100, search?: string, couponNames?: string[], stores?: string[]): Promise<any> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    
    if (search) params.append('search', search);
    if (couponNames && couponNames.length > 0) params.append('coupon_names', couponNames.join(','));
    if (stores && stores.length > 0) params.append('stores', stores.join(','));
    
    const response = await api.get(`/coupons?${params.toString()}`);
    return response.data;
  },

  // 모든 쿠폰 조회
  getAllCoupons: async (): Promise<Coupon[]> => {
    const response = await api.get('/coupons');
    return response.data;
  },

  // 쿠폰 생성
  createCoupon: async (coupon: Omit<Coupon, 'id'>): Promise<Coupon> => {
    const response = await api.post('/coupons', coupon);
    return response.data;
  },

  // 쿠폰 수정
  updateCoupon: async (id: number, coupon: Coupon): Promise<Coupon> => {
    const response = await api.put(`/coupons/${id}`, coupon);
    return response.data;
  },

  // 쿠폰 삭제
  deleteCoupon: async (id: number): Promise<void> => {
    await api.delete(`/coupons/${id}`);
  },

  // 쿠폰 사용
  useCoupon: async (id: number): Promise<Coupon> => {
    const response = await api.patch(`/coupons/${id}/use`);
    return response.data;
  },

  // 쿠폰 이름 목록 조회
  getCouponNames: async (): Promise<string[]> => {
    const response = await api.get('/coupon-names');
    return response.data;
  },

  // 스토어 이름 목록 조회
  getStoreNames: async (): Promise<string[]> => {
    const response = await api.get('/stores');
    return response.data.stores;
  },

  // 통계 조회
  getStatistics: async (): Promise<any> => {
    const response = await api.get('/statistics');
    return response.data;
  },
};

// 호환성을 위한 개별 export
export const createCoupon = couponApi.createCoupon;
export const updateCoupon = couponApi.updateCoupon;
export const getStoreNames = couponApi.getStoreNames;

export interface PaginatedCoupons {
  coupons: Coupon[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

export interface CouponStatistic {
  name: string;
  total: number;
  used: number;
  expired: number;
  available: number;
}

export interface StoreStatistic {
  name: string;
  total: number;
  used: number;
  expired: number;
  available: number;
}

export interface StatisticsResponse {
  team_id?: string;
  summary: {
    total_coupons: number;
    used_coupons: number;
    expired_coupons: number;
    available_coupons: number;
  };
  coupon_statistics: CouponStatistic[];
  store_statistics: StoreStatistic[];
}

// 팀별 쿠폰 조회
export const fetchCoupons = async (
  page: number = 1,
  size: number = 100,
  search?: string,
  couponNames?: string,
  storeNames?: string,
  teamId?: string,
  issuer?: string
): Promise<PaginatedCoupons> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('size', size.toString());
  
  if (search) params.append('search', search);
  if (couponNames) params.append('coupon_names', couponNames);
  if (storeNames) params.append('store_names', storeNames);
  if (issuer) params.append('issuer', issuer);
  
  let url: string;
  if (teamId) {
    url = `${API_BASE_URL}/api/teams/${teamId}/coupons?${params.toString()}`;
  } else {
    if (teamId) params.append('team_id', teamId);
    url = `${API_BASE_URL}/api/coupons?${params.toString()}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('쿠폰 데이터를 가져오는데 실패했습니다.');
  }
  return response.json();
};

// 팀별 쿠폰명 조회
export const fetchCouponNames = async (teamId?: string): Promise<string[]> => {
  let url: string;
  if (teamId) {
    url = `${API_BASE_URL}/api/teams/${teamId}/coupon-names`;
  } else {
    const params = teamId ? `?team_id=${teamId}` : '';
    url = `${API_BASE_URL}/api/coupon-names${params}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('쿠폰명 데이터를 가져오는데 실패했습니다.');
  }
  const data = await response.json();
  return data.coupon_names || [];
};

// 팀별 지점명 조회
export const fetchStoreNames = async (teamId?: string): Promise<string[]> => {
  let url: string;
  if (teamId) {
    url = `${API_BASE_URL}/api/teams/${teamId}/stores`;
  } else {
    const params = teamId ? `?team_id=${teamId}` : '';
    url = `${API_BASE_URL}/api/stores${params}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('지점명 데이터를 가져오는데 실패했습니다.');
  }
  const data = await response.json();
  return data.stores || [];
};

// 팀별 통계 조회
export const fetchStatistics = async (teamId?: string): Promise<StatisticsResponse> => {
  let url: string;
  if (teamId) {
    url = `${API_BASE_URL}/api/teams/${teamId}/statistics`;
  } else {
    url = `${API_BASE_URL}/api/statistics`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('통계 데이터를 가져오는데 실패했습니다.');
  }
  return response.json();
}; 