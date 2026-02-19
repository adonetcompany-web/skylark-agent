import { NextRequest, NextResponse } from 'next/server';
import { processChat } from '@/lib/agent/gemini';
import { Content } from '@google/genai'; // Correct import from @google/genai

export async function POST(request: NextRequest) {
    try {
        // Parse the request body
        const body = await request.json();

        // Validate the request body structure
        const { message, history } = body as {
            message: string;
            history?: Content[]; // Make history optional
        };

        // Validate message
        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required and must be a string.' },
                { status: 400 }
            );
        }

        // Validate API key
        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is not configured');
            return NextResponse.json(
                {
                    error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file.',
                },
                { status: 500 }
            );
        }

        // Process the chat message
        // Ensure history is always an array (default to empty array if undefined)
        const result = await processChat(message, history || []);

        // Return successful response
        return NextResponse.json({
            response: result.response,
            toolsUsed: result.toolsUsed,
        });

    } catch (error) {
        // Log the error for debugging
        console.error('Chat API error:', error);

        // Return a user-friendly error message
        const errorMessage = error instanceof Error
            ? error.message
            : 'An unexpected error occurred while processing your request.';

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

// Optional: Add a GET method for health check
export async function GET() {
    return NextResponse.json({
        status: 'healthy',
        message: 'Chat API is running',
        timestamp: new Date().toISOString(),
    });
}