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

interface StatisticsResponse {
  statistics: StoreStatistic[];
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

const Statistics: React.FC = () => {
  const [statistics, setStatistics] = useState<StoreStatistic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/statistics');
      if (!response.ok) {
        throw new Error('통계 데이터를 불러오는데 실패했습니다');
      }
      const data: StatisticsResponse = await response.json();
      setStatistics(data.statistics);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

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
          매장별 쿠폰 발행, 등록, 결제 현황을 한눈에 확인하세요
        </Typography>
        
        {/* 전체 요약 통계 */}
        <Box 
          display="flex" 
          justifyContent="center" 
          gap={3} 
          flexWrap="wrap"
          sx={{ mb: 2 }}
        >
          {statistics.length > 0 && (
            <>
              <Chip
                icon={<TrendingUpIcon />}
                label={`총 발행: ${statistics.reduce((sum, store) => sum + store.total_issued, 0)}개`}
                sx={{
                  background: 'rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  py: 2.5,
                  px: 1,
                  '& .MuiChip-label': {
                    color: '#ffffff',
                  },
                  '& .MuiChip-icon': {
                    color: '#ffffff',
                  },
                }}
              />
              <Chip
                icon={<TrendingUpIcon />}
                label={`총 등록: ${statistics.reduce((sum, store) => sum + store.total_registered, 0)}개`}
                sx={{
                  background: 'rgba(76, 175, 80, 0.4)',
                  color: '#ffffff',
                  border: '1px solid rgba(76, 175, 80, 0.7)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  py: 2.5,
                  px: 1,
                  '& .MuiChip-label': {
                    color: '#ffffff',
                  },
                  '& .MuiChip-icon': {
                    color: '#ffffff',
                  },
                }}
              />
              <Chip
                icon={<TrendingUpIcon />}
                label={`총 결제완료: ${statistics.reduce((sum, store) => sum + store.total_payment_completed, 0)}개`}
                sx={{
                  background: 'rgba(0, 122, 255, 0.4)',
                  color: '#ffffff',
                  border: '1px solid rgba(0, 122, 255, 0.7)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  py: 2.5,
                  px: 1,
                  '& .MuiChip-label': {
                    color: '#ffffff',
                  },
                  '& .MuiChip-icon': {
                    color: '#ffffff',
                  },
                }}
              />
            </>
          )}
        </Box>
      </Paper>

      {/* 통계 데이터 */}
      {statistics.length === 0 ? (
        <Alert 
          severity="info"
          sx={{
            background: 'rgba(33, 150, 243, 0.15)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(33, 150, 243, 0.3)',
            borderRadius: 3,
            color: '#FFFFFF',
            '& .MuiAlert-icon': {
              color: '#2196F3'
            }
          }}
        >
          통계 데이터가 없습니다.
        </Alert>
      ) : (
        statistics.map((storeData, index) => (
          <GlassAccordion key={index} defaultExpanded>
            <GlassAccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#FFFFFF' }} />}>
              <Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 2,
                    color: '#FFFFFF',
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  📍 {storeData.store}
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Chip
                    label={`발행 ${storeData.total_issued}개`}
                    size="small"
                    sx={{
                      background: 'rgba(255, 255, 255, 0.3)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      '& .MuiChip-label': {
                        color: '#ffffff',
                      },
                    }}
                  />
                  <Chip
                    label={`등록 ${storeData.total_registered}개 (${storeData.overall_registration_rate}%)`}
                    size="small"
                    {...getRateChipProps(storeData.overall_registration_rate)}
                  />
                  <Chip
                    label={`결제완료 ${storeData.total_payment_completed}개 (${storeData.overall_payment_rate}%)`}
                    size="small"
                    {...getRateChipProps(storeData.overall_payment_rate)}
                  />
                </Box>
              </Box>
            </GlassAccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <GlassTableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>쿠폰명</TableCell>
                      <TableCell align="center">총 발행</TableCell>
                      <TableCell align="center">등록 수</TableCell>
                      <TableCell align="center">등록률</TableCell>
                      <TableCell align="center">결제완료</TableCell>
                      <TableCell align="center">결제율</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {storeData.coupons.map((coupon, couponIndex) => (
                      <TableRow key={couponIndex}>
                        <TableCell component="th" scope="row">
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 500,
                              color: '#FFFFFF'
                            }}
                          >
                            {coupon.coupon_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#ffffff' }}>
                            {coupon.total_count}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#ffffff' }}>
                            {coupon.registered_count}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${coupon.registration_rate}%`}
                            size="small"
                            {...getRateChipProps(coupon.registration_rate)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#ffffff' }}>
                            {coupon.payment_completed_count}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${coupon.payment_rate}%`}
                            size="small"
                            {...getRateChipProps(coupon.payment_rate)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </GlassTableContainer>
            </AccordionDetails>
          </GlassAccordion>
        ))
      )}
    </Box>
  );
};

export default Statistics; 