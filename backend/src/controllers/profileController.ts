import { Response } from 'express';
import { updateUser, deleteUser } from '../models/User';
import { AuthRequest } from '../middleware/auth';

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email } = req.body;
    const userId = req.user!.id;

    const updatedUser = await updateUser(userId, name, email);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const deleteProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await deleteUser(userId);

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
