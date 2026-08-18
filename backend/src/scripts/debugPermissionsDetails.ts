import '../config/dotenv-config';
import { google } from 'googleapis';
import { getAuth, DRIVE_FOLDER_ID, SHARED_DRIVE_ID } from '../config/google';

async function main() {
  console.log('🔍 Debugging Permission Details...\n');
  
  const auth = getAuth();
  if (!auth) {
    console.error('❌ Failed to initialize Auth');
    return;
  }
  
  const drive = google.drive({ version: 'v3', auth });
  
  console.log('Folder ID:', DRIVE_FOLDER_ID);
  console.log('Shared Drive ID:', SHARED_DRIVE_ID);
  
  if (SHARED_DRIVE_ID) {
    console.log('\n--- Checking Shared Drive Metadata & Permissions ---');
    try {
      const driveInfo = await drive.drives.get({
        driveId: SHARED_DRIVE_ID,
        fields: 'id,name,capabilities',
      });
      console.log('✅ Shared Drive Accessible:', driveInfo.data.name);
      console.log('   Capabilities:', JSON.stringify(driveInfo.data.capabilities, null, 2));
      
      const drivePermissions = await drive.permissions.list({
        fileId: SHARED_DRIVE_ID,
        supportsAllDrives: true,
        fields: 'permissions(id,emailAddress,role,type,displayName)',
      });
      console.log('   Permissions:');
      console.log(JSON.stringify(drivePermissions.data.permissions, null, 2));
    } catch (err: any) {
      console.error('❌ Failed to access Shared Drive:', err.message);
    }
  }

  if (DRIVE_FOLDER_ID) {
    console.log('\n--- Checking Folder Metadata & Permissions ---');
    try {
      const folderInfo = await drive.files.get({
        fileId: DRIVE_FOLDER_ID,
        supportsAllDrives: true,
        fields: 'id,name,capabilities,parents',
      });
      console.log('✅ Folder Accessible:', folderInfo.data.name);
      console.log('   Parents:', folderInfo.data.parents);
      console.log('   Capabilities:', JSON.stringify(folderInfo.data.capabilities, null, 2));
      
      const folderPermissions = await drive.permissions.list({
        fileId: DRIVE_FOLDER_ID,
        supportsAllDrives: true,
        fields: 'permissions(id,emailAddress,role,type,displayName)',
      });
      console.log('   Permissions:');
      console.log(JSON.stringify(folderPermissions.data.permissions, null, 2));
    } catch (err: any) {
      console.error('❌ Failed to access Folder:', err.message);
    }
  }
}

main().catch(console.error);
