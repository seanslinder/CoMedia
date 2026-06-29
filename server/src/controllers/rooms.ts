import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient({});

// POST /rooms
export const createRoom = async (req: Request, res: Response) => {
  const { name, is_private, password } = req.body;
  const user = (req as any).user;

  try {
    let hashedPassword = null;
    if (is_private && password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    
    const room = await prisma.room.create({
      data: {
        name,
        is_private: is_private || false,
        password: hashedPassword,
        owner_id: user.id,
        roomUsers: {
          create: {
            user_id: user.id,
            role: 'admin'
          }
        }
      }
    });
    res.json(room);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /rooms/public
export const getPublicRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { is_private: false }
    });
    res.json(rooms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /rooms/me
export const getMyRooms = async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  try {
    const rooms = await prisma.room.findMany({
      where: { owner_id: user.id }
    });
    res.json(rooms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /rooms/join
export const joinRoom = async (req: Request, res: Response) => {
  const { roomId, password } = req.body;
  const user = (req as any).user;

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    if (room.is_private) {
      const match = await bcrypt.compare(password || '', room.password || '');
      if (!match) {
        return res.status(403).json({ error: 'Invalid password' });
      }
    }

    // Upsert room user mapping
    await prisma.roomUser.upsert({
      where: {
        user_id_room_id: {
          user_id: user.id,
          room_id: roomId
        }
      },
      update: {},
      create: {
        user_id: user.id,
        room_id: roomId,
        role: 'guest'
      }
    });

    res.json({ success: true, room });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /rooms/:id
export const getRoom = async (req: Request<{ id: string }>, res: Response) => {
  const id = req.params.id;
  const user = (req as any).user;
  try {
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        owner: { select: { username: true } },
        roomUsers: { include: { user: { select: { username: true } } } },
        queue: { include: { media: true } }
      }
    });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.is_private && !user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    res.json(room);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Queue operations
// GET /rooms/:id/queue
export const getQueue = async (req: Request<{ id: string }>, res: Response) => {
  const id = req.params.id;
  try {
    const queue = await prisma.queueItem.findMany({
      where: { room_id: id },
      include: { media: true },
      orderBy: { position: 'asc' }
    });
    res.json(queue);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /rooms/:id/queue
export const addToQueue = async (req: Request<{ id: string }>, res: Response) => {
  const room_id = req.params.id;
  const { url } = req.body;

  try {
    let media = await prisma.media.findFirst({ where: { url } });
    if (!media) {
      media = await prisma.media.create({ data: { url, title: 'Video' } });
    }
    
    const aggregate = await prisma.queueItem.aggregate({
      where: { room_id },
      _max: { position: true },
    });
    const position = (aggregate._max.position !== null ? aggregate._max.position : -1) + 1;

    const queueItem = await prisma.queueItem.create({
      data: {
        room_id,
        media_id: media.id,
        position
      },
      include: { media: true }
    });
    
    res.json(queueItem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
