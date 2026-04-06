import COS from 'cos-wx-sdk-v5';
import { getUploadPolicy } from '../services/assets';

const SCENE_LIMITS = {
  main: {
    targetKB: 400,
  },
  detail: {
    targetKB: 700,
  },
} as const;

function getContentType(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

// 兼容开发者工具和真机返回的临时文件路径格式
function toLocalPath(filePath: string): string {
  if (filePath.startsWith('http://tmp/')) {
    return filePath.replace('http://tmp/', 'wxfile://tmp/');
  }
  if (filePath.startsWith('https://tmp/')) {
    return filePath.replace('https://tmp/', 'wxfile://tmp/');
  }
  return filePath;
}

function getReadablePaths(filePath: string): string[] {
  const convertedPath = toLocalPath(filePath);
  return [...new Set([filePath, convertedPath])];
}

// 获取文件大小（异步）
async function getFileSize(filePath: string): Promise<number> {
  const candidates = getReadablePaths(filePath);

  for (const candidate of candidates) {
    try {
      const info = await wx.getFileInfo({ filePath: candidate });
      return info.size || 0;
    } catch (e) {
      console.warn('[Upload] getFileInfo failed for:', candidate, e);
    }
  }

  return 0;
}

function getFileName(filePath: string): string {
  const normalizedPath = filePath.split('?')[0].replace(/\/$/, '');
  return normalizedPath.split('/').pop() || `upload-${Date.now()}.jpg`;
}

async function uploadWithCosDirect(
  filePath: string, 
  policy: Awaited<ReturnType<typeof getUploadPolicy>>
): Promise<string> {
  return new Promise((resolve, reject) => {
    const cos = new COS({
      getAuthorization: (_options, callback) => {
        callback({
          TmpSecretId: policy.credentials.tmpSecretId,
          TmpSecretKey: policy.credentials.tmpSecretKey,
          SecurityToken: policy.credentials.sessionToken || '',
          StartTime: policy.startTime,
          ExpiredTime: policy.expiredTime,
        });
      },
    });

    const candidates = getReadablePaths(filePath);

    const tryUpload = (index: number) => {
      const candidate = candidates[index];
      if (!candidate) {
        reject(new Error(`上传失败: 无法访问临时文件 ${filePath}`));
        return;
      }

      console.log('[Upload] COS uploading file:', candidate);

      cos.uploadFile(
        {
          Bucket: policy.bucket,
          Region: policy.region,
          Key: policy.key,
          FilePath: candidate,
          SliceSize: 1024 * 1024,
          Headers: {
            'Content-Type': getContentType(candidate),
            'Cache-Control': 'public,max-age=31536000,immutable',
          },
          onProgress(progressData) {
            console.log('[Upload] Progress:', Math.round((progressData.percent || 0) * 100));
          },
        },
        (err) => {
          if (!err) {
            console.log('[Upload] Upload success');
            resolve(policy.url);
            return;
          }

          console.warn('[Upload] COS upload failed for:', candidate, err);
          tryUpload(index + 1);
        }
      );
    };

    tryUpload(0);
  });
}

function getPolicyContentType(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
}

export async function selectAndUploadImages(scene: 'main' | 'detail', count = 1) {
  console.log('[Upload] Starting image selection, scene:', scene, 'count:', count);

  try {
    const res = await wx.chooseImage({
      count,
      sourceType: ['album', 'camera'],
      sizeType: ['compressed', 'original'],
    });
    const selectedFiles =
      res.tempFiles?.map((file, index) => ({
        path: file.path || res.tempFilePaths[index],
        size: file.size || 0,
      })) ||
      res.tempFilePaths.map((path) => ({
        path,
        size: 0,
      }));

    console.log('[Upload] Selected', selectedFiles.length, 'images');

    const targetKB = SCENE_LIMITS[scene].targetKB;
    const results: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const tempFile = selectedFiles[i];
      console.log('[Upload] tempFile:', JSON.stringify(tempFile));
      
      const originalPath = tempFile.path;
      const localPath = toLocalPath(originalPath);
      console.log('[Upload] Processing image', i + 1, 'of', selectedFiles.length, 'path:', originalPath, 'size:', tempFile.size);

      try {
        let fileSize = tempFile.size || 0;
        let currentLocalPath = localPath;
        let currentOriginalPath = originalPath;

        if (!fileSize) {
          fileSize = await getFileSize(originalPath);
          console.log('[Upload] Got file size:', Math.round(fileSize / 1024), 'KB');
        }

        if (fileSize === 0) {
          console.warn('[Upload] Cannot get file size, using default 100KB');
          fileSize = 100 * 1024;
        }

        // 如果文件太大，进行压缩
        if (fileSize > targetKB * 1024) {
          try {
            console.log('[Upload] File too large, compressing...');
            const compressRes = await wx.compressImage({
              src: currentOriginalPath,
              quality: 70,
            });
            currentOriginalPath = compressRes.tempFilePath;
            currentLocalPath = compressRes.tempFilePath;
            console.log('[Upload] Compressed path:', currentOriginalPath, '->', currentLocalPath);
            
            fileSize = await getFileSize(currentOriginalPath);
            console.log('[Upload] Compressed size:', Math.round(fileSize / 1024), 'KB');
            if (fileSize === 0) {
              fileSize = 80 * 1024;
            }
          } catch (compressErr: any) {
            console.error('[Upload] Compression error:', compressErr);
          }
        }

        const fileName = getFileName(currentOriginalPath);
        console.log('[Upload] Getting upload policy for:', fileName, 'size:', Math.round(fileSize / 1024), 'KB');

        let policy;
        try {
          policy = await getUploadPolicy({
            biz: 'product',
            scene,
            fileName,
            contentType: getPolicyContentType(currentOriginalPath),
            size: fileSize,
          });
        } catch (policyErr: any) {
          console.error('[Upload] Get policy error:', policyErr);
          throw new Error(`获取上传凭证失败: ${policyErr.message || '服务器错误'}`);
        }

        console.log('[Upload] Uploading to COS...');

        let url: string;
        try {
          url = await uploadWithCosDirect(currentLocalPath, policy);
        } catch (uploadErr: any) {
          console.error('[Upload] COS upload error:', uploadErr);
          throw new Error(`上传图片失败: ${uploadErr.message || 'COS上传错误'}`);
        }

        console.log('[Upload] Upload success:', url);
        results.push(url);
      } catch (err: any) {
        console.error('[Upload] Process image', i + 1, 'failed:', err);
        throw err;
      }
    }

    return results;
  } catch (err: any) {
    console.error('[Upload] chooseMedia failed:', err);
    if (err.errMsg?.includes('cancel')) {
      throw new Error('用户取消选择');
    }
    throw new Error(`选择图片失败: ${err?.errMsg || err?.message || '未知错误'}`);
  }
}
