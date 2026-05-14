import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import authRoutes from './routes/auth';
import roomRoutes from './routes/rooms';
import { authenticate } from './middleware/auth';
import { initSocket } from './socket';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const mediaDir = process.env.MEDIA_DIR
  ? path.resolve(process.env.MEDIA_DIR)
  : path.resolve(process.cwd(), 'media');
fs.mkdirSync(mediaDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, mediaDir),
    filename: (_req, _file, cb) => {
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.mp4`;
      cb(null, filename);
    }
  }),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'video/mp4') {
      return cb(new Error('Only mp4 videos are allowed'));
    }
    cb(null, true);
  }
});

app.post('/media/upload', authenticate as any, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    const uploadedFile = (req as any).file as Express.Multer.File | undefined;
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ url: `/media/${uploadedFile.filename}` });
  });
});
app.use('/media', express.static(mediaDir));

app.use('/auth', authRoutes);
app.use('/rooms', roomRoutes);

initSocket(server);

server.listen(PORT, () => {
  console.log(`HTTP/WebSocket Server running on http://localhost:${PORT}`);
});
