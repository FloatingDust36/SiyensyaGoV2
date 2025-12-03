// app/services/gemini.ts

import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import * as ImageManipulator from 'expo-image-manipulator';
import { SceneContext } from '../navigation/types';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!API_KEY) throw new Error('Gemini API key not set');

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Resizes image before sending to AI to speed up upload
async function fileToGenerativePart(uri: string): Promise<Part> {
  try {
    // Resize to max 800px width and compress (0.7 quality)
    // This reduces payload size by ~60-80%
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    return {
      inlineData: {
        data: manipulated.base64 || '',
        mimeType: 'image/jpeg',
      },
    };
  } catch (error) {
    console.error("Error compressing image for AI:", error);
    throw error;
  }
}

// Stage 1: Detect objects in image with scene context analysis
export async function detectObjectsInImage(imageUri: string) {
  console.log('🔍 Stage 1: Enhanced detection with scene context...');
  try {
    const imagePart = await fileToGenerativePart(imageUri);

    const prompt = `
You are an advanced object detection AI for SiyensyaGo, a Filipino STEM education app.

🎯 DUAL TASK:
1. Detect scientifically interesting objects with bounding boxes
2. Analyze the overall scene context

📐 RETURN FORMAT: Valid JSON only, no markdown, no explanations.

{
  "sceneContext": {
    "location": "workspace|kitchen|classroom|garden|living_room|laboratory|outdoor|other",
    "description": "Brief scene description (1-2 sentences)",
    "suggestedLearningPath": ["object1_name", "object2_name"],
    "relatedConcepts": ["Force", "Energy", "Chemistry"],
    "culturalContext": "Filipino-specific context if applicable"
  },
  "objects": [
    {
      "name": "Water Bottle",
      "confidence": 85,
      "category": "Chemistry",
      "boundingBox": {
        "x": 10,
        "y": 20,
        "width": 30,
        "height": 40
      }
    }
  ]
}

🔍 OBJECT DETECTION RULES:
1. Find 2-8 objects (prioritize larger, clearer items)
2. **CONFIDENCE THRESHOLD: Minimum 60% confidence required**
3. Each object must be scientifically interesting
4. Avoid generic items (wall, floor, background)
5. Categorize each as: Physics, Chemistry, Biology, or Technology

📏 BOUNDING BOX ACCURACY (ULTRA-CRITICAL):

⚠️ COORDINATE SYSTEM:
- ALL values are PERCENTAGES (0-100) relative to FULL image dimensions
- x, y = **EXACT TOP-LEFT CORNER** of the object (NOT center, NOT approximate)
- width, height = **EXACT dimensions** from top-left to bottom-right edge

📐 PRECISION REQUIREMENTS:
1. **Measure from the OUTERMOST visible pixels** of the object
2. **Include shadows/reflections if they're part of the object's visual boundary**
3. **Add 2-3% padding** on all sides to ensure object is fully captured
4. **NO overlapping boxes** - if objects overlap >40%, merge into one bounding box
5. **Minimum object size: 5% of image width/height**
6. **Maximum object size: 90% of image dimensions** (avoid detecting entire scene)

🎯 ACCURACY CHECKLIST (VERIFY EACH BOX):
✓ Top-left corner (x, y) starts at the FIRST visible pixel
✓ Width extends to the LAST visible pixel (right edge)
✓ Height extends to the LAST visible pixel (bottom edge)
✓ 2-3% padding included on all sides
✓ Box does NOT include adjacent objects
✓ Box DOES include all parts of the target object

📝 NAMING RULES:
✅ DO: "Calculator", "Plastic Bottle", "Metal Spoon", "Jeepney"
❌ DON'T: "Kalkulator", "Blue Water Container with White Cap"
- SHORT names (2-4 words max)
- Use English for most objects
- Use natural Filipino terms ONLY for culturally-specific items

🎓 SCENE CONTEXT ANALYSIS:
- Identify overall setting (desk, kitchen, classroom, etc.)
- Suggest logical learning sequence for objects
- List STEM concepts present in scene
- Add Filipino cultural context when relevant

EXAMPLES:

Scene: Study Desk
{
  "sceneContext": {
    "location": "workspace",
    "description": "A student's study area with learning materials and electronic devices.",
    "suggestedLearningPath": ["Laptop", "Calculator", "LED Lamp"],
    "relatedConcepts": ["Electricity", "Circuits", "Energy Efficiency"],
    "culturalContext": "Typical Filipino student setup focused on STEM learning"
  },
  "objects": [
    {
      "name": "Laptop",
      "confidence": 92,
      "category": "Technology",
      "boundingBox": { "x": 15, "y": 20, "width": 35, "height": 40 }
    },
    {
      "name": "Scientific Calculator",
      "confidence": 88,
      "category": "Technology",
      "boundingBox": { "x": 55, "y": 60, "width": 15, "height": 20 }
    }
  ]
}

Scene: Kitchen
{
  "sceneContext": {
    "location": "kitchen",
    "description": "A Filipino kitchen with cooking and food storage items.",
    "suggestedLearningPath": ["Rice Cooker", "Aluminum Pot", "Plastic Container"],
    "relatedConcepts": ["Heat Transfer", "Material Properties", "Food Chemistry"],
    "culturalContext": "Rice cooker is central to Filipino meals, demonstrating heat and steam principles"
  },
  "objects": [
    {
      "name": "Rice Cooker",
      "confidence": 95,
      "category": "Technology",
      "boundingBox": { "x": 30, "y": 25, "width": 25, "height": 35 }
    }
  ]
}

⚠️ CRITICAL REMINDER: Double-check that x, y coordinates point to the TOP-LEFT corner, NOT the center!
`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const text = response.text();

    console.log("📝 Stage 1 Response (first 300 chars):", text.substring(0, 300) + "...");

    // Clean response (remove markdown formatting)
    let cleanedText = text.trim();
    cleanedText = cleanedText.replace(/```json\s*/g, '');
    cleanedText = cleanedText.replace(/```\s*/g, '');

    // Extract JSON
    const jsonStart = cleanedText.indexOf('{');
    const jsonEnd = cleanedText.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error("No valid JSON object found in detection response");
    }

    const jsonString = cleanedText.substring(jsonStart, jsonEnd);
    const parsed = JSON.parse(jsonString);

    // Add unique IDs to objects
    if (parsed.objects && Array.isArray(parsed.objects)) {
      parsed.objects = parsed.objects.map((obj: any, index: number) => ({
        ...obj,
        id: `obj_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`,
      }));
    }

    // Filter by confidence threshold (60%+)
    if (parsed.objects) {
      const originalCount = parsed.objects.length;
      parsed.objects = parsed.objects.filter((obj: any) => obj.confidence >= 60);
      const filteredCount = originalCount - parsed.objects.length;

      if (filteredCount > 0) {
        console.log(`🔽 Filtered out ${filteredCount} low-confidence objects (< 60%)`);
      }
    }

    console.log(`✓ Detected ${parsed.objects.length} objects with scene context`);

    return parsed;

  } catch (error) {
    console.error('❌ Error detecting objects:', error);
    return {
      error: `Failed to detect objects. ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Stage 2: Analyze selected object with optional scene context
export async function analyzeSelectedObject(
  imageUri: string,
  objectName: string,
  boundingBox: { x: number; y: number; width: number; height: number },
  userGradeLevel: string = 'juniorHigh',
  sceneContext?: SceneContext
) {
  console.log(`🔬 Stage 2: Analyzing "${objectName}"${sceneContext ? ' with scene context' : ''}...`);
  try {
    const imagePart = await fileToGenerativePart(imageUri);

    // Grade level context
    const gradeLevelContext = {
      'elementary': {
        audience: 'Grades K-6 students (ages 5-12)',
        language: 'Very simple Tagalog-English mix. Short sentences (10-15 words). Relate to toys, play, everyday activities.',
        complexity: 'Basic observations. Use "parang" comparisons with familiar things.',
        depedFocus: 'Basic science process skills, observation, simple cause-and-effect.'
      },
      'juniorHigh': {
        audience: 'Grades 7-10 students (ages 12-16)',
        language: 'Natural Filipino-English code-switching. Teen-friendly. Reference pop culture, social media.',
        complexity: 'DepEd Science curriculum concepts. Basic formulas with Filipino translations.',
        depedFocus: 'Force, motion, energy, matter, living things, earth science (K-12 curriculum).'
      },
      'seniorHigh': {
        audience: 'Grades 11-12 STEM students (ages 16-18)',
        language: 'Technical English with Filipino context. University-prep level. Career applications.',
        complexity: 'Advanced theories, formulas, research context. STEM career connections.',
        depedFocus: 'Advanced physics, chemistry, biology. Research methodologies. Filipino STEM innovations.'
      }
    };

    const gradeContext = gradeLevelContext[userGradeLevel as keyof typeof gradeLevelContext] || gradeLevelContext['juniorHigh'];

    // Build scene context text if available
    const sceneContextText = sceneContext ? `

🌍 SCENE CONTEXT:
Location: ${sceneContext.location}
Description: ${sceneContext.description}
Related Concepts: ${sceneContext.relatedConcepts.join(', ')}
${sceneContext.culturalContext ? `Cultural Context: ${sceneContext.culturalContext}` : ''}

**IMPORTANT**: Reference this scene context naturally in your explanation. 
Show how "${objectName}" relates to other items in this ${sceneContext.location}.
` : '';

    const prompt = `
You are "SiyensyaGo AI" - an enthusiastic Filipino STEM educator.

🎯 CONTEXT: User selected "${objectName}" from an image.
Bounding box: x=${boundingBox.x}%, y=${boundingBox.y}%, width=${boundingBox.width}%, height=${boundingBox.height}%
${sceneContextText}

Focus ONLY on: "${objectName}"

📚 AUDIENCE: ${gradeContext.audience}
${gradeContext.language}
${gradeContext.complexity}
Focus: ${gradeContext.depedFocus}

🇵🇭 FILIPINO CONTEXT IS CRITICAL:
- Use Filipino examples (jeepney, sari-sari store, bahay kubo, Filipino food, tropical weather)
- Reference Filipino scientists/innovations when relevant
- Connect to daily Filipino life
- Natural code-switching (e.g., "Alam mo ba? This is super cool because...")

🎨 CATEGORIZATION:
Choose ONE primary category:
- "Physics" - forces, motion, energy, waves, electricity, magnetism
- "Chemistry" - matter, reactions, elements, compounds, materials
- "Biology" - living things, cells, ecosystems, body, plants, animals
- "Technology" - machines, electronics, engineering, inventions, tools

CRITICAL: Return ONLY valid JSON. No markdown, no extra text.

{
  "objectName": "${objectName}",
  "confidence": <0-100>,
  "category": "<Physics|Chemistry|Biology|Technology>",
  "funFact": "🤯 Alam mo ba? [Surprising fact. Make it memorable! 2-3 sentences.]",
  "the_science_in_action": "🔬 [Core scientific principle. ${gradeContext.complexity} Use real Filipino examples. Include DepEd topic. 3-4 sentences.]",
  "why_it_matters_to_you": "💡 [Real Filipino life application. How does this affect daily life? ${sceneContext ? 'Connect to scene context.' : ''} 3-4 sentences.]",
  "tryThis": "🧪 Subukan mo ito! [Simple, safe experiment using common Filipino household items. Step-by-step. 3-4 sentences.]",
  "explore_further": "🚀 [Thought-provoking question. Connect to Filipino innovations, future tech, or local problems. ${sceneContext ? 'Reference other objects in scene if relevant.' : ''} 2-3 sentences.]"
}

💎 QUALITY CHECKLIST:
✓ Sounds like a cool Filipino friend explaining science
✓ Uses at least 3 specific Filipino references
✓ DepEd curriculum connection is clear
✓ Activity uses items from typical Filipino home
✓ Tone matches grade level
✓ Category accurately reflects primary science concept
${sceneContext ? '✓ References scene context naturally' : ''}

Focus entirely on "${objectName}"!
        `;

    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const text = response.text();

    console.log("📝 Stage 2 Response (first 200 chars):", text.substring(0, 200) + "...");

    // Clean response
    let cleanedText = text.trim();
    cleanedText = cleanedText.replace(/```json\s*/g, '');
    cleanedText = cleanedText.replace(/```\s*/g, '');

    const jsonStart = cleanedText.indexOf('{');
    const jsonEnd = cleanedText.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error("No valid JSON object found in analysis response");
    }

    const jsonString = cleanedText.substring(jsonStart, jsonEnd);
    const parsed = JSON.parse(jsonString);

    console.log(`✓ Successfully analyzed: ${parsed.objectName}`);
    return parsed;

  } catch (error) {
    console.error('❌ Error analyzing object:', error);
    return {
      error: `Failed to analyze object. ${error instanceof Error ? error.message : String(error)}`
    };
  }
}