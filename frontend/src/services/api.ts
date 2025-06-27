import axios from 'axios';
import { Coupon } from '../types/coupon';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

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