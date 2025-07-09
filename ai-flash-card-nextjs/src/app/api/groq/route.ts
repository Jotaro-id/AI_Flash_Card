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
        return NextResponse.json({ data: flashcard });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Groq API error:', error);
    
    if (error instanceof Error && 'status' in error && (error as { status: number }).status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}