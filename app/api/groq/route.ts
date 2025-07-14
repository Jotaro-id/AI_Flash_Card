import { NextRequest, NextResponse } from 'next/server';
import { GroqService } from '@/services/groq';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, action, context, difficulty, targetLanguage } = body;

    if (!word) {
      return NextResponse.json(
        { error: 'Word is required' },
        { status: 400 }
      );
    }

    const groqService = new GroqService();

    switch (action) {
      case 'generateInfo':
        const info = await groqService.generateWordInfo(word, targetLanguage || 'ja');
        return NextResponse.json({ data: info });

      case 'generateFlashcard':
        const flashcard = await groqService.generateFlashcardContent(
          word,
          context,
          difficulty,
          targetLanguage
        );
        console.log('Generated flashcard:', JSON.stringify(flashcard, null, 2));
        return NextResponse.json({ data: flashcard });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Groq API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name,
      errorObject: error
    });
    
    // 詳細なエラー情報を開発モードで出力
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error object:', JSON.stringify(error, null, 2));
      console.error('Request details:', {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries())
      });
    }
    
    // APIキー未設定エラーの特別な処理
    if (error instanceof Error && error.message.includes('GROQ_API_KEY')) {
      return NextResponse.json(
        { 
          error: 'AI service not configured',
          message: 'GROQ API key is not set. Please add GROQ_API_KEY to your .env.local file.',
          setupUrl: 'https://console.groq.com/keys',
          fallbackMode: true
        },
        { status: 503 }
      );
    }
    
    // レート制限エラー
    if (error instanceof Error) {
      // Groq SDKのレート制限エラーをチェック
      if (error.message.includes('429') || 
          error.message.includes('rate_limit_exceeded') || 
          error.message.includes('Rate limit') ||
          (error as { status?: number }).status === 429) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            message: 'API rate limit exceeded. Please try again in a minute.',
            retryAfter: 60
          },
          { status: 429 }
        );
      }
      
      // タイムアウトエラー
      if (error.message.includes('timeout') || error.message.includes('AbortError')) {
        return NextResponse.json(
          { 
            error: 'Request timeout',
            message: 'The request took too long to complete. Please try again.'
          },
          { status: 504 }
        );
      }
    }
    
    // その他のエラー
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          type: error?.constructor?.name,
          stack: error instanceof Error ? error.stack : undefined,
          fullError: JSON.stringify(error, null, 2)
        } : undefined
      },
      { status: 500 }
    );
  }
}