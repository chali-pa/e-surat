import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail, findUserById, updatePassword } from '../models/User';
import { AuthRequest } from '../middleware/auth';

// Verify reCAPTCHA token
const verifyRecaptcha = async (token: string): Promise<boolean> => {
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    console.warn('RECAPTCHA_SECRET_KEY not configured, skipping verification');
    return true; // Skip verification if not configured (for development)
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json() as { success: boolean };
    return data.success;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, captchaToken } = req.body;

    // Validate reCAPTCHA
    if (captchaToken) {
      const isValidCaptcha = await verifyRecaptcha(captchaToken);
      if (!isValidCaptcha) {
        return res.status(400).json({ error: 'CAPTCHA verification failed' });
      }
    } else if (process.env.RECAPTCHA_SECRET_KEY) {
      return res.status(400).json({ error: 'CAPTCHA token is required' });
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await createUser(name, email, hashedPassword);

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, captchaToken } = req.body;

    // Validate reCAPTCHA
    if (captchaToken) {
      const isValidCaptcha = await verifyRecaptcha(captchaToken);
      if (!isValidCaptcha) {
        return res.status(400).json({ error: 'CAPTCHA verification failed' });
      }
    } else if (process.env.RECAPTCHA_SECRET_KEY) {
      return res.status(400).json({ error: 'CAPTCHA token is required' });
    }

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  // For JWT, logout is handled client-side by removing the token
  res.json({ success: true, message: 'Logout successful' });
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await findUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await findUserByEmail(email);

    if (!user) {
      // Don't reveal if email exists
      return res.json({ success: true, message: 'If email exists, reset link sent' });
    }

    // TODO: Implement email sending with reset token
    // For now, return success
    res.json({ success: true, message: 'Reset link sent to email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    // TODO: Verify reset token and update password
    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

export const verifyPassword = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    res.json({ success: true, message: 'Password verified' });
  } catch (error) {
    console.error('Verify password error:', error);
    res.status(500).json({ error: 'Failed to verify password' });
  }
};
