import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  ListItemText,
  Autocomplete
} from '@mui/material';
import {
  Code as CodeIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ClearAll as ClearAllIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { Coupon } from '../types/coupon';
import { 
  fetchCoupons, 
  fetchCouponNames, 
  fetchStoreNames, 
  PaginatedCoupons 
} from '../services/api';
import html2canvas from 'html2canvas';
import axios from 'axios';

interface CouponListProps {
  onEditCoupon: (coupon: Coupon) => void;
  refreshTrigger: number;
  teamId?: string;
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

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const CouponList: React.FC<CouponListProps> = ({ onEditCoupon, refreshTrigger, teamId }) => {
  const [data, setData] = useState<PaginatedCoupons>({
    coupons: [],
    total: 0,
    page: 1,
    size: 100,
    total_pages: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'error' | 'warning' | 'info'
  });
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

  // 새로 추가된 상태들 (쿠폰 이미지 다운로드 및 쿠폰소유자 편집용)
  const [editingOwner, setEditingOwner] = useState<{[key: number]: string}>({});
  const [couponImageDialog, setCouponImageDialog] = useState<{open: boolean, coupon: any}>({
    open: false,
    coupon: null
  });
  const couponImageRef = useRef<HTMLDivElement>(null);

  // 쿠폰 소유자를 로컬 상태로 관리
  const [couponOwners, setCouponOwners] = useState<{[key: number]: string}>({});

  // 쿠폰발행자 검색/드랍다운을 위한 상태 추가
  const [availableOwners, setAvailableOwners] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [tempSelectedOwners, setTempSelectedOwners] = useState<string[]>([]);
  // 발행자 미지정 필터
  const [onlyUnassigned, setOnlyUnassigned] = useState<boolean>(false);
  
  // 이름-이메일 매핑을 위한 상태 추가
  const [ownerNameToEmailMap, setOwnerNameToEmailMap] = useState<{[name: string]: string}>({});

  // 로컬스토리지에서 쿠폰 소유자 정보 불러오기
  const loadCouponOwnersFromLocalStorage = useCallback(() => {
    try {
      const storedOwners = localStorage.getItem('couponOwners');
      if (storedOwners) {
        const parsedOwners = JSON.parse(storedOwners);
        setCouponOwners(parsedOwners);
      }
    } catch (error) {
      console.error('로컬스토리지에서 쿠폰 소유자 정보 불러오기 실패:', error);
    }
  }, []);

  // 로컬스토리지에 쿠폰 소유자 정보 저장하기
  const saveCouponOwnersToLocalStorage = useCallback((owners: {[key: number]: string}) => {
    try {
      localStorage.setItem('couponOwners', JSON.stringify(owners));
    } catch (error) {
      console.error('로컬스토리지에 쿠폰 소유자 정보 저장 실패:', error);
    }
  }, []);

  const loadCouponNames = useCallback(async () => {
    try {
      const names = await fetchCouponNames(teamId);
      setAvailableCouponNames(names);
    } catch (error) {
      console.error('쿠폰명 로딩 실패:', error);
    }
  }, [teamId]);

  const loadStoreNames = useCallback(async () => {
    try {
      const stores = await fetchStoreNames(teamId);
      setStoreNames(stores);
    } catch (error) {
      console.error('지점명 로딩 실패:', error);
    }
  }, [teamId]);

  // 쿠폰발행자 목록 로딩 함수 추가
  const loadOwnerNames = useCallback(async () => {
    try {
      // 백엔드 API에서 모든 발행자 목록을 가져오기
      const response = await axios.get(`${API_BASE_URL}/api/issuers`);
      
      if (response.data && response.data.issuers) {
        const issuerNames = response.data.issuers.map((issuer: any) => issuer.name);
        setAvailableOwners(issuerNames);
        
        // 이름-이메일 매핑 생성
        const nameToEmailMap: {[name: string]: string} = {};
        response.data.issuers.forEach((issuer: any) => {
          nameToEmailMap[issuer.name] = issuer.email;
        });
        setOwnerNameToEmailMap(nameToEmailMap);
      } else {
        // API 실패 시 로컬스토리지에서 백업으로 가져오기
        const storedOwners = localStorage.getItem('couponOwners');
        if (storedOwners) {
          const parsedOwners = JSON.parse(storedOwners);
          const ownerValues = Object.values(parsedOwners).filter((owner): owner is string => 
            typeof owner === 'string' && owner.trim() !== ''
          );
          const uniqueOwners = Array.from(new Set(ownerValues));
          setAvailableOwners(uniqueOwners);
        }
      }
    } catch (error) {
      console.error('쿠폰발행자 목록 로딩 실패:', error);
      setSnackbar({ 
        open: true, 
        message: '쿠폰발행자 목록을 불러오는데 실패했습니다.', 
        severity: 'warning' 
      });
    }
  }, []);

  // AdminPanel에서 발행자 변경사항을 감지하기 위한 useEffect 추가
  useEffect(() => {
    if (teamId === 'teamb') {
      // storage 이벤트 리스너 추가 (다른 탭에서 변경사항 감지)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'issuerListUpdated') {
          loadOwnerNames();
          // 한 번 사용 후 삭제
          localStorage.removeItem('issuerListUpdated');
        }
      };

      // custom event 리스너 추가 (같은 탭에서 변경사항 감지)
      const handleCustomEvent = () => {
        loadOwnerNames();
      };

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('issuerListUpdated', handleCustomEvent);

      // 컴포넌트가 활성화될 때마다 새로고침 (포커스 이벤트)
      const handleFocus = () => {
        loadOwnerNames();
      };

      window.addEventListener('focus', handleFocus);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('issuerListUpdated', handleCustomEvent);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [teamId, loadOwnerNames]);

  const fetchCouponsData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 선택된 발행자 이름들을 이메일로 변환
      const selectedIssuerEmails = selectedOwners.map(name => ownerNameToEmailMap[name]).filter(email => email);

      const data: PaginatedCoupons = await fetchCoupons(
        currentPage,
        100,
        searchTerm || undefined,
        selectedCouponNames.length > 0 ? selectedCouponNames.join(',') : undefined,
        selectedStores.length > 0 ? selectedStores.join(',') : undefined,
        teamId,
        selectedIssuerEmails.length > 0 ? selectedIssuerEmails.join(',') : undefined,
        onlyUnassigned || undefined
      );

      setData(data);
    } catch (error) {
      console.error('쿠폰 로딩 실패:', error);
      setError('쿠폰 데이터를 로딩하는 중 오류가 발생했습니다.');
      setSnackbar({ open: true, message: '쿠폰 데이터를 로딩하는 중 오류가 발생했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, selectedCouponNames, selectedStores, teamId, selectedOwners, onlyUnassigned]);

  useEffect(() => {
    loadCouponNames();
    loadStoreNames();
    loadCouponOwnersFromLocalStorage();
    if (teamId === 'teamb') {
      loadOwnerNames();
    }
  }, [teamId, loadCouponNames, loadStoreNames, loadCouponOwnersFromLocalStorage, loadOwnerNames]);

  // 메인 데이터 로딩 useEffect를 분리하여 불필요한 재호출 방지
  useEffect(() => {
    fetchCouponsData();
  }, [fetchCouponsData]);

  // 백엔드에서 모든 필터링 처리 - 클라이언트 사이드 필터링 불필요
  const filteredCoupons = useMemo(() => {
    return data.coupons;
  }, [data.coupons]);

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
    if (teamId === 'teamb') {
      setSelectedOwners(tempSelectedOwners);
    }
    setCurrentPage(1);
  };

  // 필터 초기화 함수
  const handleResetFilters = () => {
    setSelectedCouponNames([]);
    setSelectedStores([]);
    setTempSelectedCouponNames([]);
    setTempSelectedStores([]);
    if (teamId === 'teamb') {
      setSelectedOwners([]);
      setTempSelectedOwners([]);
    }
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
    if ((coupon as any).used || isExpired((coupon as any).expiry_date || coupon.expiration_date)) {
      return 'rgba(158, 158, 158, 0.3)';
    } else if (isExpiringSoon((coupon as any).expiry_date || coupon.expiration_date)) {
      return 'rgba(255, 193, 7, 0.2)';
    } else {
      return 'rgba(76, 175, 80, 0.1)';
    }
  };

  // 쿠폰 코드 이미지 다운로드 함수
  const handleDownloadCouponImage = (coupon: any) => {
    setCouponImageDialog({ open: true, coupon });
  };

  const downloadCouponAsImage = async () => {
    if (!couponImageRef.current) return;

    try {
      // 잠시 대기하여 DOM이 완전히 렌더링되도록 함
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(couponImageRef.current, {
        useCORS: true,
        scale: 2, // 고해상도를 위해 스케일 증가
        allowTaint: false,
        backgroundColor: null,
        width: couponImageRef.current.scrollWidth,
        height: couponImageRef.current.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: couponImageRef.current.scrollWidth,
        windowHeight: couponImageRef.current.scrollHeight
      });

      // 캔버스를 이미지로 변환
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `coupon-${couponImageDialog.coupon?.code || 'image'}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          // 성공 알림
          setSnackbar({
            open: true,
            message: '쿠폰 이미지가 성공적으로 다운로드되었습니다.',
            severity: 'success'
          });

          // 다이얼로그 닫기
          setCouponImageDialog({ open: false, coupon: null });
        }
      }, 'image/png', 1.0);

    } catch (error) {
      console.error('이미지 다운로드 실패:', error);
      setSnackbar({
        open: true,
        message: '이미지 다운로드에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 등록자명 수정 함수들
  const handleEditOwner = (couponId: number, currentValue: string) => {
    setEditingOwner({
      ...editingOwner,
      [couponId]: currentValue || couponOwners[couponId] || ''
    });
  };

  const handleSaveOwner = async (couponId: number) => {
    try {
      const ownerName = editingOwner[couponId];
      if (!ownerName || ownerName.trim() === '') {
        setSnackbar({ open: true, message: '소유자 이름을 입력해주세요.', severity: 'warning' });
        return;
      }

      const trimmedOwnerName = ownerName.trim();
      
      // 이메일 형식인지 확인
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedOwnerName);
      
      if (isEmail) {
        // 이메일 형식인 경우 발행자에게 쿠폰 할당
        try {
          const response = await fetch(`${API_BASE_URL}/api/coupons/${couponId}/assign-issuer`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              issuer_email: trimmedOwnerName,
              issuer_name: trimmedOwnerName.split('@')[0] // 이메일의 @ 앞부분을 이름으로 사용
            })
          });

          if (response.ok) {
            setSnackbar({ 
              open: true, 
              message: `쿠폰이 발행자 '${trimmedOwnerName}'에게 성공적으로 할당되었습니다.`, 
              severity: 'success' 
            });
          } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || '발행자 할당에 실패했습니다.');
          }
        } catch (error) {
          console.error('발행자 할당 실패:', error);
          setSnackbar({ 
            open: true, 
            message: error instanceof Error ? error.message : '발행자 할당에 실패했습니다.', 
            severity: 'error' 
          });
          return;
        }
      }

      // 로컬 상태 업데이트 (이메일이든 아니든 모두 저장)
      const newCouponOwners = {
        ...couponOwners,
        [couponId]: trimmedOwnerName
      };

      setCouponOwners(newCouponOwners);
      saveCouponOwnersToLocalStorage(newCouponOwners);
      
      // 편집 상태 해제
      const newEditingOwner = { ...editingOwner };
      delete newEditingOwner[couponId];
      setEditingOwner(newEditingOwner);
      
      // 피플팀인 경우 쿠폰발행자 목록 업데이트
      if (teamId === 'teamb') {
        loadOwnerNames();
      }
      
      if (!isEmail) {
        setSnackbar({ open: true, message: '쿠폰 소유자가 성공적으로 저장되었습니다.', severity: 'success' });
      }
    } catch (error) {
      console.error('쿠폰 소유자 저장 실패:', error);
      setSnackbar({ open: true, message: '쿠폰 소유자 저장에 실패했습니다.', severity: 'error' });
    }
  };

  const handleCancelEditOwner = (couponId: number) => {
    setEditingOwner(prev => {
      const newState = { ...prev };
      delete newState[couponId];
      return newState;
    });
  };

  const handleDeleteOwner = (couponId: number) => {
    try {
      // 새로운 소유자 정보 객체 생성 (해당 쿠폰 소유자 삭제)
      const newCouponOwners = { ...couponOwners };
      delete newCouponOwners[couponId];

      // 로컬 상태에서 삭제
      setCouponOwners(newCouponOwners);

      // 로컬스토리지에서 삭제
      saveCouponOwnersToLocalStorage(newCouponOwners);

      setSnackbar({
        open: true,
        message: '쿠폰 소유자가 삭제되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      console.error('쿠폰 소유자 삭제 실패:', error);
      setSnackbar({
        open: true,
        message: '쿠폰 소유자 삭제에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 쿠폰발행자 필터링 관련 함수들
  const handleTempOwnerDelete = (ownerToDelete: string) => () => {
    setTempSelectedOwners(prev => prev.filter(owner => owner !== ownerToDelete));
  };

  const handleTempClearAllOwners = () => {
    setTempSelectedOwners([]);
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
                    startAdornment: <SearchIcon sx={{ mr: 1, color: '#A1A1A1' }} />,
                    sx: {
                      '& .MuiInputBase-input': {
                        color: '#A1A1A1',
                        '::placeholder': { color: '#A1A1A1', opacity: 1 }
                      }
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px',
                      '& .MuiOutlinedInput-input': { color: '#0D0D0E' },
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
                  <InputLabel sx={{ color: '#A1A1A1', '&.Mui-focused': { color: '#A1A1A1' } }}>쿠폰명 필터</InputLabel>
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
                        color: '#0D0D0E'
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
            {teamId !== 'teamb' && (
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
            )}
            
            {/* 피플팀용 쿠폰발행자 선택 */}
            {teamId === 'teamb' && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 2,
                  justifyContent: 'flex-end'
                }}>
                  {tempSelectedOwners.length > 0 && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleTempClearAllOwners}
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

                <Autocomplete
                  multiple
                  options={availableOwners}
                  value={tempSelectedOwners}
                  onChange={(event, newValue) => {
                    setTempSelectedOwners(newValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="쿠폰발행자 선택"
                      InputLabelProps={{ shrink: false }}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <SearchIcon sx={{ mr: 1, color: '#A1A1A1' }} />
                        ),
                        endAdornment: (
                          <>
                            {tempSelectedOwners.length > 0 && (
                              <IconButton onClick={handleTempClearAllOwners}>
                                <ClearAllIcon />
                              </IconButton>
                            )}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                        sx: {
                          '& .MuiInputBase-input': {
                            color: '#A1A1A1',
                            '::placeholder': { color: '#A1A1A1', opacity: 1 }
                          }
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          background: 'rgba(255, 255, 255, 0.8)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: '12px',
                          '& fieldset': {
                            borderColor: 'rgba(102, 126, 234, 0.3)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(102, 126, 234, 0.5)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#667eea',
                          },
                          '& .MuiOutlinedInput-input': { color: '#1a1a1a' }
                        },
                      }}
                    />
                  )}
                  renderTags={(tagValue, getTagProps) =>
                    tagValue.map((option, index) => (
                      <Chip
                        label={option}
                        {...getTagProps({ index })}
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
                    ))
                  }
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Checkbox
                        checked={tempSelectedOwners.indexOf(option) > -1}
                        sx={{
                          color: '#667eea',
                          '&.Mui-checked': {
                            color: '#667eea',
                          },
                        }}
                      />
                      <ListItemText primary={option} />
                    </li>
                  )}
                  sx={{
                    '& .MuiAutocomplete-popupIndicator': {
                      color: 'rgba(255, 255, 255, 0.8)',
                    },
                    '& .MuiAutocomplete-clearIndicator': {
                      color: 'rgba(255, 255, 255, 0.8)',
                    },
                    '& .MuiAutocomplete-tag': {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      fontWeight: 500,
                    },
                    '& .MuiAutocomplete-option': {
                      '&:hover': {
                        background: 'rgba(102, 126, 234, 0.1)',
                      },
                      '&.Mui-selected': {
                        background: 'rgba(102, 126, 234, 0.2)',
                        '&:hover': {
                          background: 'rgba(102, 126, 234, 0.3)',
                        },
                      },
                    },
                  }}
                />

                {tempSelectedOwners.length > 0 && (
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
                      선택된 쿠폰발행자: {tempSelectedOwners.length}개
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {tempSelectedOwners.map((owner) => (
                        <Chip
                          key={owner}
                          label={owner}
                          size="small"
                          onDelete={() => handleTempOwnerDelete(owner)}
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
            )}
            
            {/* 필터 적용 및 초기화 버튼 */}
            {(tempSelectedCouponNames.length > 0 || tempSelectedStores.length > 0 || (teamId === 'teamb' && (tempSelectedOwners.length > 0 || onlyUnassigned))) && (
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
            {(selectedCouponNames.length > 0 || selectedStores.length > 0 || (teamId === 'teamb' && (selectedOwners.length > 0 || onlyUnassigned))) && (
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
                  <Box sx={{ mb: teamId === 'teamb' && selectedOwners.length > 0 ? 1 : 0 }}>
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

                {teamId === 'teamb' && selectedOwners.length > 0 && (
                  <Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#4CAF50', 
                        fontWeight: 500, 
                        mb: 0.5 
                      }}
                    >
                      쿠폰발행자: {selectedOwners.length}개
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedOwners.map((owner) => (
                        <Chip
                          key={owner}
                          label={owner}
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
                {teamId === 'teamb' && onlyUnassigned && (
                  <Box sx={{ mt: selectedOwners.length > 0 ? 1 : 0 }}>
                    <Chip 
                      label="발행자 미지정만" 
                      size="small"
                      sx={{
                        background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                        color: 'white',
                        fontWeight: 500,
                        fontSize: '0.75rem'
                      }}
                    />
                  </Box>
                )}
              </Box>
            )}

            {/* 총 쿠폰 수 표시 제거 */}
          </Stack>
        </CardContent>
      </GlassCard>

      <GlassTableContainer sx={{ width: '100%', overflowX: 'auto' }}>
        <Table sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow sx={{ background: 'rgba(102, 126, 234, 0.2)' }}>
              <TableCell sx={{ minWidth: 80, fontWeight: 'bold', color: '#FFFFFF', fontSize: '1rem' }}>ID</TableCell>
              <TableCell sx={{ minWidth: 120, fontWeight: 'bold', color: '#FFFFFF', fontSize: '1rem' }}>상태</TableCell>
              <TableCell sx={{ minWidth: 250, fontWeight: 'bold', color: '#FFFFFF', fontSize: '1rem' }}>쿠폰명</TableCell>
              {teamId !== 'teamb' && (
                <TableCell sx={{ minWidth: 100, fontWeight: 'bold', color: '#FFFFFF', fontSize: '1rem' }}>할인</TableCell>
              )}
              {teamId !== 'teamb' && (
                <TableCell sx={{ minWidth: 150, fontWeight: 'bold', color: '#FFFFFF', fontSize: '1rem' }}>지점</TableCell>
              )}
              <TableCell sx={{ minWidth: 120, fontWeight: 'bold', color: '#FFFFFF', fontSize: '1rem' }}>만료일</TableCell>
              <TableCell sx={{ minWidth: 120, fontWeight: 'bold', color: '#FFFFFF', fontSize: '1rem' }}>쿠폰코드</TableCell>
              {teamId !== "teamb" && (
                <TableCell sx={{ minWidth: 120, fontWeight: 'bold', color: '#FFFFFF', fontSize: '1rem' }}>정가</TableCell>
              )}
              {teamId !== "timberland" && (
                <TableCell sx={{ minWidth: 230, fontWeight: 'bold', color: '#FFFFFF', fontSize: '1rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>쿠폰발행자</span>
                    {teamId === 'teamb' && (
                      <>
                        <Button
                          variant={onlyUnassigned ? 'contained' : 'outlined'}
                          size="small"
                          onClick={() => setOnlyUnassigned(prev => !prev)}
                          sx={{
                            borderColor: onlyUnassigned ? 'transparent' : 'rgba(102, 126, 234, 0.5)',
                            background: onlyUnassigned 
                              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                              : 'rgba(255, 255, 255, 0.08)',
                            color: onlyUnassigned ? 'white' : '#e0e0e0',
                            fontWeight: onlyUnassigned ? 600 : 500,
                            px: 1.2,
                            py: 0.2,
                            borderRadius: '10px',
                            textTransform: 'none',
                            lineHeight: 1.2,
                            '&:hover': {
                              background: onlyUnassigned 
                                ? 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)' 
                                : 'rgba(255, 255, 255, 0.16)'
                            }
                          }}
                        >
                          미지정만
                        </Button>
                        {onlyUnassigned && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={async () => {
                            // 일괄 등록 처리
                            const pending = Object.entries(editingOwner)
                              .filter(([couponId, value]) => !!value && value.trim() !== '')
                              .map(([couponId, value]) => ({ id: Number(couponId), email: value.trim() }));
                            if (pending.length === 0) {
                              setSnackbar({ open: true, message: '등록할 항목이 없습니다.', severity: 'info' });
                              return;
                            }
                            setLoading(true);
                            let success = 0, fail = 0;
                            for (const item of pending) {
                              try {
                                const res = await fetch(`${API_BASE_URL}/api/coupons/${item.id}/assign-issuer`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ issuer_email: item.email, issuer_name: item.email.split('@')[0] })
                                });
                                if (!res.ok) throw new Error('assign failed');
                                success += 1;
                              } catch (e) {
                                console.error('bulk assign failed', item, e);
                                fail += 1;
                              }
                            }
                            setSnackbar({ open: true, message: `모두 등록 완료: 성공 ${success}건, 실패 ${fail}건`, severity: fail ? 'warning' : 'success' });
                            setEditingOwner({});
                            await fetchCouponsData();
                            setLoading(false);
                          }}
                          sx={{
                            background: 'linear-gradient(135deg, #4CAF50 0%, #2e7d32 100%)',
                            ml: 1,
                            textTransform: 'none',
                            lineHeight: 1.2,
                            px: 1.2,
                            py: 0.2,
                            borderRadius: '10px'
                          }}
                        >
                          모두 등록
                        </Button>
                        )}
                      </>
                    )}
                  </Box>
                </TableCell>
              )}
              <TableCell sx={{ minWidth: 120, fontWeight: 'bold', color: '#FFFFFF', fontSize: '1rem' }}>쿠폰등록자</TableCell>
              <TableCell sx={{ minWidth: 120, fontWeight: 'bold', color: '#FFFFFF', fontSize: '1rem' }}>결제상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCoupons.map((coupon) => (
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
                  <Typography variant="body2" fontWeight="medium" sx={{ color: '#E0E0E0', fontSize: '0.95rem', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
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
                  <Typography variant="body2" fontWeight="medium" sx={{ color: '#FFFFFF', fontSize: '0.95rem', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                    {coupon.name}
                  </Typography>
                </TableCell>
                {teamId !== 'teamb' && (
                  <TableCell>
                    <Chip 
                      label={coupon.discount || '-'} 
                      variant="outlined" 
                      size="small"
                      sx={{
                        borderColor: 'rgba(255, 255, 255, 0.4)',
                        color: '#FFFFFF',
                        background: 'rgba(102, 126, 234, 0.3)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                        '& .MuiChip-label': {
                          color: '#FFFFFF',
                        },
                      }}
                    />
                  </TableCell>
                )}
                {teamId !== 'teamb' && (
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#FFFFFF', fontSize: '0.95rem', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                      {coupon.store}
                    </Typography>
                  </TableCell>
                )}
                <TableCell>
                  <Typography variant="body2" sx={{ color: '#FFFFFF', fontSize: '0.95rem', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                    {formatDate(coupon.expiration_date)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    justifyContent: 'space-between',
                    minWidth: '140px'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CodeIcon fontSize="small" sx={{ color: '#4CAF50' }} />
                      <Typography variant="body2" sx={{ color: '#FFFFFF', fontFamily: 'monospace', fontSize: '0.95rem', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                        {coupon.code}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleDownloadCouponImage(coupon)}
                      sx={{ 
                        minWidth: '30px',
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        padding: 0,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                          transform: 'translateY(-1px)',
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      <DownloadIcon fontSize="small" />
                    </Button>
                  </Box>
                </TableCell>
                {teamId !== "teamb" && (
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {coupon.standard_price && parseInt(coupon.standard_price) > 0 ? (
                        <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 600, fontSize: '0.95rem', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                          {parseInt(coupon.standard_price).toLocaleString()}원
                        </Typography>
                      ) : (
                        <Typography variant="body2" sx={{ color: '#B0B0B0', fontSize: '0.95rem' }}>
                          -
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                )}
                {teamId !== "timberland" && (
                  <TableCell>
                    {coupon.id && editingOwner[coupon.id] !== undefined ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.3,
                          minWidth: '180px',
                          width: '100%'
                        }}
                      >
                        <TextField
                          size="small"
                          value={editingOwner[coupon.id]}
                          onChange={(e) => setEditingOwner({
                            ...editingOwner,
                            [coupon.id!]: e.target.value
                          })}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveOwner(coupon.id!);
                            }
                          }}
                          sx={{
                            minWidth: '140px',
                            '& .MuiInputBase-input': {
                              padding: '4px 8px',
                              fontSize: '14px',
                              color: '#0D0D0E'
                            },
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              '& fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: 'rgba(102, 126, 234, 0.8)',
                              },
                            }
                          }}
                        />
                        <Box sx={{ display: 'flex', gap: 0.3 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleSaveOwner(coupon.id!)}
                            sx={{
                              width: '28px',
                              height: '28px',
                              color: '#4CAF50',
                              '&:hover': {
                                backgroundColor: 'rgba(76, 175, 80, 0.1)'
                              }
                            }}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleCancelEditOwner(coupon.id!)}
                            sx={{
                              width: '28px',
                              height: '28px',
                              color: '#f44336',
                              '&:hover': {
                                backgroundColor: 'rgba(244, 67, 54, 0.1)'
                              }
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.2,
                          minWidth: '180px',
                          width: '100%'
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '0.95rem',
                            minWidth: '100px',
                            flex: 1,
                            color: '#FFFFFF',
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          {coupon.issuer || '-'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.2 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditOwner(coupon.id!, coupon.issuer || '')}
                            sx={{
                              width: '28px',
                              height: '28px',
                              color: '#2196F3',
                              '&:hover': {
                                backgroundColor: 'rgba(25, 118, 210, 0.1)'
                              }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          {coupon.issuer && (
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteOwner(coupon.id!)}
                              sx={{
                                width: '28px',
                                height: '28px',
                                color: '#f44336',
                                '&:hover': {
                                  backgroundColor: 'rgba(244, 67, 54, 0.1)'
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                    )}
                  </TableCell>
                )}
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
                    color={coupon.payment_status === '결제완료' ? 'success' : 'default'}
                    size="small"
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
              color: '#1a1a1a',
              fontWeight: 600,
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

      {/* 쿠폰 이미지 다이얼로그 */}
      <Dialog
        open={couponImageDialog.open}
        onClose={() => setCouponImageDialog({ open: false, coupon: null })}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          쿠폰 이미지 다운로드
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {couponImageDialog.coupon && (
            <Box 
              ref={couponImageRef}
              sx={{
                p: 6,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                textAlign: 'center',
                minHeight: '500px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 3,
                position: 'relative'
              }}
            >
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 3, fontSize: '2.5rem' }}>
                {couponImageDialog.coupon.name}
              </Typography>
              
              <Box sx={{ 
                background: 'rgba(255, 255, 255, 0.15)', 
                borderRadius: 3, 
                p: 4, 
                backdropFilter: 'blur(15px)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}>
                <Typography variant="h1" sx={{ 
                  fontWeight: 'bold', 
                  mb: 2, 
                  fontFamily: 'monospace',
                  fontSize: '3rem',
                  letterSpacing: '0.1em'
                }}>
                  {couponImageDialog.coupon.code}
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, fontSize: '1.2rem' }}>
                  쿠폰 코드
                </Typography>
              </Box>

              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: 3, 
                mt: 3,
                width: '100%'
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ opacity: 0.8, mb: 1, fontSize: '1rem' }}>할인</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
                    {couponImageDialog.coupon.discount}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ opacity: 0.8, mb: 1, fontSize: '1rem' }}>매장</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
                    {couponImageDialog.coupon.store}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ opacity: 0.8, mb: 1, fontSize: '1rem' }}>만료일</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
                    {formatDate(couponImageDialog.coupon.expiration_date)}
                  </Typography>
                </Box>
              </Box>

              {couponImageDialog.coupon.standard_price && (
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ opacity: 0.8, mb: 1, fontSize: '1rem' }}>최소 주문 금액</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
                    {couponImageDialog.coupon.standard_price}
                  </Typography>
                </Box>
              )}

              {/* 브랜딩을 위한 작은 로고 영역 */}
              <Box sx={{ 
                position: 'absolute', 
                bottom: 20, 
                right: 20, 
                opacity: 0.6 
              }}>
                <Typography variant="caption" sx={{ fontSize: '0.8rem' }}>
                  Coupon Tracker
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2, background: '#f5f5f5' }}>
          <Button 
            onClick={() => setCouponImageDialog({ open: false, coupon: null })}
            variant="outlined"
            size="large"
            sx={{ 
              minWidth: '120px',
              borderColor: '#667eea',
              color: '#667eea',
              '&:hover': {
                borderColor: '#5a6fd8',
                backgroundColor: 'rgba(102, 126, 234, 0.05)'
              }
            }}
          >
            취소
          </Button>
          <Button 
            onClick={downloadCouponAsImage}
            variant="contained"
            size="large"
            sx={{ 
              minWidth: '120px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              }
            }}
          >
            이미지 다운로드
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 