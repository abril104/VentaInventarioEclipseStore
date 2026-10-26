import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function GET() {
  try {
    const slider = StoreRepository.getSliderSettings();
    return NextResponse.json({ slider });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    StoreRepository.updateSliderSettings(body);
    return NextResponse.json({ success: true, slider: body });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
