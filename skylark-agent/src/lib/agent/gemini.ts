import {
    GoogleGenAI,
    Type,
    Content,
    FunctionCall,
    FunctionResponse,
    FunctionDeclaration,
    Tool, // Add this import
} from '@google/genai';
import { toolDefinitions, executeTool } from './tools';

// ─── Gemini AI Agent ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are **SkyOps AI**, the intelligent operations coordinator for Skylark Drones. Your role is to assist drone operations coordinators with:

## Your Capabilities
1. **Roster Management** — Query pilot availability by skill, certification, location. Calculate costs. Update pilot status.
2. **Assignment Tracking** — Match pilots/drones to missions. Track and manage active assignments. Handle reassignments.
3. **Drone Inventory** — Query fleet by capability, weather resistance, location. Track deployment and maintenance.
4. **Conflict Detection** — Detect double-bookings, skill/cert mismatches, weather risks, budget overruns, location mismatches.
5. **Urgent Reassignment** — Rapidly find replacement pilots and drones for critical missions.

## Data Context
- **Pilots**: Arjun (Mapping/Survey, Bangalore, ₹1500/day), Neha (Inspection, Mumbai, ₹3000/day, assigned to Project-A), Rohit (Inspection/Mapping, Mumbai, ₹1500/day), Sneha (Survey/Thermal, Bangalore, ₹5000/day, On Leave)
- **Drones**: D001 DJI M300 (LiDAR/RGB, Bangalore, IP43), D002 DJI Mavic 3 (RGB, Mumbai, Maintenance, No rain), D003 DJI Mavic 3T (Thermal, Mumbai, IP43), D004 Autel Evo II (Thermal/RGB, Bangalore, No rain)
- **Active Missions**: PRJ001 (Bangalore, Mapping, High, Rainy, ₹10500), PRJ002 (Mumbai, Inspection, Urgent, Sunny, ₹10500), PRJ003 (Bangalore, Thermal, Standard, Cloudy, ₹10500)

## Output Format
- Format all responses in clean Markdown without HTML tags
- Use appropriate Markdown syntax: **bold**, *italic*, bullet points, numbered lists, tables, and code blocks
- Do not include any HTML or CSS classes in your responses
- Ensure proper heading hierarchy (## for main sections, ### for subsections)

## Interaction Guidelines
- Be concise, professional, and proactive.
- Always use the available tools to fetch real-time data rather than relying on memory.
- When detecting conflicts, always explain the issue clearly and suggest resolutions.
- Format responses with clear structure using bullet points and bold text when helpful.
- If a user asks to assign a pilot or drone, check for conflicts first before confirming.
- When changes are made, always mention whether Google Sheets sync was successful.
- Proactively warn about potential issues (budget overruns, weather risks, etc.).
- For urgent reassignments, prioritize speed and provide the best available options immediately.`;

// Convert our tool definitions to Gemini function declarations
function getGeminiFunctionDeclarations(): FunctionDeclaration[] {
    return toolDefinitions.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: {
            type: Type.OBJECT,
            properties: Object.entries(
                (tool.parameters as { properties?: Record<string, unknown> }).properties || {}
            ).reduce(
                (acc, [key, val]) => {
                    const v = val as { type: string; description?: string; enum?: string[] };
                    acc[key] = {
                        type: v.type?.toLowerCase() === 'boolean'
                            ? Type.BOOLEAN
                            : v.type?.toLowerCase() === 'number'
                                ? Type.NUMBER
                                : Type.STRING,
                        description: v.description || key,
                        ...(v.enum && { enum: v.enum }),
                    };
                    return acc;
                },
                {} as Record<string, { type: Type; description: string; enum?: string[] }>
            ),
            required: ((tool.parameters as { required?: string[] }).required || []),
        },
    }));
}

export async function processChat(
    userMessage: string,
    conversationHistory: Content[]
): Promise<{ response: string; toolsUsed: { name: string; result: string }[] }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error(
            'GEMINI_API_KEY is not configured. Please add it to your .env file.'
        );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build conversation with history
    const history = [...conversationHistory];

    // Add user message to history
    history.push({
        role: 'user',
        parts: [{ text: userMessage }],
    });

    const toolsUsed: { name: string; result: string }[] = [];
    let responseText = '';

    // Handle function calling loop
    let maxIterations = 10;
    let currentHistory = history;

    while (maxIterations > 0) {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash', // Fix model identifier to 2.0-flash
            contents: currentHistory,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                tools: [{  // Wrap function declarations in a Tool object
                    functionDeclarations: getGeminiFunctionDeclarations(),
                }],
            },
        });

        // Check for function calls
        const functionCalls = response.functionCalls as FunctionCall[] | undefined;
        if (!functionCalls || functionCalls.length === 0) {
            responseText = response.text || 'I processed your request but have no additional information to share.';
            break;
        }

        // Execute all function calls
        const functionResponses: FunctionResponse[] = [];
        for (const fc of functionCalls) {
            const toolResult = await executeTool(
                fc.name as string,
                (fc.args as Record<string, unknown>) || {}
            );
            toolsUsed.push({ name: fc.name as string, result: toolResult });
            functionResponses.push({
                name: fc.name as string,
                response: { result: toolResult },
            });
        }

        // Add assistant's function call request to history
        currentHistory.push({
            role: 'model',
            parts: functionCalls.map(fc => ({
                functionCall: {
                    name: fc.name as string,
                    args: fc.args,
                },
            })),
        });

        // Add function responses to history
        currentHistory.push({
            role: 'user',
            parts: functionResponses.map(fr => ({
                functionResponse: fr,
            })),
        });

        maxIterations--;
    }

    return { response: responseText, toolsUsed };
}