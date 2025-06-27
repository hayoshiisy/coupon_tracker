import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { Coupon } from '../types/coupon';
import { getStoreNames } from '../services/api';

interface CouponFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (coupon: Omit<Coupon, 'id'>) => void;
  editingCoupon?: Coupon | null;
}

// Styled components for glass effect
const GlassDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
}));

const GlassDialogTitle = styled(DialogTitle)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontWeight: 700,
  fontSize: '1.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
}));

const CouponForm: React.FC<CouponFormProps> = ({
  open,
  onClose,
  onSubmit,
  editingCoupon,
}) => {
  const [storeNames, setStoreNames] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    discount: '',
    expiration_date: '',
    store: '',
    status: 'active',
    code: '',
    standard_price: '',
    registered_by: '',
    payment_status: 'pending',
    additional_info: '',
  });

  useEffect(() => {
    const fetchStoreNames = async () => {
      try {
        const stores = await getStoreNames();
        setStoreNames(stores);
      } catch (error) {
        console.error('스토어 목록 조회 실패:', error);
      }
    };
    
    fetchStoreNames();
  }, []);

  useEffect(() => {
    if (editingCoupon) {
      setFormData({
        name: editingCoupon.name || '',
        discount: editingCoupon.discount || '',
        expiration_date: editingCoupon.expiration_date || '',
        store: editingCoupon.store || '',
        status: editingCoupon.status || 'active',
        code: editingCoupon.code || '',
        standard_price: editingCoupon.standard_price?.toString() || '',
        registered_by: editingCoupon.registered_by || '',
        payment_status: editingCoupon.payment_status || 'pending',
        additional_info: editingCoupon.additional_info || '',
      });
    } else {
      setFormData({
        name: '',
        discount: '',
        expiration_date: '',
        store: '',
        status: 'active',
        code: '',
        standard_price: '',
        registered_by: '',
        payment_status: 'pending',
        additional_info: '',
      });
    }
  }, [editingCoupon, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      discount: formData.discount,
      expiration_date: formData.expiration_date,
      store: formData.store,
      status: formData.status,
      code: formData.code,
      standard_price: formData.standard_price,
      registered_by: formData.registered_by,
      payment_status: formData.payment_status,
      additional_info: formData.additional_info,
    });
    onClose();
  };

  return (
    <GlassDialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <GlassDialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SaveIcon />
          {editingCoupon ? '쿠폰 수정' : '새 쿠폰 추가'}
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.95)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </GlassDialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          <TextField
            fullWidth
            label="쿠폰명"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
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
              '& .MuiInputLabel-root': {
                fontWeight: 500,
              },
            }}
          />
          
          <TextField
            fullWidth
            label="할인"
            value={formData.discount}
            onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
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
              '& .MuiInputLabel-root': {
                fontWeight: 500,
              },
            }}
          />
          
          <TextField
            fullWidth
            label="만료일"
            type="date"
            value={formData.expiration_date}
            onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            required
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
              '& .MuiInputLabel-root': {
                fontWeight: 500,
              },
            }}
          />
          
          <FormControl fullWidth required>
            <InputLabel sx={{ fontWeight: 500 }}>지점</InputLabel>
            <Select
              value={formData.store}
              label="지점"
              onChange={(e) => setFormData({ ...formData, store: e.target.value })}
              sx={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.9)',
                },
                '&.Mui-focused': {
                  background: 'rgba(255, 255, 255, 0.95)',
                },
              }}
            >
              {storeNames.map((store) => (
                <MenuItem key={store} value={store}>
                  {store}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="쿠폰코드"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
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
              '& .MuiInputLabel-root': {
                fontWeight: 500,
              },
            }}
          />
          
          <TextField
            fullWidth
            label="기준금액"
            type="number"
            value={formData.standard_price}
            onChange={(e) => setFormData({ ...formData, standard_price: e.target.value })}
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
              '& .MuiInputLabel-root': {
                fontWeight: 500,
              },
            }}
          />
          
          <FormControl fullWidth>
            <InputLabel sx={{ fontWeight: 500 }}>상태</InputLabel>
            <Select
              value={formData.status}
              label="상태"
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              sx={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.9)',
                },
                '&.Mui-focused': {
                  background: 'rgba(255, 255, 255, 0.95)',
                },
              }}
            >
              <MenuItem value="active">
                <Chip 
                  label="활성" 
                  color="success" 
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                    color: 'white',
                    fontWeight: 500
                  }}
                />
              </MenuItem>
              <MenuItem value="inactive">
                <Chip 
                  label="비활성" 
                  color="default" 
                  size="small"
                  sx={{
                    background: 'rgba(245, 245, 245, 0.8)',
                    color: '#666',
                    fontWeight: 500
                  }}
                />
              </MenuItem>
              <MenuItem value="expired">
                <Chip 
                  label="만료" 
                  color="error" 
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                    color: 'white',
                    fontWeight: 500
                  }}
                />
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ 
        p: 3, 
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        gap: 2 
      }}>
        <Button
          onClick={onClose}
          startIcon={<CancelIcon />}
          sx={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            color: '#666',
            fontWeight: 500,
            px: 3,
            py: 1,
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.95)',
            },
          }}
        >
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<SaveIcon />}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            fontWeight: 600,
            px: 3,
            py: 1,
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
            },
          }}
        >
          {editingCoupon ? '수정' : '추가'}
        </Button>
      </DialogActions>
    </GlassDialog>
  );
};

export default CouponForm; 