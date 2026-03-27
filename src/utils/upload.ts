import Taro from '@tarojs/taro';
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

async function getFileSize(filePath: string) {
  const fileInfo = await Taro.getFileInfo({ filePath });
  return fileInfo.size || 0;
}

async function compressImage(filePath: string, targetKB: number) {
  const qualities = [82, 70, 58, 45];
  let currentPath = filePath;

  for (const quality of qualities) {
    const size = await getFileSize(currentPath);
    if (size <= targetKB * 1024) {
      return currentPath;
    }

    const result = await Taro.compressImage({
      src: currentPath,
      quality,
    });
    currentPath = result.tempFilePath;
  }

  return currentPath;
}

function uploadWithCos(filePath: string, policy: Awaited<ReturnType<typeof getUploadPolicy>>) {
  return new Promise<string>((resolve, reject) => {
    const cos = new COS({
      getAuthorization: (_options, callback) => {
        callback({
          TmpSecretId: policy.credentials.tmpSecretId,
          TmpSecretKey: policy.credentials.tmpSecretKey,
          SecurityToken: policy.credentials.sessionToken,
          StartTime: policy.startTime,
          ExpiredTime: policy.expiredTime,
        });
      },
    });

    cos.putObject(
      {
        Bucket: policy.bucket,
        Region: policy.region,
        Key: policy.key,
        FilePath: filePath,
      },
      (err) => {
        if (err) {
          reject(new Error('图片上传失败'));
          return;
        }

        resolve(policy.url);
      }
    );
  });
}

export async function selectAndUploadImages(scene: 'main' | 'detail', count = 1) {
  const chooser = await Taro.chooseImage({
    count,
    sizeType: ['compressed', 'original'],
    sourceType: ['album', 'camera'],
  });

  const targetKB = SCENE_LIMITS[scene].targetKB;
  const results: string[] = [];

  for (const filePath of chooser.tempFilePaths) {
    const compressedPath = await compressImage(filePath, targetKB);
    const fileName = compressedPath.split('/').pop() || `upload-${Date.now()}.jpg`;
    const fileSize = await getFileSize(compressedPath);
    const policy = await getUploadPolicy({
      biz: 'product',
      scene,
      fileName,
      contentType: getContentType(compressedPath),
      size: fileSize,
    });
    const url = await uploadWithCos(compressedPath, policy);
    results.push(url);
  }

  return results;
}
