import React, { useState } from 'react';
import { Container, Typography, CssBaseline, Box, Paper, Button } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import BarChartIcon from '@mui/icons-material/BarChart';
import HomeIcon from '@mui/icons-material/Home';
import BusinessIcon from '@mui/icons-material/Business';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { CouponList } from './components/CouponList';
import CouponForm from './components/CouponForm';
import Statistics from './components/Statistics';
import IssuerAuth from './components/IssuerAuth';
import IssuerDashboard from './components/IssuerDashboard';
import AdminPanel from './components/AdminPanel';
import { couponApi } from './services/api';
import { Coupon } from './types/coupon';
import { AuthProvider } from './contexts/AuthContext';

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
          '&.MuiMenu-paper': {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          },
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
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 16,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          background: 'rgba(102, 126, 234, 0.2)',
          '& .MuiTableCell-head': {
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '1rem',
            border: 'none',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          color: '#FFFFFF',
          border: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          fontSize: '0.95rem',
          fontWeight: 500,
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
        },
        head: {
          color: '#FFFFFF',
          fontWeight: 700,
          fontSize: '1rem',
          background: 'rgba(255, 255, 255, 0.1)',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(102, 126, 234, 0.3)',
          color: '#FFFFFF',
          border: '1px solid rgba(102, 126, 234, 0.5)',
          fontSize: '0.875rem',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
          '& .MuiChip-deleteIcon': {
            color: '#FFFFFF',
            '&:hover': {
              color: '#ff9999',
            },
          },
          '&.MuiChip-colorPrimary': {
            backgroundColor: 'rgba(102, 126, 234, 0.4)',
            color: '#FFFFFF',
            border: '1px solid rgba(102, 126, 234, 0.6)',
          },
          '&.MuiChip-colorSecondary': {
            backgroundColor: 'rgba(168, 85, 247, 0.4)',
            color: '#FFFFFF',
            border: '1px solid rgba(168, 85, 247, 0.6)',
          },
          '&.MuiChip-colorSuccess': {
            backgroundColor: 'rgba(34, 197, 94, 0.4)',
            color: '#FFFFFF',
            border: '1px solid rgba(34, 197, 94, 0.6)',
          },
          '&.MuiChip-colorError': {
            backgroundColor: 'rgba(239, 68, 68, 0.4)',
            color: '#FFFFFF',
            border: '1px solid rgba(239, 68, 68, 0.6)',
          },
          '&.MuiChip-colorWarning': {
            backgroundColor: 'rgba(245, 158, 11, 0.4)',
            color: '#FFFFFF',
            border: '1px solid rgba(245, 158, 11, 0.6)',
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: '#FFFFFF',
          fontSize: '0.95rem',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
          '&:hover': {
            backgroundColor: 'rgba(102, 126, 234, 0.4)',
            color: '#FFFFFF',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(102, 126, 234, 0.6)',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: 'rgba(102, 126, 234, 0.7)',
            },
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        list: {
          padding: '4px 0',
          backgroundColor: 'transparent',
        },
      },
    },
  },
});

// 팀 설정
const TEAMS = {
  timberland: {
    name: '팀버핏',
    color: '#667eea',
    description: '팀버핏 쿠폰 관리를 위한 통합 솔루션'
  },
  teamb: {
    name: '피플팀',
    color: '#f093fb', 
    description: '피플팀 쿠폰 관리 시스템'
  }
};

function TeamSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleTeamSelect = (teamId: string) => {
    navigate(`/team/${teamId}`);
  };

  if (location.pathname !== '/') {
    return null;
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
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
      <Container maxWidth="md">
        <Paper 
          elevation={0}
          sx={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 4,
            p: 6,
            textAlign: 'center',
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="center" mb={3}>
            <BusinessIcon sx={{ fontSize: 48, color: '#FFFFFF', mr: 2 }} />
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                color: '#FFFFFF',
                fontWeight: 800,
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
              }}
            >
              쿠폰 관리 시스템
            </Typography>
          </Box>
          
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.8)',
              mb: 4,
              textShadow: '0 1px 5px rgba(0, 0, 0, 0.2)',
            }}
          >
            사용할 팀을 선택해주세요
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>
            {Object.entries(TEAMS).map(([teamId, team]) => (
              <Button
                key={teamId}
                variant="contained"
                onClick={() => handleTeamSelect(teamId)}
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${team.color} 0%, ${team.color}88 100%)`,
                  color: 'white',
                  borderRadius: 3,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 24px ${team.color}40`,
                    background: `linear-gradient(135deg, ${team.color} 0%, ${team.color}aa 100%)`,
                  },
                }}
              >
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    {team.name}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {team.description}
                  </Typography>
                </Box>
              </Button>
            ))}
          </Box>
        </Paper>
        
        {/* 추가 메뉴 */}
        <Paper 
          elevation={3}
          sx={{ 
            mt: 4,
            p: 3,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" sx={{ color: 'white', mb: 2, textAlign: 'center' }}>
            시스템 관리
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<AdminPanelSettingsIcon />}
              onClick={() => navigate('/admin')}
              sx={{
                px: 3,
                py: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'rgba(255, 255, 255, 0.9)',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  background: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              관리자 패널
            </Button>
            <Button
              variant="outlined"
              startIcon={<BusinessIcon />}
              onClick={() => navigate('/issuer/login')}
              sx={{
                px: 3,
                py: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'rgba(255, 255, 255, 0.9)',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  background: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              발행자 포털
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

function TeamContent() {
  const { teamId } = useParams<{ teamId: string }>();
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const team = TEAMS[teamId as keyof typeof TEAMS];
  
  if (!team) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography variant="h4" color="error">
          존재하지 않는 팀입니다.
        </Typography>
        <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>
          팀 선택으로 돌아가기
        </Button>
      </Box>
    );
  }

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
    navigate(`/team/${teamId}/statistics`);
  };

  const handleNavigateToHome = () => {
    navigate(`/team/${teamId}`);
  };

  const handleNavigateToTeamSelector = () => {
    navigate('/');
  };

  const isStatisticsPage = location.pathname.includes('/statistics');

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
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={handleNavigateToTeamSelector}
                  startIcon={<BusinessIcon />}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      background: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  팀 변경
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/admin')}
                  startIcon={<AdminPanelSettingsIcon />}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      background: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  관리자
                </Button>
              </Box>
            </Box>
            
            <Box sx={{ textAlign: 'center', flex: 2 }}>
              <Typography 
                variant="h3" 
                component="h1" 
                sx={{ 
                  background: `linear-gradient(135deg, ${team.color} 0%, rgba(255, 255, 255, 0.8) 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  fontWeight: 800,
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                }}
              >
                {team.name.toUpperCase()} COUPON SYSTEM
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
                {team.description}
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
                    background: `linear-gradient(135deg, ${team.color} 0%, ${team.color}88 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${team.color}dd 0%, ${team.color}aa 100%)`,
                    },
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
                    background: `linear-gradient(135deg, ${team.color} 0%, ${team.color}88 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${team.color}dd 0%, ${team.color}aa 100%)`,
                    },
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
                teamId={teamId}
              />
            } 
          />
          <Route 
            path="/statistics" 
            element={<Statistics teamId={teamId} />} 
          />
        </Routes>
      </Container>

      {/* 쿠폰 폼 모달 */}
      <CouponForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmitCoupon}
        editingCoupon={editingCoupon}
        teamId={teamId}
      />
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<TeamSelector />} />
          <Route path="/team/:teamId/*" element={<TeamContent />} />
          <Route path="/issuer/login" element={
            <AuthProvider>
              <IssuerAuth />
            </AuthProvider>
          } />
          <Route path="/issuer/dashboard" element={
            <AuthProvider>
              <IssuerDashboard />
            </AuthProvider>
          } />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
