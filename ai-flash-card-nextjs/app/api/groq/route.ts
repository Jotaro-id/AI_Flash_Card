import { NextRequest, NextResponse } from 'next/server';
import { GroqService } from '@/src/services/groq';

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
          difficulty
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
      stack: error instanceof Error ? error.stack : undefined
    });
    
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
    if (error instanceof Error && 'status' in error && (error as { status: number }).status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    // その他のエラー
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}