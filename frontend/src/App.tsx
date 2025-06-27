import React, { useState } from 'react';
import { Container, Typography, CssBaseline, Box, Paper, Button } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import BarChartIcon from '@mui/icons-material/BarChart';
import HomeIcon from '@mui/icons-material/Home';
import { CouponList } from './components/CouponList';
import CouponForm from './components/CouponForm';
import Statistics from './components/Statistics';
import { couponApi } from './services/api';
import { Coupon } from './types/coupon';

const theme = createTheme({
  palette: {
    mode: 'dark', // 다크 모드 활성화
    primary: {
      main: '#667eea', // 부드러운 보라빛 블루
    },
    secondary: {
      main: '#764ba2', // 보라색
    },
    background: {
      default: '#0f0f23', // 매우 어두운 네이비/블랙
      paper: 'rgba(255, 255, 255, 0.05)', // 매우 투명한 흰색
    },
    text: {
      primary: '#e4e4e7', // 밝은 회색
      secondary: 'rgba(228, 228, 231, 0.7)', // 반투명 밝은 회색
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.5px',
      color: '#f4f4f5',
    },
    h6: {
      fontWeight: 500,
      letterSpacing: '-0.2px',
      color: '#e4e4e7',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
        },
        contained: {
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4)',
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          background: 'rgba(102, 126, 234, 0.1)',
          '& .MuiTableCell-head': {
            color: '#e4e4e7',
            fontWeight: 600,
            fontSize: '0.95rem',
            border: 'none',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          color: '#ffffff',
          border: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '0.95rem',
          fontWeight: 500,
        },
        head: {
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '1rem',
          background: 'rgba(255, 255, 255, 0.05)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          fontWeight: 600,
          color: '#ffffff',
          background: 'rgba(255, 255, 255, 0.1)',
          fontSize: '0.85rem',
          '&.MuiChip-colorPrimary': {
            backgroundColor: 'rgba(96, 165, 250, 0.3)',
            color: '#ffffff',
          },
          '&.MuiChip-colorSecondary': {
            backgroundColor: 'rgba(168, 85, 247, 0.3)',
            color: '#ffffff',
          },
          '&.MuiChip-colorSuccess': {
            backgroundColor: 'rgba(34, 197, 94, 0.3)',
            color: '#ffffff',
          },
          '&.MuiChip-colorError': {
            backgroundColor: 'rgba(239, 68, 68, 0.3)',
            color: '#ffffff',
          },
          '&.MuiChip-colorWarning': {
            backgroundColor: 'rgba(245, 158, 11, 0.3)',
            color: '#ffffff',
          },
        },
      },
    },
  },
});

function MainContent() {
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingCoupon(null);
  };

  const handleSubmitCoupon = async (couponData: Omit<Coupon, 'id'>) => {
    try {
      if (editingCoupon) {
        await couponApi.updateCoupon(editingCoupon.id!, couponData);
      } else {
        await couponApi.createCoupon(couponData);
      }
      setRefreshTrigger(prev => prev + 1);
      handleCloseForm();
    } catch (error) {
      console.error('쿠폰 저장 실패:', error);
    }
  };

  const handleNavigateToStatistics = () => {
    navigate('/statistics');
  };

  const handleNavigateToHome = () => {
    navigate('/');
  };

  const isStatisticsPage = location.pathname === '/statistics';

  return (
    <Box sx={{ 
      minHeight: '100vh',
      position: 'relative',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #0f1419 25%, #1a202c 50%, #0f1419 75%, #0a0e1a 100%)',
      '&::before': {
        content: '""',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 20%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.1) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: -1,
      },
    }}>
      {/* 글래스모피즘 헤더 */}
      <Paper 
        elevation={0} 
        sx={{ 
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ 
            py: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Box sx={{ flex: 1 }} />
            
            <Box sx={{ textAlign: 'center', flex: 2 }}>
              <Typography 
                variant="h3" 
                component="h1" 
                sx={{ 
                  background: 'linear-gradient(135deg, #FFFFFF 0%, rgba(255, 255, 255, 0.8) 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  fontWeight: 800,
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                }}
              >
                COUPON MANAGEMENT SYSTEM
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '1.1rem',
                  fontWeight: 400,
                  textShadow: '0 1px 5px rgba(0, 0, 0, 0.2)',
                }}
              >
                팀버핏 쿠폰 관리를 위한 통합 솔루션
              </Typography>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              {!isStatisticsPage ? (
                <Button
                  variant="contained"
                  startIcon={<BarChartIcon />}
                  onClick={handleNavigateToStatistics}
                  sx={{
                    px: 3,
                    py: 1.5,
                    fontSize: '1rem',
                  }}
                >
                  통계
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<HomeIcon />}
                  onClick={handleNavigateToHome}
                  sx={{
                    px: 3,
                    py: 1.5,
                    fontSize: '1rem',
                  }}
                >
                  홈
                </Button>
              )}
            </Box>
          </Box>
        </Container>
      </Paper>

      {/* 메인 컨텐츠 */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Routes>
          <Route 
            path="/" 
            element={
              <CouponList 
                onEditCoupon={handleEditCoupon}
                refreshTrigger={refreshTrigger}
              />
            } 
          />
          <Route path="/statistics" element={<Statistics />} />
        </Routes>
      </Container>

      {/* 쿠폰 폼 모달 */}
      <CouponForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmitCoupon}
        editingCoupon={editingCoupon}
      />
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{
        background: 'linear-gradient(135deg, #0a0e1a 0%, #0f1419 25%, #1a202c 50%, #0f1419 75%, #0a0e1a 100%)',
        minHeight: '100vh',
      }}>
        <Router>
          <MainContent />
        </Router>
      </div>
    </ThemeProvider>
  );
}

export default App;
