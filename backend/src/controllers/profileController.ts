import { Response } from 'express';
import { updateUser, deleteUser, findUserById } from '../models/User';
import { AuthRequest } from '../middleware/auth';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        googleName: user.google_name || null,
        googleEmail: user.google_email || null,
        googlePicture: user.google_picture || null,
        googleConnected: !!user.google_connected,
        driveFolderId: user.drive_folder_id || null,
        driveKeluarFolderId: user.drive_keluar_folder_id || null,
        sheetMasukId: user.sheet_masuk_id || null,
        sheetKeluarId: user.sheet_keluar_id || null,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email } = req.body;
    const userId = req.user!.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama tidak boleh kosong' });
    }

    const updatedUser = await updateUser(userId, name.trim(), email?.trim() || req.user!.email);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        googlePicture: updatedUser.google_picture || null,
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message || 'Failed to update profile' });
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
