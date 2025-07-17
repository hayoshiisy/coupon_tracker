import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  Card,
  CircularProgress,
  Container,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

// SQLite 발행자 데이터 구조
interface Issuer {
  name: string;
  email: string;
  phone?: string;
  created_at: string;
  coupon_count: number;
}

// 발행자 폼 데이터 구조 (role 제거)
interface IssuerFormData {
  name: string;
  email: string;
  phone: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const AdminPanel: React.FC = () => {
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState<IssuerFormData>({
    name: '',
    email: '',
    phone: '',
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  const [selectedIssuer, setSelectedIssuer] = useState<Issuer | null>(null);

  // SQLite 발행자 목록 가져오기
  const fetchIssuers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/issuers`);
      const data = await response.json();
      setIssuers(data.issuers || []);
    } catch (error) {
      console.error('발행자 목록 가져오기 오류:', error);
      setSnackbar({
        open: true,
        message: '발행자 목록을 가져오는데 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 새 발행자 등록
  const handleCreate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issuers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: '발행자가 성공적으로 생성되었습니다.',
          severity: 'success'
        });
        fetchIssuers();
        setOpenDialog(false);
        setFormData({ name: '', email: '', phone: '' });
        
        // CouponList에 변경사항 알림
        localStorage.setItem('issuerListUpdated', Date.now().toString());
        // 같은 탭에서도 즉시 적용되도록 custom event 발생
        window.dispatchEvent(new CustomEvent('issuerListUpdated'));
      } else {
        const errorData = await response.json();
        setSnackbar({
          open: true,
          message: errorData.detail || '발행자 생성에 실패했습니다.',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('발행자 생성 오류:', error);
      setSnackbar({
        open: true,
        message: '발행자 생성 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  // 발행자 정보 수정
  const handleUpdate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issuers/${encodeURIComponent(selectedIssuer!.email)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setSnackbar({
          open: true,
          message: result.message || '발행자 정보가 성공적으로 수정되었습니다.',
          severity: 'success'
        });
        await fetchIssuers(); // 목록 다시 불러오기
        setOpenDialog(false);
        setSelectedIssuer(null);
        setFormData({ name: '', email: '', phone: '' });
        
        // CouponList에 변경사항 알림
        localStorage.setItem('issuerListUpdated', Date.now().toString());
        // 같은 탭에서도 즉시 적용되도록 custom event 발생
        window.dispatchEvent(new CustomEvent('issuerListUpdated'));
      } else {
        const errorData = await response.json();
        setSnackbar({
          open: true,
          message: errorData.detail || '발행자 정보 수정에 실패했습니다.',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('발행자 수정 오류:', error);
      setSnackbar({
        open: true,
        message: '발행자 수정 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  // 발행자 삭제
  const handleDelete = async (issuerEmail: string) => {
    if (window.confirm('정말로 이 발행자를 삭제하시겠습니까?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/issuers/${encodeURIComponent(issuerEmail)}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setSnackbar({
            open: true,
            message: '발행자가 성공적으로 삭제되었습니다.',
            severity: 'success'
          });
          fetchIssuers();
          
          // CouponList에 변경사항 알림
          localStorage.setItem('issuerListUpdated', Date.now().toString());
          // 같은 탭에서도 즉시 적용되도록 custom event 발생
          window.dispatchEvent(new CustomEvent('issuerListUpdated'));
        } else {
          const errorData = await response.json();
          setSnackbar({
            open: true,
            message: errorData.detail || '발행자 삭제에 실패했습니다.',
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('발행자 삭제 오류:', error);
        setSnackbar({
          open: true,
          message: '발행자 삭제 중 오류가 발생했습니다.',
          severity: 'error'
        });
      }
    }
  };

  const handleEdit = (issuer: Issuer) => {
    setSelectedIssuer(issuer);
    setDialogMode('edit');
    setFormData({
      name: issuer.name,
      email: issuer.email,
      phone: issuer.phone || '',
    });
    setOpenDialog(true);
  };

  const handleOpenDialog = (mode: 'add' | 'edit', issuer?: Issuer) => {
    setDialogMode(mode);
    if (mode === 'edit' && issuer) {
      setSelectedIssuer(issuer);
      setFormData({
        name: issuer.name,
        email: issuer.email,
        phone: issuer.phone || '',
      });
    } else {
      setSelectedIssuer(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDialogMode('add');
    setSelectedIssuer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.email) {
      setSnackbar({
        open: true,
        message: '이름과 이메일을 입력해주세요.',
        severity: 'error'
      });
      return;
    }

    if (selectedIssuer) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  useEffect(() => {
    fetchIssuers();
  }, [fetchIssuers]);

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 3
      }}
    >
      <Container maxWidth="lg">
        <Paper 
          elevation={3}
          sx={{ 
            p: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ 
              color: '#2c3e50',
              fontWeight: 'bold',
              textAlign: 'center',
              mb: 4
            }}
          >
            쿠폰 발행자 관리
          </Typography>

          {/* Statistics Cards */}
          <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <Card 
                elevation={2}
                sx={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  p: 3,
                  borderRadius: 2,
                  textAlign: 'center'
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  총 발행자 수
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {issuers.length}
                </Typography>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <Card 
                elevation={2}
                sx={{ 
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  p: 3,
                  borderRadius: 2,
                  textAlign: 'center'
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  활성 발행자 수
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {issuers.filter(issuer => issuer.coupon_count > 0).length}
                </Typography>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <Card 
                elevation={2}
                sx={{ 
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  p: 3,
                  borderRadius: 2,
                  textAlign: 'center'
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  총 쿠폰 수
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {issuers.reduce((sum, issuer) => sum + issuer.coupon_count, 0)}
                </Typography>
              </Card>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('add')}
              sx={{
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                color: 'white',
                fontWeight: 'bold',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a67d8 30%, #6b46c1 90%)',
                }
              }}
            >
              새 발행자 추가
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchIssuers}
              sx={{
                borderColor: '#667eea',
                color: '#667eea',
                fontWeight: 'bold',
                '&:hover': {
                  borderColor: '#5a67d8',
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                }
              }}
            >
              새로고침
            </Button>
          </Box>

          {/* Error Alert */}
          {snackbar.open && (
            <Alert 
              severity={snackbar.severity} 
              sx={{ 
                mb: 3,
                '& .MuiAlert-message': {
                  color: snackbar.severity === 'success' ? '#27ae60' : '#d32f2f',
                  fontWeight: 'bold'
                }
              }}
            >
              {snackbar.message}
            </Alert>
          )}

          {/* Issuers Table */}
          <TableContainer 
            component={Paper} 
            elevation={2}
            sx={{ 
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(5px)'
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ 
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      backgroundColor: 'rgba(102, 126, 234, 0.3)',
                      borderBottom: '2px solid #667eea',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}
                  >
                    이름
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      backgroundColor: 'rgba(102, 126, 234, 0.3)',
                      borderBottom: '2px solid #667eea',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}
                  >
                    이메일
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      backgroundColor: 'rgba(102, 126, 234, 0.3)',
                      borderBottom: '2px solid #667eea',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}
                  >
                    전화번호
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      backgroundColor: 'rgba(102, 126, 234, 0.3)',
                      borderBottom: '2px solid #667eea',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}
                  >
                    쿠폰 수
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      backgroundColor: 'rgba(102, 126, 234, 0.3)',
                      borderBottom: '2px solid #667eea',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}
                  >
                    생성일
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      backgroundColor: 'rgba(102, 126, 234, 0.3)',
                      borderBottom: '2px solid #667eea',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}
                  >
                    작업
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : issuers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      등록된 발행자가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  issuers.map((issuer) => (
                    <TableRow 
                      key={issuer.email}
                      sx={{ 
                        '&:hover': { 
                          backgroundColor: 'rgba(102, 126, 234, 0.05)' 
                        }
                      }}
                    >
                      <TableCell sx={{ color: '#2c3e50', fontWeight: 'medium', fontSize: '1rem' }}>
                        {issuer.name}
                      </TableCell>
                      <TableCell sx={{ color: '#2c3e50', fontSize: '1rem' }}>
                        {issuer.email}
                      </TableCell>
                      <TableCell sx={{ color: '#2c3e50', fontSize: '1rem' }}>
                        {issuer.phone || '-'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={issuer.coupon_count}
                          color={issuer.coupon_count > 0 ? 'primary' : 'default'}
                          sx={{ 
                            fontWeight: 'bold',
                            color: issuer.coupon_count > 0 ? 'white' : '#666'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#2c3e50', fontSize: '1rem' }}>
                        {new Date(issuer.created_at).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="수정">
                          <IconButton
                            onClick={() => handleEdit(issuer)}
                            sx={{ 
                              color: '#667eea',
                              '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.1)' }
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton
                            onClick={() => handleDelete(issuer.email)}
                            sx={{ 
                              color: '#e53e3e',
                              '&:hover': { backgroundColor: 'rgba(229, 62, 62, 0.1)' }
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>

      {/* Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ color: '#2c3e50', fontWeight: 'bold', fontSize: '1.5rem' }}>
          {dialogMode === 'add' ? '새 발행자 추가' : '발행자 정보 수정'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="이름"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#667eea',
                },
                '&:hover fieldset': {
                  borderColor: '#5a67d8',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#667eea',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#2c3e50',
                fontWeight: 'medium',
              },
              '& .MuiInputBase-input': {
                color: '#2c3e50',
                fontWeight: 'medium',
              }
            }}
          />
          <TextField
            margin="dense"
            label="이메일"
            type="email"
            fullWidth
            variant="outlined"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#667eea',
                },
                '&:hover fieldset': {
                  borderColor: '#5a67d8',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#667eea',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#2c3e50',
                fontWeight: 'medium',
              },
              '& .MuiInputBase-input': {
                color: '#2c3e50',
                fontWeight: 'medium',
              }
            }}
          />
          <TextField
            margin="dense"
            label="전화번호 (선택사항)"
            fullWidth
            variant="outlined"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#667eea',
                },
                '&:hover fieldset': {
                  borderColor: '#5a67d8',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#667eea',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#2c3e50',
                fontWeight: 'medium',
              },
              '& .MuiInputBase-input': {
                color: '#2c3e50',
                fontWeight: 'medium',
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={handleCloseDialog}
            sx={{ 
              color: '#666',
              fontWeight: 'bold',
              '&:hover': { backgroundColor: 'rgba(102, 102, 102, 0.1)' }
            }}
          >
            취소
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
              color: 'white',
              fontWeight: 'bold',
              '&:hover': {
                background: 'linear-gradient(45deg, #5a67d8 30%, #6b46c1 90%)',
              }
            }}
          >
            {dialogMode === 'add' ? '추가' : '수정'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPanel; 