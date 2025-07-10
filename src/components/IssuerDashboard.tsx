import React, { useState, useEffect, useCallback } from 'react';
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
    Alert,
    CircularProgress
} from '@mui/material';
import {
    Logout as LogoutIcon,
    Download as DownloadIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    HourglassEmpty as HourglassEmptyIcon,
    Error as ErrorIcon
} from '@mui/icons-material';
import html2canvas from 'html2canvas'; 