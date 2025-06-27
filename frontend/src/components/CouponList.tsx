import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Alert,
  Snackbar,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Pagination,
  Stack,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material';
import {
  Code as CodeIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ClearAll as ClearAllIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { Coupon } from '../types/coupon';

interface CouponListProps {
  onEditCoupon: (coupon: Coupon) => void;
  refreshTrigger: number;
}

interface PaginatedCoupons {
  coupons: Coupon[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

// Styled components for glass effect
const GlassCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.25)',
  backdropFilter: 'blur(20px)',
  borderRadius: '20px',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'rgba(255, 255, 255, 0.3)',
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15)',
  },
}));

const GlassTableContainer = styled(TableContainer)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(20px)',
  borderRadius: '16px',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
}));

export const CouponList: React.FC<CouponListProps> = ({ onEditCoupon, refreshTrigger }) => {
  const [data, setData] = useState<PaginatedCoupons>({
    coupons: [],
    total: 0,
    page: 1,
    size: 100,
    total_pages: 0
  });
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCouponNames, setSelectedCouponNames] = useState<string[]>([]);
  const [availableCouponNames, setAvailableCouponNames] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [storeNames, setStoreNames] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  
  // 임시 필터 상태 (실제 적용되기 전)
  const [tempSelectedCouponNames, setTempSelectedCouponNames] = useState<string[]>([]);
  const [tempSelectedStores, setTempSelectedStores] = useState<string[]>([]);

  const loadCouponNames = useCallback(async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/coupon-names`);
      if (response.ok) {
        const data = await response.json();
        setAvailableCouponNames(data.coupon_names || []);
      }
    } catch (error) {
      console.error('쿠폰명 목록 로드 실패:', error);
    }
  }, []);

  const loadCoupons = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (selectedCouponNames.length > 0) {
        params.append('coupon_names', selectedCouponNames.join(','));
      }
      if (selectedStores.length > 0) {
        params.append('store_names', selectedStores.join(','));
      }
      params.append('page', currentPage.toString());
      params.append('size', '100');

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/coupons?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch coupons');
      }
      const data = await response.json();
      
      setData(data);
    } catch (err) {
      setSnackbar({ open: true, message: '쿠폰을 불러오는데 실패했습니다.', severity: 'error' });
      console.error('Error fetching coupons:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, selectedCouponNames, selectedStores]);

  const fetchStoreNames = useCallback(async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/stores`);
      if (!response.ok) {
        throw new Error('Failed to fetch store names');
      }
      const data = await response.json();
      setStoreNames(data.stores || []);
    } catch (err) {
      console.error('Error fetching store names:', err);
    }
  }, []);

  useEffect(() => {
    loadCouponNames();
    loadCoupons();
    fetchStoreNames();
  }, [loadCouponNames, loadCoupons, fetchStoreNames]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
  };

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

  const handleSearchKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  // 임시 필터 상태 변경 함수들
  const handleTempCouponNameChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setTempSelectedCouponNames(typeof value === 'string' ? value.split(',') : value);
  };

  const handleTempChipDelete = (nameToDelete: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    
    setTempSelectedCouponNames(prev => prev.filter(name => name !== nameToDelete));
  };

  const handleTempClearAllCouponNames = () => {
    setTempSelectedCouponNames([]);
  };

  const handleTempStoreClick = (storeName: string) => {
    setTempSelectedStores(prev => {
      if (prev.includes(storeName)) {
        return prev.filter(name => name !== storeName);
      } else {
        return [...prev, storeName];
      }
    });
  };

  const handleTempClearAllStores = () => {
    setTempSelectedStores([]);
  };

  // 필터 적용 함수
  const handleApplyFilters = () => {
    setSelectedCouponNames(tempSelectedCouponNames);
    setSelectedStores(tempSelectedStores);
    setCurrentPage(1);
  };

  // 필터 초기화 함수
  const handleResetFilters = () => {
    setTempSelectedCouponNames([]);
    setTempSelectedStores([]);
    setSelectedCouponNames([]);
    setSelectedStores([]);
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR');
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case '활성':
      case '사용가능':
        return 'success';
      case 'expired':
      case '만료':
      case '만료됨':
        return 'error';
      case 'used':
      case '사용됨':
        return 'default';
      default:
        return 'primary';
    }
  };

  const isExpiringSoon = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

  const isExpired = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today;
  };

  // Apple 감성의 배경색 함수
  const getRowBackgroundColor = (coupon: any) => {
    if (isExpired(coupon.expiration_date)) {
      return 'rgba(244, 67, 54, 0.15)'; // 만료된 쿠폰 - 빨간색
    } else if (isExpiringSoon(coupon.expiration_date)) {
      return 'rgba(255, 152, 0, 0.15)'; // 곧 만료될 쿠폰 - 주황색
    }
    return 'rgba(255, 255, 255, 0.03)'; // 기본 - 모든 일반 쿠폰 동일한 배경
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <GlassCard sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 2
            }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <SearchIcon />
                쿠폰 검색 & 필터
              </Typography>
              {loading && (
                <CircularProgress 
                  size={24} 
                  sx={{ 
                    color: 'rgba(102, 126, 234, 0.8)' 
                  }} 
                />
              )}
            </Box>

            {/* 검색 및 쿠폰명 필터 */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              flexWrap: 'wrap',
              alignItems: 'flex-start'
            }}>
              <Box sx={{ 
                flex: '1 1 300px', 
                minWidth: '300px',
                display: 'flex',
                gap: 1
              }}>
                <TextField
                  fullWidth
                  placeholder="쿠폰명으로 검색..."
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  onKeyPress={handleSearchKeyPress}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.9)',
                      },
                      '&.Mui-focused': {
                        background: 'rgba(255, 255, 255, 0.95)',
                      },
                    },
                  }}
                />
                <Button 
                  variant="contained" 
                  onClick={handleSearch}
                  className="glass-button"
                  sx={{ 
                    minWidth: '80px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    },
                  }}
                >
                  검색
                </Button>
              </Box>
              <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
                <FormControl fullWidth>
                  <InputLabel>쿠폰명 필터</InputLabel>
                  <Select
                    multiple
                    value={tempSelectedCouponNames}
                    onChange={handleTempCouponNameChange}
                    input={<OutlinedInput label="쿠폰명 필터" />}
                    renderValue={() => `${tempSelectedCouponNames.length}개 선택됨`}
                    MenuProps={MenuProps}
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderRadius: '12px',
                      },
                      '& .MuiSelect-select': {
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(10px)',
                      },
                    }}
                  >
                    {availableCouponNames.map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {tempSelectedCouponNames.length > 0 && (
                  <Box sx={{ 
                    mt: 1, 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 0.5, 
                    alignItems: 'center',
                    p: 1.5,
                    background: 'rgba(102, 126, 234, 0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '12px',
                    border: '1px solid rgba(102, 126, 234, 0.2)'
                  }}>
                    {tempSelectedCouponNames.map((value) => (
                      <Chip 
                        key={value} 
                        label={value} 
                        size="small"
                        onDelete={handleTempChipDelete(value)}
                        deleteIcon={<ClearIcon />}
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          fontWeight: 500,
                          '& .MuiChip-deleteIcon': {
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontSize: '16px',
                            '&:hover': {
                              color: 'white',
                            },
                          },
                        }}
                      />
                    ))}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleTempClearAllCouponNames}
                      startIcon={<ClearAllIcon />}
                      sx={{
                        ml: 1,
                        borderColor: '#FF3B30',
                        color: '#FF3B30',
                        fontSize: '0.75rem',
                        minWidth: 'auto',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(10px)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 59, 48, 0.08)',
                          borderColor: '#FF3B30',
                        },
                      }}
                    >
                      전체 해제
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
            
            {/* 지점 선택 */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                justifyContent: 'space-between'
              }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  지점 선택
                </Typography>
                {tempSelectedStores.length > 0 && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleTempClearAllStores}
                    startIcon={<ClearAllIcon />}
                    sx={{
                      borderColor: '#FF3B30',
                      color: '#FF3B30',
                      fontSize: '0.75rem',
                      minWidth: 'auto',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 59, 48, 0.08)',
                        borderColor: '#FF3B30',
                      },
                    }}
                  >
                    전체 해제
                  </Button>
                )}
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1,
                p: 2,
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(15px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}>
                {storeNames.map((store) => (
                  <Button
                    key={store}
                    variant={tempSelectedStores.includes(store) ? "contained" : "outlined"}
                    size="small"
                    onClick={() => handleTempStoreClick(store)}
                    sx={{
                      borderColor: tempSelectedStores.includes(store) ? 'transparent' : 'rgba(102, 126, 234, 0.3)',
                      background: tempSelectedStores.includes(store) 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                        : 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      color: tempSelectedStores.includes(store) ? 'white' : '#666',
                      fontWeight: tempSelectedStores.includes(store) ? 600 : 400,
                      px: 2,
                      py: 0.5,
                      borderRadius: '10px',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: tempSelectedStores.includes(store) 
                          ? 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)' 
                          : 'rgba(255, 255, 255, 0.95)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      },
                    }}
                  >
                    {store}
                  </Button>
                ))}
              </Box>
              
              {tempSelectedStores.length > 0 && (
                <Box sx={{ 
                  mt: 2,
                  p: 1.5,
                  background: 'rgba(102, 126, 234, 0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(102, 126, 234, 0.2)'
                }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 500, 
                      mb: 1 
                    }}
                  >
                    선택된 지점: {tempSelectedStores.length}개
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {tempSelectedStores.map((store) => (
                      <Chip
                        key={store}
                        label={store}
                        size="small"
                        onDelete={() => handleTempStoreClick(store)}
                        deleteIcon={<ClearIcon />}
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          fontWeight: 500,
                          '& .MuiChip-deleteIcon': {
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontSize: '16px',
                            '&:hover': {
                              color: 'white',
                            },
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
            
            {/* 필터 적용 및 초기화 버튼 */}
            {(tempSelectedCouponNames.length > 0 || tempSelectedStores.length > 0) && (
              <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleApplyFilters}
                  className="glass-button"
                  sx={{ 
                    minWidth: 120,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    },
                  }}
                >
                  필터 적용
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleResetFilters}
                  sx={{ 
                    minWidth: 120,
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '12px',
                    borderColor: 'rgba(118, 75, 162, 0.3)',
                    color: '#764ba2',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.95)',
                      borderColor: '#764ba2',
                    },
                  }}
                >
                  전체 초기화
                </Button>
              </Box>
            )}

            {/* 현재 적용된 필터 표시 */}
            {(selectedCouponNames.length > 0 || selectedStores.length > 0) && (
              <Box sx={{ 
                mb: 3,
                p: 2,
                background: 'rgba(76, 175, 80, 0.1)',
                backdropFilter: 'blur(15px)',
                borderRadius: '16px',
                border: '1px solid rgba(76, 175, 80, 0.3)'
              }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 600, 
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <SearchIcon fontSize="small" />
                  현재 적용된 필터
                </Typography>
                
                {selectedCouponNames.length > 0 && (
                  <Box sx={{ mb: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#4CAF50', 
                        fontWeight: 500, 
                        mb: 0.5 
                      }}
                    >
                      쿠폰명: {selectedCouponNames.length}개
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedCouponNames.map((name) => (
                        <Chip
                          key={name}
                          label={name}
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                            color: 'white',
                            fontWeight: 500,
                            fontSize: '0.75rem'
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
                
                {selectedStores.length > 0 && (
                  <Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#4CAF50', 
                        fontWeight: 500, 
                        mb: 0.5 
                      }}
                    >
                      지점: {selectedStores.length}개
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedStores.map((store) => (
                        <Chip
                          key={store}
                          label={store}
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                            color: 'white',
                            fontWeight: 500,
                            fontSize: '0.75rem'
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(0, 0, 0, 0.7)',
                  fontWeight: 500
                }}
              >
                총 {data.total.toLocaleString()}개 쿠폰
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </GlassCard>

      <GlassTableContainer sx={{ width: '100%', overflowX: 'auto' }}>
        <Table sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow sx={{ background: 'rgba(102, 126, 234, 0.1)' }}>
              <TableCell sx={{ minWidth: 80, fontWeight: 'bold', color: '#667eea' }}>ID</TableCell>
              <TableCell sx={{ minWidth: 120, fontWeight: 'bold', color: '#667eea' }}>상태</TableCell>
              <TableCell sx={{ minWidth: 250, fontWeight: 'bold', color: '#667eea' }}>쿠폰명</TableCell>
              <TableCell sx={{ minWidth: 100, fontWeight: 'bold', color: '#667eea' }}>할인</TableCell>
              <TableCell sx={{ minWidth: 150, fontWeight: 'bold', color: '#667eea' }}>지점</TableCell>
              <TableCell sx={{ minWidth: 120, fontWeight: 'bold', color: '#667eea' }}>만료일</TableCell>
              <TableCell sx={{ minWidth: 120, fontWeight: 'bold', color: '#667eea' }}>쿠폰코드</TableCell>
              <TableCell sx={{ minWidth: 120, fontWeight: 'bold', color: '#667eea' }}>기준금액</TableCell>
              <TableCell sx={{ minWidth: 120, fontWeight: 'bold', color: '#667eea' }}>쿠폰등록회원명</TableCell>
              <TableCell sx={{ minWidth: 120, fontWeight: 'bold', color: '#667eea' }}>결제여부</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.coupons.map((coupon) => (
              <TableRow 
                key={coupon.id}
                sx={{ 
                  opacity: (coupon as any).used || isExpired((coupon as any).expiry_date || coupon.expiration_date) ? 0.6 : 1,
                  background: getRowBackgroundColor(coupon),
                  backdropFilter: 'blur(5px)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: (coupon as any).used || isExpired((coupon as any).expiry_date || coupon.expiration_date) 
                      ? getRowBackgroundColor(coupon)
                      : 'rgba(102, 126, 234, 0.08)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  },
                  cursor: 'pointer',
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="medium" sx={{ color: '#667eea' }}>
                    {coupon.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={coupon.status || '알수없음'}
                    color={getStatusColor(coupon.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium" sx={{ color: '#ffffff' }}>
                    {coupon.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={coupon.discount || '-'} 
                    variant="outlined" 
                    size="small"
                    sx={{
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      color: '#ffffff',
                      background: 'rgba(102, 126, 234, 0.2)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      '& .MuiChip-label': {
                        color: '#ffffff',
                      },
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: '#ffffff' }}>
                    {coupon.store}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: '#ffffff' }}>
                    {formatDate(coupon.expiration_date)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {coupon.code ? (
                      <>
                        <CodeIcon fontSize="small" sx={{ color: '#667eea' }} />
                        <Typography variant="body2" sx={{ color: '#ffffff' }}>
                          {coupon.code}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {coupon.standard_price && parseInt(coupon.standard_price) > 0 ? (
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 500 }}>
                        {parseInt(coupon.standard_price).toLocaleString()}원
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {coupon.registered_by === '미등록' ? (
                      <Chip 
                        label="미등록" 
                        size="small"
                        sx={{ 
                          background: 'rgba(245, 245, 245, 0.8)', 
                          color: '#666',
                          backdropFilter: 'blur(5px)'
                        }}
                      />
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon fontSize="small" sx={{ color: '#4CAF50' }} />
                        <Chip 
                          label={coupon.registered_by || '미등록'} 
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                            color: 'white',
                            fontWeight: 500
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={coupon.payment_status || '미결제'}
                    size="small"
                    sx={{
                      background: coupon.payment_status === '결제완료' 
                        ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)' 
                        : 'rgba(245, 245, 245, 0.8)',
                      backdropFilter: 'blur(5px)',
                      color: coupon.payment_status === '결제완료' ? 'white' : '#666',
                      fontWeight: 500
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </GlassTableContainer>

      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        mt: 3,
        p: 2,
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(15px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        <Pagination
          count={data.total_pages}
          page={currentPage}
          onChange={handlePageChange}
          sx={{
            '& .MuiPaginationItem-root': {
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              '&:hover': {
                background: 'rgba(102, 126, 234, 0.1)',
              },
              '&.Mui-selected': {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                },
              },
            },
          }}
        />
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}; 