// In app/services/gemini.ts
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { readAsStringAsync } from 'expo-file-system/legacy';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!API_KEY) throw new Error('Gemini API key not set');

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
    console.log('Analyzing image with enhanced SiyensyaGo prompt...');
    try {
        const imagePart = await fileToGenerativePart(imageUri);

        // Grade level context
        const gradeLevelContext = {
            'elementary': {
                audience: 'Grades K-6 students (ages 5-12)',
                language: 'Use very simple Tagalog-English words. Short sentences (10-15 words max). Relate to toys, cartoons, and everyday play.',
                complexity: 'Basic observations only. Use "parang" (like) comparisons with familiar things (like a toy, like a ball).',
                depedFocus: 'Basic science process skills, observation, and simple cause-and-effect.'
            },
            'juniorHigh': {
                audience: 'Grades 7-10 students (ages 12-16)',
                language: 'Mix of Filipino and English (natural code-switching). Teen-friendly tone. Reference pop culture, social media, trending topics.',
                complexity: 'DepEd Science curriculum concepts. Include basic formulas and scientific terminology with Filipino translations.',
                depedFocus: 'Force, motion, energy, matter, living things, earth science aligned with DepEd K-12 curriculum.'
            },
            'seniorHigh': {
                audience: 'Grades 11-12 students (ages 16-18, STEM track)',
                language: 'More technical English with Filipino context. University-prep level. Reference careers and real-world applications.',
                complexity: 'Advanced theories, formulas, research context. Connect to STEM careers and college pathways.',
                depedFocus: 'Advanced physics, chemistry, biology concepts. Research methodologies. Connect to Filipino STEM innovations.'
            }
        };

        const gradeContext = gradeLevelContext[userGradeLevel as keyof typeof gradeLevelContext] || gradeLevelContext['juniorHigh'];

        const prompt = `
You are "SiyensyaGo AI" - an enthusiastic Filipino STEM educator who makes science relatable, fun, and culturally relevant for ${gradeContext.audience}.

🎯 YOUR MISSION: Transform everyday Filipino objects into exciting learning moments that connect to students' lives.

📸 ANALYZE THIS IMAGE and identify the main object.

🧬 RESPONSE RULES:
${gradeContext.language}
${gradeContext.complexity}
Focus: ${gradeContext.depedFocus}

🇵🇭 FILIPINO CONTEXT IS CRITICAL:
- Use Filipino examples (jeepney, sari-sari store, bahay kubo, Filipino food, local weather, etc.)
- Reference Filipino scientists, inventors, and innovations when relevant
- Connect to daily life in the Philippines (init, tag-ulan, brownouts, flooding, etc.)
- Use relatable Filipino pop culture and trends
- Code-switch naturally (e.g., "Alam mo ba? This is super cool because...")

📚 DEPED ALIGNMENT:
- Map concepts to specific DepEd K-12 Science curriculum topics
- Use DepEd terminology and learning competencies
- Connect to actual lessons students learn in Philippine classrooms

🎨 CATEGORIZATION:
Assign ONE category based on primary scientific concept:
- "Physics" - forces, motion, energy, waves, electricity, magnetism, mechanics
- "Chemistry" - matter, reactions, elements, compounds, acids/bases, materials
- "Biology" - living things, cells, ecosystems, human body, plants, animals
- "Technology" - machines, electronics, engineering, inventions, tools, devices

CRITICAL: Return ONLY valid JSON. No markdown, no extra text.

{
  "objectName": "Descriptive Filipino-relevant name (e.g., 'Plastic na Bote ng Tubig', 'Metal Spoon', 'Lumang Libro')",
  "confidence": <0-100 number>,
  "category": "<Physics|Chemistry|Biology|Technology>",
  "funFact": "🤯 Alam mo ba? [Surprising fact in ${gradeContext.language}. Make it memorable and wow-worthy! 2-3 sentences max.]",
  "the_science_in_action": "🔬 [Core scientific principle explanation. ${gradeContext.complexity} Use real Filipino examples. 3-4 sentences. Include specific DepEd topic if applicable (e.g., 'This connects to Grade 8 Science: Force and Motion')]",
  "why_it_matters_to_you": "💡 [Real Filipino life application. How does this affect daily life in the Philippines? Reference specific situations - commuting, cooking Filipino food, dealing with weather, etc. Make it personal and relatable. 3-4 sentences.]",
  "tryThis": "🧪 Subukan mo ito! [Simple, safe experiment using common Filipino household items (found in a typical sari-sari store or bahay). Step-by-step. Make it exciting! 3-4 sentences.]",
  "explore_further": "🚀 [Thought-provoking question or challenge. Connect to Filipino innovations, future tech, or local problems that need solving. Inspire curiosity! 2-3 sentences. For Senior High: mention potential STEM careers.]"
}

💎 QUALITY CHECKLIST:
✓ Sounds like a cool Filipino friend explaining science, not a textbook
✓ Uses at least 3 specific Filipino references
✓ DepEd curriculum connection is clear
✓ Activity uses items found in a typical Filipino home
✓ Tone matches grade level (playful for Elementary, relatable for JHS, career-focused for SHS)
✓ Category accurately reflects primary science concept
✓ All fields are filled with substantial, specific content (no generic fluff)

Remember: You're not just explaining science - you're showing Filipino students that STEM is everywhere in THEIR world! 🇵🇭🔬✨
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const response = result.response;
        const text = response.text();

        console.log("Gemini Response (first 200 chars):", text.substring(0, 200) + "...");

        // Clean response
        let cleanedText = text.trim();
        cleanedText = cleanedText.replace(/```json\s*/g, '');
        cleanedText = cleanedText.replace(/```\s*/g, '');

        const jsonStart = cleanedText.indexOf('{');
        const jsonEnd = cleanedText.lastIndexOf('}') + 1;

        if (jsonStart === -1 || jsonEnd === 0) {
            console.error("No valid JSON found. Response:", text);
            throw new Error("No valid JSON object found in the Gemini response.");
        }

        const jsonString = cleanedText.substring(jsonStart, jsonEnd);
        const parsed = JSON.parse(jsonString);

        console.log("✓ Successfully parsed:", parsed.objectName, "| Category:", parsed.category);
        return parsed;

    } catch (error) {
        console.error('Error analyzing image with Gemini:', error);
        return { error: `Failed to analyze image. ${error instanceof Error ? error.message : String(error)}` };
    }
}