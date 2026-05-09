import { applyDecorators, UnsupportedMediaTypeException, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const FIVE_MB = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

const uploadOptions: MulterOptions = {
  limits: {
    fileSize: FIVE_MB,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new UnsupportedMediaTypeException(
          'Only JPG, JPEG, PNG images and PDF files are allowed',
        ),
        false,
      );
      return;
    }
    callback(null, true);
  },
};

export function S3SingleFile(fieldName: string): MethodDecorator {
  return applyDecorators(UseInterceptors(FileInterceptor(fieldName, uploadOptions)));
}

export function S3FileFields(
  fields: Array<{ name: string; maxCount?: number }>,
): MethodDecorator {
  return applyDecorators(UseInterceptors(FileFieldsInterceptor(fields, uploadOptions)));
}
