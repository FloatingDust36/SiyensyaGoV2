// In app/services/gemini.ts
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { readAsStringAsync } from 'expo-file-system/legacy';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!API_KEY) throw new Error('Gemini API key not set');

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

async function fileToGenerativePart(uri: string): Promise<Part> {
    const base64Data = await readAsStringAsync(uri, {
        encoding: 'base64',
    });

    return {
        inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg',
        },
    };
}

export async function analyzeImageWithGemini(imageUri: string, userGradeLevel: string = 'Junior High') {
    console.log('Analyzing image with enhanced content prompt...');
    try {
        const imagePart = await fileToGenerativePart(imageUri);

        const prompt = `
            You are "SiyensyaGo," an AI science educator for Filipino students. Your tone is enthusiastic, encouraging, and fun.
            Analyze the image and identify the main object.
            
            Your entire response MUST be a single, valid JSON object following this exact structure:
            {
              "objectName": "Name of the object (e.g., 'A Kalesa').",
              "confidence": <A number from 0-100 indicating your confidence in the identification>,
              "funFact": "A surprising and memorable 'Alam mo ba?' (Did you know?) fact about the object or concept. Make it short and catchy.",
              "the_science_in_action": "A simple, clear explanation of the core scientific concept for a '${userGradeLevel}' student. Align with the Philippine DepEd curriculum.",
              "why_it_matters_to_you": "A clear, relatable example of how this science applies to daily life in the Philippines. (e.g., how understanding friction helps jeepney drivers, how chemistry is used in cooking adobo).",
              "tryThis": "A simple, safe, and exciting 'Subukan mo ito!' (Try this!) activity the student can do right now with the object or common household items.",
              "explore_further": "A fun, thought-provoking question to encourage curiosity (e.g., 'If you could invent a new type of wheel, what would it look like?')."
            }
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const response = result.response;
        const text = response.text();

        console.log("Gemini Response Text:", text);
        const cleanedText = text.replace(/```json\n|```/g, '').trim();
        return JSON.parse(cleanedText);

    } catch (error) {
        console.error('Error analyzing image with Gemini:', error);
        return { error: `Failed to analyze image. ${error instanceof Error ? error.message : String(error)}` };
    }
}