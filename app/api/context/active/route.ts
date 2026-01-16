/**
 * ActiveContext API
 * GET: 取得
 * PUT: 設定
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActiveContext, setActiveContext } from '@/kb/db-server';
import { activeContextSchema } from '@/kb/schemas';

/**
 * GET /api/context/active
 * ActiveContext取得
 */
export async function GET(request: NextRequest) {
  try {
    const context = getActiveContext();
    return NextResponse.json({ context }, { status: 200 });
  } catch (error) {
    console.error('GET /api/context/active error:', error);
    return NextResponse.json({ error: 'Failed to fetch active context' }, { status: 500 });
  }
}

/**
 * PUT /api/context/active
 * ActiveContext設定
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // リクエストを検証
    const validated = activeContextSchema.parse(body);

    setActiveContext(validated);

    return NextResponse.json({ context: validated }, { status: 200 });
  } catch (error: any) {
    console.error('PUT /api/context/active error:', error);

    // zodバリデーションエラー
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: error.message || 'Failed to set active context' }, { status: 400 });
  }
}
