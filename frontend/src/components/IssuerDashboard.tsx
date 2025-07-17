import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  AppBar,
  Toolbar,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Logout as LogoutIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Receipt,
  CheckCircle,
  Schedule,
  Cancel,
  Person,
  Email,
  Phone,
  CalendarToday
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

interface IssuerProfile {
  name: string;
  email: string;
  phone?: string;
  total_coupons: number;
  active_coupons: number;
  expired_coupons: number;
}

interface Coupon {
  id: number;
  name: string;
  discount: string;
  expiration_date: string;
  store: string;
  status: string;
  code: string;
  standard_price: number;
  registered_by: string;
  additional_info: string;
  payment_status: string;
}

const IssuerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<IssuerProfile | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      console.log('프로필 API 호출 시도...');
      const response = await api.get('/issuer/profile');
      console.log('프로필 API 응답:', response.data);
      setProfile(response.data);
    } catch (err) {
      console.error('프로필 API 오류:', err);
      setError('프로필 정보를 가져오는데 실패했습니다.');
    }
  }, []);

  const fetchCoupons = useCallback(async () => {
    try {
      console.log('쿠폰 API 호출 시도...');
      const response = await api.get('/issuer/coupons');
      console.log('쿠폰 API 응답:', response.data);
      setCoupons(response.data.coupons || []);
    } catch (err) {
      console.error('쿠폰 API 오류:', err);
      setError('쿠폰 정보를 가져오는데 실패했습니다.');
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchProfile(), fetchCoupons()]);
    setLoading(false);
  }, [fetchProfile, fetchCoupons]);

  const handleLogout = () => {
    logout();
    navigate('/issuer/login');
  };

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case '사용가능':
        return '#4caf50';
      case '사용완료':
        return '#2196f3';
      case '만료':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '사용가능':
        return <CheckCircle />;
      case '사용완료':
        return <Receipt />;
      case '만료':
        return <Schedule />;
      default:
        return <Cancel />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case '사용가능':
        return '사용 가능';
      case '사용완료':
        return '사용 완료';
      case '만료':
        return '만료됨';
      default:
        return status;
    }
  };

  // 로컬에서 통계 계산 (백엔드 데이터가 부정확할 수 있으므로)
  const calculateStats = () => {
    const availableCoupons = coupons.filter(coupon => coupon.status === '사용가능').length;
    const usedCoupons = coupons.filter(coupon => coupon.status === '사용완료').length;
    const expiredCoupons = coupons.filter(coupon => coupon.status === '만료').length;
    
    return {
      available: availableCoupons,
      used: usedCoupons,
      expired: expiredCoupons,
      total: coupons.length
    };
  };

  const stats = calculateStats();

  // 쿠폰 이미지 다운로드 함수
  const downloadCouponImage = async (coupon: Coupon) => {
    try {
      // 쿠폰명과 이미지 파일명 매칭 (영문 파일명 사용)
      let imageFileName = '';
      
      if (coupon.name.includes('프렌즈 쿠폰) 1DAY 쿠폰')) {
        imageFileName = 'friends-1day-coupon.jpg';
      } else if (coupon.name.includes('프렌즈 쿠폰) PT 회당 4.5만원')) {
        imageFileName = 'friends-pt-45000.jpg';
      } else if (coupon.name.includes('프렌즈 쿠폰) 피트니스 50% 할인')) {
        imageFileName = 'friends-fitness-50discount.jpg';
      } else if (coupon.name.includes('패밀리 쿠폰) 피트니스 6개월 무료')) {
        imageFileName = 'family-fitness-6months-free.jpg';
      } else {
        alert('해당 쿠폰에 대한 이미지를 찾을 수 없습니다.');
        return;
      }

      const imagePath = `/coupon-images/${imageFileName}`;

      // 이미지 로드
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Canvas 생성
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          alert('Canvas를 지원하지 않는 브라우저입니다.');
          return;
        }

        // Canvas 크기를 이미지 크기로 설정
        canvas.width = img.width;
        canvas.height = img.height;

        // 원본 이미지 그리기
        ctx.drawImage(img, 0, 0);

        // 쿠폰 코드 추가 (정확한 픽셀 좌표 사용)
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        
        // 각 쿠폰별 정확한 좌표 (실제 이미지 분석 결과)
        let codeX, codeY;
        
        if (imageFileName === 'family-fitness-6months-free.jpg') {
          // 패밀리 쿠폰: 실제 측정된 좌표
          codeX = img.width * 0.55;  // 흰색 박스 중앙
          codeY = img.height * 0.805; // 흰색 박스 중앙
        } else if (imageFileName === 'friends-fitness-50discount.jpg') {
          // 프렌즈 피트니스 할인: 실제 측정된 좌표
          codeX = img.width * 0.55;
          codeY = img.height * 0.805;
        } else if (imageFileName === 'friends-pt-45000.jpg') {
          // 프렌즈 PT: 실제 측정된 좌표
          codeX = img.width * 0.55;
          codeY = img.height * 0.805;
        } else if (imageFileName === 'friends-1day-coupon.jpg') {
          // 프렌즈 1DAY: 실제 측정된 좌표
          codeX = img.width * 0.55;
          codeY = img.height * 0.805;
        } else {
          // 기본값
          codeX = img.width * 0.55;
          codeY = img.height * 0.805;
        }
        
        // 디버깅용: 콘솔에 좌표 출력
        console.log(`이미지: ${imageFileName}, 크기: ${img.width}x${img.height}, 텍스트 위치: (${codeX}, ${codeY})`);
        
        // 텍스트 배치
        ctx.strokeText(coupon.code, codeX, codeY);
        ctx.fillText(coupon.code, codeX, codeY);

        // 만료일 추가 (이미지 최하단)
        ctx.font = '18px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        const expiryText = `만료일: ${new Date(coupon.expiration_date).toLocaleDateString('ko-KR')}`;
        const expiryY = img.height - 30; // 최하단에서 30px 위
        
        // 만료일 텍스트에도 윤곽선 추가
        ctx.strokeText(expiryText, img.width / 2, expiryY);
        ctx.fillText(expiryText, img.width / 2, expiryY);

        // Canvas를 Blob으로 변환하여 다운로드
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${coupon.name}_${coupon.code}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }, 'image/jpeg', 0.9);
      };

      img.onerror = () => {
        alert('이미지를 로드할 수 없습니다. 관리자에게 문의하세요.');
      };

      img.src = imagePath;
    } catch (error) {
      console.error('이미지 다운로드 오류:', error);
      alert('이미지 다운로드 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Card
          sx={{
            p: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(15px)',
            borderRadius: 4,
            textAlign: 'center'
          }}
        >
          <CircularProgress size={60} sx={{ color: '#667eea', mb: 2 }} />
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#2c3e50', 
              fontWeight: 'bold' 
            }}
          >
            로딩 중...
          </Typography>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        pb: 4
      }}
    >
      <AppBar 
        position="sticky" 
        sx={{ 
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(15px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Toolbar>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              color: '#2c3e50',
              fontWeight: 'bold',
              fontSize: '1.3rem'
            }}
          >
            쿠폰 발행자 대시보드
          </Typography>
          <IconButton 
            onClick={handleRefresh}
            sx={{ 
              color: '#667eea',
              mr: 1,
              '&:hover': {
                backgroundColor: 'rgba(102, 126, 234, 0.1)'
              }
            }}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{
              background: 'linear-gradient(45deg, #ff6b6b 30%, #ee5a52 90%)',
              color: 'white',
              fontWeight: 'bold',
              borderRadius: 3,
              px: 3,
              '&:hover': {
                background: 'linear-gradient(45deg, #ff5252 30%, #d32f2f 90%)',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.3s ease'
            }}
          >
            로그아웃
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              borderRadius: 2,
              '& .MuiAlert-message': {
                color: '#d32f2f',
                fontWeight: 'bold',
                fontSize: '1rem'
              }
            }}
          >
            {error}
          </Alert>
        )}

        {/* Profile Card */}
        {profile && (
          <Card
            sx={{
              mb: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(15px)',
              borderRadius: 4,
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: '#2c3e50',
                  fontWeight: 'bold',
                  mb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Person sx={{ color: '#667eea' }} />
                발행자 정보
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Person sx={{ color: '#667eea', mr: 2 }} />
                    <Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#5a6c7d',
                          fontWeight: 'medium'
                        }}
                      >
                        이름
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: '#2c3e50',
                          fontWeight: 'bold'
                        }}
                      >
                        {profile.name}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Email sx={{ color: '#667eea', mr: 2 }} />
                    <Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#5a6c7d',
                          fontWeight: 'medium'
                        }}
                      >
                        이메일
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: '#2c3e50',
                          fontWeight: 'bold'
                        }}
                      >
                        {profile.email}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                {profile.phone && (
                  <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Phone sx={{ color: '#667eea', mr: 2 }} />
                      <Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#5a6c7d',
                            fontWeight: 'medium'
                          }}
                        >
                          전화번호
                        </Typography>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            color: '#2c3e50',
                            fontWeight: 'bold'
                          }}
                        >
                          {profile.phone}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                color: 'white',
                borderRadius: 4,
                boxShadow: '0 8px 25px rgba(76, 175, 80, 0.3)'
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <CheckCircle sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold',
                    mb: 1,
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  {stats.available}
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 'medium',
                    opacity: 0.9
                  }}
                >
                  사용 가능한 쿠폰
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                color: 'white',
                borderRadius: 4,
                boxShadow: '0 8px 25px rgba(33, 150, 243, 0.3)'
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Receipt sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold',
                    mb: 1,
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  {stats.used}
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 'medium',
                    opacity: 0.9
                  }}
                >
                  사용된 쿠폰
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                color: 'white',
                borderRadius: 4,
                boxShadow: '0 8px 25px rgba(255, 152, 0, 0.3)'
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Schedule sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold',
                    mb: 1,
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  {stats.expired}
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 'medium',
                    opacity: 0.9
                  }}
                >
                  만료된 쿠폰
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Coupon List */}
        <Card
          sx={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(15px)',
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography 
              variant="h5" 
              sx={{ 
                color: '#2c3e50',
                fontWeight: 'bold',
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Receipt sx={{ color: '#667eea' }} />
              쿠폰 목록
            </Typography>
            
            {coupons.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Receipt sx={{ fontSize: 64, color: '#bbb', mb: 2 }} />
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: '#5a6c7d',
                    fontWeight: 'medium'
                  }}
                >
                  발행된 쿠폰이 없습니다
                </Typography>
              </Box>
            ) : (
              <TableContainer 
                component={Paper}
                sx={{ 
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell 
                        sx={{ 
                          backgroundColor: '#667eea',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          borderBottom: '2px solid #5a67d8'
                        }}
                      >
                        쿠폰명
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          backgroundColor: '#667eea',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          borderBottom: '2px solid #5a67d8'
                        }}
                      >
                        할인
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          backgroundColor: '#667eea',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          borderBottom: '2px solid #5a67d8'
                        }}
                      >
                        지점
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          backgroundColor: '#667eea',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          borderBottom: '2px solid #5a67d8'
                        }}
                      >
                        쿠폰 코드
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          backgroundColor: '#667eea',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          borderBottom: '2px solid #5a67d8'
                        }}
                      >
                        상태
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          backgroundColor: '#667eea',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          borderBottom: '2px solid #5a67d8'
                        }}
                      >
                        만료일
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          backgroundColor: '#667eea',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          borderBottom: '2px solid #5a67d8'
                        }}
                      >
                        쿠폰 등록자
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          backgroundColor: '#667eea',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          borderBottom: '2px solid #5a67d8'
                        }}
                      >
                        결제 상태
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {coupons.map((coupon) => (
                      <TableRow 
                        key={coupon.id}
                        sx={{ 
                          '&:hover': { 
                            backgroundColor: 'rgba(102, 126, 234, 0.05)' 
                          }
                        }}
                      >
                        <TableCell>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              color: '#2c3e50',
                              fontWeight: 'bold'
                            }}
                          >
                            {coupon.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#5a6c7d',
                              fontWeight: 'medium'
                            }}
                          >
                            {coupon.discount}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#5a6c7d',
                              fontWeight: 'medium'
                            }}
                          >
                            {coupon.store}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            justifyContent: 'space-between'
                          }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: '#5a6c7d',
                                fontWeight: 'medium',
                                fontFamily: 'monospace'
                              }}
                            >
                              {coupon.code}
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={() => downloadCouponImage(coupon)}
                                sx={{
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  color: 'white',
                                  width: 32,
                                  height: 32,
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #5a67d8 0%, #6a4190 100%)',
                                    transform: 'scale(1.1)',
                                  },
                                  transition: 'all 0.2s ease-in-out'
                                }}
                              >
                                <Receipt fontSize="small" />
                              </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(coupon.status)}
                            label={getStatusText(coupon.status)}
                            sx={{
                              backgroundColor: getStatusColor(coupon.status),
                              color: 'white',
                              fontWeight: 'bold',
                              '& .MuiChip-icon': {
                                color: 'white'
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#5a6c7d',
                              fontWeight: 'medium'
                            }}
                          >
                            {new Date(coupon.expiration_date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#2c3e50',
                              fontWeight: 'medium'
                            }}
                          >
                            {coupon.registered_by || '알 수 없음'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={coupon.payment_status || '미결제'}
                            sx={{
                              backgroundColor: coupon.payment_status === '결제완료' ? '#4CAF50' : '#ff9800',
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default IssuerDashboard;