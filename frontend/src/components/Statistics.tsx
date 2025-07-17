import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  styled,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { fetchStatistics, StatisticsResponse } from '../services/api';
import StoreIcon from '@mui/icons-material/Store';

interface CouponStatistic {
  coupon_name: string;
  total_count: number;
  registered_count: number;
  payment_completed_count: number;
  registration_rate: number;
  payment_rate: number;
}

interface StoreStatistic {
  store: string;
  coupons: CouponStatistic[];
  total_issued: number;
  total_registered: number;
  total_payment_completed: number;
  overall_registration_rate: number;
  overall_payment_rate: number;
}

interface StatisticsProps {
  teamId?: string;
}

const GlassAccordion = styled(Accordion)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '20px !important',
  marginBottom: theme.spacing(2),
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  '&:before': {
    display: 'none',
  },
  '&.Mui-expanded': {
    margin: `0 0 ${theme.spacing(2)} 0`,
  },
}));

const GlassAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '20px',
  '&.Mui-expanded': {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  '& .MuiAccordionSummary-content': {
    margin: theme.spacing(2, 0),
  },
}));

const GlassTableContainer = styled(TableContainer)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 16,
  overflow: 'hidden',
  '& .MuiTable-root': {
    background: 'transparent',
  },
  '& .MuiTableHead-root': {
    background: 'rgba(255, 255, 255, 0.15)',
  },
  '& .MuiTableCell-head': {
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '0.95rem',
    border: 'none',
    background: 'transparent',
  },
  '& .MuiTableCell-root': {
    color: '#FFFFFF',
    border: 'none',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  '& .MuiTableRow-root:hover': {
    background: 'rgba(255, 255, 255, 0.05)',
  },
}));

