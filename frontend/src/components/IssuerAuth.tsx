import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Container,
  InputAdornment,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import {
  Email,
  Phone,
  Person,
  Login,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AuthFormData {
  name: string;
  email: string;
  phone: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  issuer_name: string;
  expires_in: number;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const IssuerAuth: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState<AuthFormData>({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field: keyof AuthFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    if (!formData.email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const requestBody = {
        name: formData.name.trim(),
        email: formData.email.trim()
      };

      const response = await fetch(`${API_BASE_URL}/api/issuer/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || '로그인에 실패했습니다.');
      }

      const authData: AuthResponse = data;
      
      // AuthProvider의 login 함수 호출
      login(authData.access_token, authData.issuer_name);

      // 쿠폰발행자 대시보드로 이동
      navigate('/issuer/dashboard');

    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3
      }}
    >
      <Container maxWidth="sm">
        <Card
          elevation={10}
          sx={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(15px)',
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }}
        >
          <CardContent sx={{ p: 5 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  color: '#2c3e50',
                  fontWeight: 'bold',
                  mb: 2,
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                쿠폰 발행자 로그인
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#5a6c7d',
                  fontSize: '1.1rem',
                  fontWeight: 'medium'
                }}
              >
                발행자 정보를 입력하여 로그인하세요
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="이름"
                value={formData.name}
                onChange={handleInputChange('name')}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: '#667eea' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: 3,
                    '& fieldset': {
                      borderColor: '#e0e6ed',
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#2c3e50',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                  },
                  '& .MuiInputBase-input': {
                    color: '#2c3e50',
                    fontWeight: 'medium',
                    fontSize: '1.1rem',
                    padding: '16px 14px',
                  },
                }}
              />

              <TextField
                fullWidth
                label="이메일"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: '#667eea' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 4,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: 3,
                    '& fieldset': {
                      borderColor: '#e0e6ed',
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#2c3e50',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                  },
                  '& .MuiInputBase-input': {
                    color: '#2c3e50',
                    fontWeight: 'medium',
                    fontSize: '1.1rem',
                    padding: '16px 14px',
                  },
                }}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 1 }}>
                <Divider sx={{ flex: 1, borderColor: 'rgba(127, 140, 141, 0.3)' }} />
                <Typography variant="body2" sx={{ mx: 2, color: '#7f8c8d', fontWeight: 500 }}>
                  선택사항
                </Typography>
                <Divider sx={{ flex: 1, borderColor: 'rgba(127, 140, 141, 0.3)' }} />
              </Box>

              <TextField
                fullWidth
                label="전화번호"
                type="text"
                value={formData.phone}
                onChange={handleInputChange('phone')}
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone />
                    </InputAdornment>
                  ),
                }}
                placeholder="전화번호를 입력하세요 (예: 010-1234-5678)"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '12px',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.9)',
                    },
                    '&.Mui-focused': {
                      background: 'rgba(255, 255, 255, 0.95)',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#2c3e50',
                    fontWeight: 500,
                  },
                }}
              />

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

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Login />}
                sx={{
                  mt: 2,
                  mb: 2,
                  py: 2,
                  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  borderRadius: 3,
                  boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #5a67d8 30%, #6b46c1 90%)',
                    boxShadow: '0 12px 25px rgba(102, 126, 234, 0.4)',
                    transform: 'translateY(-2px)',
                  },
                  '&:disabled': {
                    background: 'linear-gradient(45deg, #bbb 30%, #999 90%)',
                    color: 'white',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {loading ? '로그인 중...' : '로그인'}
              </Button>
            </Box>

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography
                variant="body2"
                sx={{
                  color: '#5a6c7d',
                  fontSize: '0.95rem',
                  fontWeight: 'medium'
                }}
              >
                관리자에게 문의하여 계정을 생성하세요
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default IssuerAuth; 