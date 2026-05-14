import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient({});
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret';

// In-memory room state for MVP
type RoomState = {
  isPlaying: boolean;
  currentTime: number;
  lastUpdate: number;
};
const roomStates = new Map<string, RoomState>();

export const initSocket = (server: http.Server) => {
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  // Optional authentication for guest access to public rooms
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as { id: string; username: string } | undefined;
    const displayName = user?.username || 'guest';
    console.log(`User connected: ${displayName}`);

    socket.on('join_room', async (data: { roomId: string }) => {
      const { roomId } = data;
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { is_private: true }
      });
      if (!room) {
        socket.emit('room_error', { error: 'Room not found' });
        return;
      }
      if (room.is_private && !user) {
        socket.emit('auth_required', { error: 'Authentication required' });
        return;
      }
      socket.join(roomId);
      console.log(`${displayName} joined room ${roomId}`);

      // Sync state
      let state = roomStates.get(roomId);
      if (!state) {
        state = { isPlaying: false, currentTime: 0, lastUpdate: Date.now() };
        roomStates.set(roomId, state);
      }
      
      // Calculate current time if playing
      let syncTime = state.currentTime;
      if (state.isPlaying) {
        syncTime += (Date.now() - state.lastUpdate) / 1000;
      }
      
      socket.emit('sync_state', {
        isPlaying: state.isPlaying,
        time: syncTime
      });
    });

    socket.on('send_message', async (data: { roomId: string; text: string }) => {
      const { roomId, text } = data;
      if (!user) {
        socket.emit('auth_required', { error: 'Authentication required' });
        return;
      }
      // Save to db
      await prisma.message.create({
        data: { room_id: roomId, user_id: user.id, text }
      });
      // Broadcast
      io.to(roomId).emit('message_received', {
        user: user.username,
        text,
        time: Date.now()
      });
    });

    socket.on('play', (data: { roomId: string; time: number }) => {
      const { roomId, time } = data;
      roomStates.set(roomId, { isPlaying: true, currentTime: time, lastUpdate: Date.now() });
      socket.to(roomId).emit('play', { time });
    });

    socket.on('pause', (data: { roomId: string; time: number }) => {
      const { roomId, time } = data;
      roomStates.set(roomId, { isPlaying: false, currentTime: time, lastUpdate: Date.now() });
      socket.to(roomId).emit('pause', { time });
    });

    socket.on('seek', (data: { roomId: string; time: number }) => {
      const { roomId, time } = data;
      const state = roomStates.get(roomId);
      roomStates.set(roomId, {
        isPlaying: state ? state.isPlaying : false,
        currentTime: time,
        lastUpdate: Date.now()
      });
      socket.to(roomId).emit('seek', { time });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${displayName}`);
    });
  });
};
