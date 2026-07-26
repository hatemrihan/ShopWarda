import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectDB();
    const state = mongoose.connection.readyState;
    const stateMap: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    return NextResponse.json({
      status: 'ok',
      db: stateMap[state] ?? 'unknown',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: 'error', db: 'unreachable' },
      { status: 503 }
    );
  }
}