export const Statistics: React.FC<StatisticsProps> = ({ teamId }) => {
  const [statistics, setStatistics] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchStatistics(teamId);
        setStatistics(data);
      } catch (err) {
        setError('통계 데이터를 불러오는데 실패했습니다.');
        console.error('통계 로딩 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, [teamId]);

  const getRateChipProps = (rate: number) => {
    if (rate >= 70) return { 
      sx: { 
        background: 'rgba(76, 175, 80, 0.4)', 
        color: '#ffffff',
        border: '1px solid rgba(76, 175, 80, 0.7)',
        fontWeight: 700,
        fontSize: '0.85rem',
        '& .MuiChip-label': {
          color: '#ffffff',
        },
      } 
    };
    if (rate >= 40) return { 
      sx: { 
        background: 'rgba(255, 152, 0, 0.4)', 
        color: '#ffffff',
        border: '1px solid rgba(255, 152, 0, 0.7)',
        fontWeight: 700,
        fontSize: '0.85rem',
        '& .MuiChip-label': {
          color: '#ffffff',
        },
      } 
    };
    return { 
      sx: { 
        background: 'rgba(244, 67, 54, 0.4)', 
        color: '#ffffff',
        border: '1px solid rgba(244, 67, 54, 0.7)',
        fontWeight: 700,
        fontSize: '0.85rem',
        '& .MuiChip-label': {
          color: '#ffffff',
        },
      } 
    };
  };

  // 매장별로 쿠폰 그룹화하는 함수
  const groupCouponsByStore = () => {
    if (!statistics?.coupon_statistics || !statistics?.store_coupon_names) {
      return {};
    }

    const groupedCoupons: { [storeName: string]: any[] } = {};

    // 각 매장별로 쿠폰 목록을 가져와서 해당 쿠폰의 통계를 찾아서 그룹화
    Object.entries(statistics.store_coupon_names).forEach(([storeName, couponNames]) => {
      groupedCoupons[storeName] = [];
      
      (couponNames as string[]).forEach(couponName => {
        const couponStat = statistics.coupon_statistics.find(stat => stat.name === couponName);
        if (couponStat) {
          groupedCoupons[storeName].push(couponStat);
        }
      });
    });

    return groupedCoupons;
  };

  // 전체 통계 계산 함수
  const calculateTotalStats = () => {
    if (!statistics?.coupon_statistics) {
      return {
        totalIssued: 0,
        totalRegistered: 0,
        totalPaymentCompleted: 0,
        totalRegistrationRate: 0,
        totalPaymentRate: 0
      };
    }

    const totalIssued = statistics.coupon_statistics.reduce((sum, coupon) => sum + coupon.issued_count, 0);
    const totalRegistered = statistics.coupon_statistics.reduce((sum, coupon) => sum + coupon.registered_users_count, 0);
    const totalPaymentCompleted = statistics.coupon_statistics.reduce((sum, coupon) => sum + coupon.payment_completed_count, 0);
    
    const totalRegistrationRate = totalIssued > 0 ? Math.round((totalRegistered / totalIssued) * 100 * 10) / 10 : 0;
    const totalPaymentRate = totalIssued > 0 ? Math.round((totalPaymentCompleted / totalIssued) * 100 * 10) / 10 : 0;

    return {
      totalIssued,
      totalRegistered,
      totalPaymentCompleted,
      totalRegistrationRate,
      totalPaymentRate
    };
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="400px"
        sx={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 4,
          margin: 2,
        }}
      >
        <Box textAlign="center">
          <CircularProgress 
            sx={{ 
              color: '#FFFFFF',
              mb: 2
            }} 
          />
          <Typography variant="h6" sx={{ color: '#FFFFFF' }}>
            통계 데이터 로딩 중...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert 
          severity="error" 
          sx={{
            background: 'rgba(244, 67, 54, 0.15)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            borderRadius: 3,
            color: '#FFFFFF',
            '& .MuiAlert-icon': {
              color: '#F44336'
            }
          }}
        >
          {error}
        </Alert>
      </Box>
    );
  }

  const groupedCoupons = groupCouponsByStore();
  const totalStats = calculateTotalStats();

  return (
    <Box>
      {/* 헤더 섹션 */}
      <Paper 
        elevation={0}
        sx={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 4,
          p: 4,
          mb: 3,
          textAlign: 'center',
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
          <AssessmentIcon sx={{ fontSize: 40, color: '#FFFFFF', mr: 2 }} />
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              color: '#FFFFFF',
              fontWeight: 800,
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
            }}
          >
            쿠폰 통계 분석
          </Typography>
        </Box>
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.8)',
            mb: 3,
            textShadow: '0 1px 5px rgba(0, 0, 0, 0.2)',
          }}
        >
          쿠폰 발행, 등록, 결제 현황을 한눈에 확인하세요
        </Typography>
        
        {/* 전체 요약 통계 */}
        <Box
          sx={{ mb: 2 }}
        >
          <Chip
            icon={<TrendingUpIcon />}
            label={`발행수: ${totalStats.totalIssued}개`}
            sx={{
              background: 'rgba(255, 255, 255, 0.3)',
              color: '#000000',
              fontWeight: 'bold',
              mr: 1,
              mb: 1,
              border: '1px solid rgba(255, 255, 255, 0.5)',
            }}
          />
          <Chip
            icon={<TrendingUpIcon />}
            label={`등록유저수: ${totalStats.totalRegistered}명`}
            sx={{
              background: 'rgba(76, 175, 80, 0.4)',
              color: '#FFFFFF',
              fontWeight: 'bold',
              mr: 1,
              mb: 1,
              border: '1px solid rgba(76, 175, 80, 0.6)',
            }}
          />
          <Chip
            icon={<TrendingUpIcon />}
            label={`결제완료수: ${totalStats.totalPaymentCompleted}개`}
            sx={{
              background: 'rgba(0, 122, 255, 0.4)',
              color: '#FFFFFF',
              fontWeight: 'bold',
              mr: 1,
              mb: 1,
              border: '1px solid rgba(0, 122, 255, 0.6)',
            }}
          />
          <Chip
            icon={<TrendingUpIcon />}
            label={`등록률: ${totalStats.totalRegistrationRate}%`}
            {...getRateChipProps(totalStats.totalRegistrationRate)}
            sx={{
              ...getRateChipProps(totalStats.totalRegistrationRate).sx,
              mr: 1,
              mb: 1,
            }}
          />
          <Chip
            icon={<TrendingUpIcon />}
            label={`결제율: ${totalStats.totalPaymentRate}%`}
            {...getRateChipProps(totalStats.totalPaymentRate)}
            sx={{
              ...getRateChipProps(totalStats.totalPaymentRate).sx,
              mr: 1,
              mb: 1,
            }}
          />
        </Box>
      </Paper>

      {/* 통계 데이터 */}
      {statistics && statistics.store_statistics.length === 0 ? (
        <Alert 
          severity="info"
          sx={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            color: '#000000',
            fontSize: '16px',
          }}
        >
          통계 데이터가 없습니다.
        </Alert>
      ) : (
        <>
          {/* 매장별 쿠폰 통계 */}
          {Object.entries(groupedCoupons).map(([storeName, coupons]) => (
            <GlassAccordion key={storeName} defaultExpanded>
              <GlassAccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#FFFFFF' }} />}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 'bold',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <StoreIcon />
                  {storeName}
                </Typography>
              </GlassAccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <GlassTableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: '#FFFFFF', fontWeight: 'bold' }}>쿠폰명</TableCell>
                        <TableCell align="center" sx={{ color: '#FFFFFF', fontWeight: 'bold' }}>발행수</TableCell>
                        <TableCell align="center" sx={{ color: '#FFFFFF', fontWeight: 'bold' }}>등록유저수</TableCell>
                        <TableCell align="center" sx={{ color: '#FFFFFF', fontWeight: 'bold' }}>등록률</TableCell>
                        <TableCell align="center" sx={{ color: '#FFFFFF', fontWeight: 'bold' }}>결제완료수</TableCell>
                        <TableCell align="center" sx={{ color: '#FFFFFF', fontWeight: 'bold' }}>결제율</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {coupons.map((couponData, index) => {
                        // 백엔드에서 비율이 없는 경우 프론트엔드에서 계산
                        const registrationRate = couponData.registration_rate ?? 
                          (couponData.issued_count > 0 ? 
                            Math.round((couponData.registered_users_count / couponData.issued_count) * 100 * 10) / 10 : 0);
                        const paymentRate = couponData.payment_rate ?? 
                          (couponData.issued_count > 0 ? 
                            Math.round((couponData.payment_completed_count / couponData.issued_count) * 100 * 10) / 10 : 0);
                        
                        return (
                          <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: 'rgba(255, 255, 255, 0.05)' } }}>
                            <TableCell sx={{ color: '#FFFFFF', fontWeight: 'bold' }}>{couponData.name}</TableCell>
                            <TableCell align="center" sx={{ color: '#FFFFFF' }}>{couponData.issued_count}</TableCell>
                            <TableCell align="center" sx={{ color: '#4CAF50' }}>{couponData.registered_users_count}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${registrationRate}%`}
                                size="small"
                                {...getRateChipProps(registrationRate)}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ color: '#2196F3' }}>{couponData.payment_completed_count}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${paymentRate}%`}
                                size="small"
                                {...getRateChipProps(paymentRate)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </GlassTableContainer>
              </AccordionDetails>
            </GlassAccordion>
          ))}

          {/* 지점별 통계 */}
          <GlassAccordion>
            <GlassAccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#FFFFFF' }} />}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <StoreIcon />
                지점별 통계 (쿠폰 상태)
              </Typography>
            </GlassAccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <GlassTableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: '#FFFFFF', fontWeight: 'bold' }}>지점명</TableCell>
                      <TableCell align="center" sx={{ color: '#FFFFFF', fontWeight: 'bold' }}>전체</TableCell>
                      <TableCell align="center" sx={{ color: '#FFFFFF', fontWeight: 'bold' }}>사용가능</TableCell>
                      <TableCell align="center" sx={{ color: '#FFFFFF', fontWeight: 'bold' }}>사용완료</TableCell>
                      <TableCell align="center" sx={{ color: '#FFFFFF', fontWeight: 'bold' }}>만료</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {statistics?.store_statistics.map((storeData, index) => (
                      <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: 'rgba(255, 255, 255, 0.05)' } }}>
                        <TableCell sx={{ color: '#FFFFFF', fontWeight: 'bold' }}>{storeData.name}</TableCell>
                        <TableCell align="center" sx={{ color: '#FFFFFF' }}>{storeData.total}</TableCell>
                        <TableCell align="center" sx={{ color: '#4CAF50' }}>{storeData.available}</TableCell>
                        <TableCell align="center" sx={{ color: '#2196F3' }}>{storeData.used}</TableCell>
                        <TableCell align="center" sx={{ color: '#F44336' }}>{storeData.expired}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </GlassTableContainer>
            </AccordionDetails>
          </GlassAccordion>
        </>
      )}
    </Box>
  );
};

export default Statistics; 