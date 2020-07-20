import multer from 'multer';
import crypto from 'crypto';
import path from 'path';

const tmpFolder = path.resolve(__dirname, '..', '..', 'tmp');

export default {
  directory: tmpFolder,
  storage: multer.diskStorage({
    destination: path.resolve(__dirname, '..', '..', 'tmp'),
    filename(req, file, cb) {
      const { originalname } = file;
      const fileHash = crypto.randomBytes(8).toString('hex');
      const extname = path.extname(originalname);
      if (!(extname === '.csv'))
        return cb(
          new Error(`Unsupported file format ${extname}`),
          `${fileHash}-${file.originalname}`,
        );
      return cb(null, `${fileHash}-${file.originalname}`);
    },
  }),
};
