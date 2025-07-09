import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { wordBookId, wordCardId, learningStatus } = body;

    if (!wordBookId || !wordCardId || !learningStatus) {
      return NextResponse.json(
        { error: 'Missing required fields: wordBookId, wordCardId, learningStatus' },
        { status: 400 }
      );
    }

    // 有効な学習状況かチェック
    const validStatuses = ['not_started', 'learned', 'uncertain', 'forgot'];
    if (!validStatuses.includes(learningStatus)) {
      return NextResponse.json(
        { error: 'Invalid learning status' },
        { status: 400 }
      );
    }

    // 現在のreview_countを取得
    const { data: currentData } = await supabase
      .from('word_book_cards')
      .select('review_count')
      .eq('word_book_id', wordBookId)
      .eq('word_card_id', wordCardId)
      .single();

    const currentReviewCount = currentData?.review_count || 0;
    const newReviewCount = learningStatus === 'not_started' ? 0 : currentReviewCount + 1;

    // word_book_cardsテーブルの学習状況を更新
    const { data, error } = await supabase
      .from('word_book_cards')
      .update({
        learning_status: learningStatus,
        last_reviewed_at: new Date().toISOString(),
        review_count: newReviewCount
      })
      .eq('word_book_id', wordBookId)
      .eq('word_card_id', wordCardId)
      .select();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update learning status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: data?.[0] || null 
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const wordBookId = url.searchParams.get('wordBookId');

    if (!wordBookId) {
      return NextResponse.json(
        { error: 'Missing wordBookId parameter' },
        { status: 400 }
      );
    }

    // 単語帳の学習統計を取得
    const { data, error } = await supabase
      .from('word_book_cards')
      .select(`
        learning_status,
        word_cards!inner(*)
      `)
      .eq('word_book_id', wordBookId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch learning statistics' },
        { status: 500 }
      );
    }

    // 統計情報を集計
    const stats = {
      total: data.length,
      not_started: data.filter(item => item.learning_status === 'not_started').length,
      learned: data.filter(item => item.learning_status === 'learned').length,
      uncertain: data.filter(item => item.learning_status === 'uncertain').length,
      forgot: data.filter(item => item.learning_status === 'forgot').length,
    };

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}