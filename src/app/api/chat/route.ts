import { NextRequest, NextResponse } from 'next/server';
import { getDataFromToken } from '@/utils/get_token_data';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Get user data from token
    const tokenData = await getDataFromToken();
    if (!tokenData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message } = await request.json();

    console.log("messagee: ", message);
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Generate AI response using OpenAI GPT-4
    const response = await generateAIResponse(message, tokenData);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Generate AI response using OpenAI GPT-4
async function generateAIResponse(message: string, tokenData: any): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
            role: "system",
            content: `You are an AI assistant specialized in OSHA (Occupational Safety and Health Administration) standards and workplace safety regulations.
            You ONLY answer OSHA-related queries. 
            If a user asks something outside OSHA or workplace safety, politely refuse and redirect them back to OSHA compliance and training.
            Always provide answers referencing OSHA guidelines, training requirements, and compliance best practices. 
            Keep responses practical and clear, as if guiding an employer, employee, or safety officer.`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error: any) {
    console.error('OpenAI API error:', error.message);
    
    // Fallback response if OpenAI fails
    return "I'm experiencing some technical difficulties right now. Please try again in a moment, or contact support if the issue persists.";
  }
}
