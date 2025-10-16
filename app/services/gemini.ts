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

// Stage 1: Detect multiple objects with bounding boxes
export async function detectObjectsInImage(imageUri: string) {
    console.log('Stage 1: Detecting objects with bounding boxes...');
    try {
        const imagePart = await fileToGenerativePart(imageUri);

        const prompt = `
You are an object detection AI for a Filipino STEM education app called SiyensyaGo.

🎯 TASK: Analyze this image and detect ALL distinct objects that could be scientifically interesting for students.

📐 RETURN FORMAT: Valid JSON only, no markdown, no explanations.

{
  "objects": [
    {
      "name": "Water Bottle",
      "confidence": 85,
      "boundingBox": {
        "x": 10,
        "y": 20,
        "width": 30,
        "height": 40
      }
    }
  ]
}

🔍 DETECTION RULES:
1. Find 2-8 objects (prioritize larger, clearer objects)
2. Each object must be scientifically relevant (avoid generic items like "background" or "wall")
3. Bounding box coordinates are in PERCENTAGES (0-100) relative to image dimensions
4. **CRITICAL FOR ACCURACY:**
   - x, y = top-left corner of the object (NOT center)
   - width, height = TIGHT bounding box (crop close to object edges)
   - Be PRECISE - measure carefully where the object actually starts and ends
   - Add small padding (2-3%) but don't make boxes too large
   - Avoid including background or other objects in the box

   📏 ACCURACY TIPS:
- For a keyboard: Box should tightly wrap ONLY the keyboard, not the desk
- For a laptop: Box includes screen + base, but not cables or surroundings
- For a pen: Thin vertical box matching pen size
- Double-check coordinates match actual object boundaries
- If uncertain, it's better to UNDERBOX than OVERBOX

📝 NAMING RULES (CRITICAL):
✅ DO:
- Use SHORT, common names (2-4 words max)
- Use English for most objects: "Calculator", "Pen", "Notebook"
- Use natural Filipino terms ONLY for culturally-specific items: "Jeepney", "Bahay Kubo", "Tsinelas"
- Be specific but concise: "Metal Spoon" not "Stainless Steel Kitchen Utensil"

❌ DON'T:
- NO forced Filipino translations like "Kalkulator Pang-Siyensya"
- NO overly descriptive names like "Blue Plastic Water Bottle with White Cap"
- NO generic terms like "Object 1" or "Item"
- NO made-up Filipino terms nobody uses

🇵🇭 FILIPINO TERMS USAGE:
Only use Filipino when it's the ACTUAL term Filipinos use:
- ✅ "Jeepney" (not "Public Transportation Vehicle")
- ✅ "Tsinelas" (not "Slippers" or "Flip-flops")
- ✅ "Bangka" (not "Filipino Boat")
- ❌ NOT "Kalkulator" (say "Calculator")

EXAMPLES OF GOOD NAMES:
✅ "Scientific Calculator"
✅ "Plastic Bottle"
✅ "Metal Spoon"
✅ "Jeepney"
✅ "Potted Plant"
✅ "Computer Mouse"

EXAMPLES OF BAD NAMES:
❌ "Kalkulator Pang-Siyensya (Scientific Calculator)"
❌ "Metallic Eating Utensil"
❌ "Transportasyon na Sasakyan"

Remember: Keep names SHORT and NATURAL!
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const response = result.response;
        const text = response.text();

        console.log("Stage 1 Response (first 300 chars):", text.substring(0, 300) + "...");

        // Clean response
        let cleanedText = text.trim();
        cleanedText = cleanedText.replace(/```json\s*/g, '');
        cleanedText = cleanedText.replace(/```\s*/g, '');

        const jsonStart = cleanedText.indexOf('{');
        const jsonEnd = cleanedText.lastIndexOf('}') + 1;

        if (jsonStart === -1 || jsonEnd === 0) {
            throw new Error("No valid JSON object found in the detection response.");
        }

        const jsonString = cleanedText.substring(jsonStart, jsonEnd);
        const parsed = JSON.parse(jsonString);

        console.log(`✓ Detected ${parsed.objects.length} objects`);
        return parsed;

    } catch (error) {
        console.error('Error detecting objects:', error);
        return { error: `Failed to detect objects. ${error instanceof Error ? error.message : String(error)}` };
    }
}

// Stage 2: Analyze selected object in detail
export async function analyzeSelectedObject(
    imageUri: string,
    objectName: string,
    boundingBox: { x: number; y: number; width: number; height: number },
    userGradeLevel: string = 'Junior High'
) {
    console.log(`Stage 2: Analyzing "${objectName}" in detail...`);
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
You are "SiyensyaGo AI" - an enthusiastic Filipino STEM educator.

🎯 CONTEXT: The user selected "${objectName}" from an image with multiple objects.
The object is located at bounding box: x=${boundingBox.x}%, y=${boundingBox.y}%, width=${boundingBox.width}%, height=${boundingBox.height}%

Focus ONLY on analyzing this specific object: "${objectName}"

📚 AUDIENCE: ${gradeContext.audience}
${gradeContext.language}
${gradeContext.complexity}
Focus: ${gradeContext.depedFocus}

🇵🇭 FILIPINO CONTEXT IS CRITICAL:
- Use Filipino examples (jeepney, sari-sari store, bahay kubo, Filipino food, local weather, etc.)
- Reference Filipino scientists, inventors, and innovations when relevant
- Connect to daily life in the Philippines
- Use relatable Filipino pop culture and trends
- Code-switch naturally (e.g., "Alam mo ba? This is super cool because...")

🎨 CATEGORIZATION:
Assign ONE category based on primary scientific concept:
- "Physics" - forces, motion, energy, waves, electricity, magnetism, mechanics
- "Chemistry" - matter, reactions, elements, compounds, acids/bases, materials
- "Biology" - living things, cells, ecosystems, human body, plants, animals
- "Technology" - machines, electronics, engineering, inventions, tools, devices

CRITICAL: Return ONLY valid JSON. No markdown, no extra text.

{
  "objectName": "${objectName}",
  "confidence": <0-100 number>,
  "category": "<Physics|Chemistry|Biology|Technology>",
  "funFact": "🤯 Alam mo ba? [Surprising fact in ${gradeContext.language}. Make it memorable! 2-3 sentences.]",
  "the_science_in_action": "🔬 [Core scientific principle. ${gradeContext.complexity} Use real Filipino examples. 3-4 sentences. Include DepEd topic if applicable.]",
  "why_it_matters_to_you": "💡 [Real Filipino life application. How does this affect daily life in the Philippines? 3-4 sentences.]",
  "tryThis": "🧪 Subukan mo ito! [Simple, safe experiment using common Filipino household items. Step-by-step. 3-4 sentences.]",
  "explore_further": "🚀 [Thought-provoking question or challenge. Connect to Filipino innovations, future tech, or local problems. 2-3 sentences.]"
}

💎 QUALITY CHECKLIST:
✓ Sounds like a cool Filipino friend explaining science
✓ Uses at least 3 specific Filipino references
✓ DepEd curriculum connection is clear
✓ Activity uses items found in a typical Filipino home
✓ Tone matches grade level
✓ Category accurately reflects primary science concept
✓ All fields have substantial, specific content

Focus entirely on "${objectName}" - ignore other objects in the image!
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const response = result.response;
        const text = response.text();

        console.log("Stage 2 Response (first 200 chars):", text.substring(0, 200) + "...");

        // Clean response
        let cleanedText = text.trim();
        cleanedText = cleanedText.replace(/```json\s*/g, '');
        cleanedText = cleanedText.replace(/```\s*/g, '');

        const jsonStart = cleanedText.indexOf('{');
        const jsonEnd = cleanedText.lastIndexOf('}') + 1;

        if (jsonStart === -1 || jsonEnd === 0) {
            throw new Error("No valid JSON object found in the analysis response.");
        }

        const jsonString = cleanedText.substring(jsonStart, jsonEnd);
        const parsed = JSON.parse(jsonString);

        console.log("✓ Successfully analyzed:", parsed.objectName);
        return parsed;

    } catch (error) {
        console.error('Error analyzing selected object:', error);
        return { error: `Failed to analyze object. ${error instanceof Error ? error.message : String(error)}` };
    }
}