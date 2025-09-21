import client from "../openai_client";
import { Request, Response } from 'express';
import classify from './classify';
import analyze from './analyze';
import report from './report';

// In-memory conversation storage (in production, use Redis or database)
const conversations: Map<string, any[]> = new Map();

const systemPrompt = `
You are SwachTrack AI Assistant, a helpful civic issue management bot for Indian municipalities. You help citizens report and track civic issues like potholes, streetlights, water logging, garbage problems, etc.

Your capabilities:
1. Help citizens report civic issues by understanding their descriptions
2. Classify issues into appropriate categories
3. Analyze issues and provide estimates for resolution
4. Create comprehensive reports for municipal authorities
5. Answer questions about civic issues and municipal services

When a citizen wants to report an issue:
1. First, understand and clarify the issue details
2. Use the classify function to categorize the issue
3. Use the analyze function to get estimates and recommendations
4. Use the report function to create a complete report
5. Provide the citizen with a report ID and next steps

Be friendly, helpful, and professional. Always ask for clarification if the issue description is unclear. Focus on Indian urban contexts and municipal practices.

Available functions:
- classify_issue(issue_description): Classify a civic issue
- analyze_issue(issue, category, location, severity): Analyze issue and get estimates
- create_report(issue_description): Create a complete report with classification and analysis

Always respond in a conversational manner and guide citizens through the reporting process.
`;

interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'function';
    content: string;
    timestamp?: string;
}

interface ChatRequest {
    message: string;
    session_id?: string;
    conversation_history?: ChatMessage[];
}

interface ChatResponse {
    response: string;
    session_id: string;
    report_id?: string;
    next_steps?: string[];
    conversation_history: ChatMessage[];
}

// Helper function to call classify route
const callClassify = async (issue: string): Promise<any> => {
    const mockReq = { body: { issue } } as Request;
    let result: any;
    
    const mockRes = {
        status: (code: number) => ({
            json: (data: any) => {
                result = data;
                return { status: code, json: () => data };
            }
        }),
        json: (data: any) => { result = data; }
    } as unknown as Response;

    await classify(mockReq, mockRes);
    return result;
};

// Helper function to call analyze route
const callAnalyze = async (issue: string, category: string, location: string, severity_indicators: string): Promise<any> => {
    const mockReq = { 
        body: { 
            issue, 
            category, 
            location, 
            severity_indicators 
        } 
    } as Request;
    let result: any;
    
    const mockRes = {
        status: (code: number) => ({
            json: (data: any) => {
                result = data;
                return { status: code, json: () => data };
            }
        }),
        json: (data: any) => { result = data; }
    } as unknown as Response;

    await analyze(mockReq, mockRes);
    return result;
};

// Helper function to call report route
const callReport = async (issue: string): Promise<any> => {
    const mockReq = { body: { issue } } as Request;
    let result: any;
    
    const mockRes = {
        status: (code: number) => ({
            json: (data: any) => {
                result = data;
                return { status: code, json: () => data };
            }
        }),
        json: (data: any) => { result = data; }
    } as unknown as Response;

    await report(mockReq, mockRes);
    return result;
};

const chat = async (req: Request, res: Response): Promise<void> => {
    try {
        const { message, session_id, conversation_history }: ChatRequest = req.body;

        if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        // Generate session ID if not provided
        const currentSessionId = session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Get or initialize conversation history
        let messages: ChatMessage[] = conversations.get(currentSessionId) || [
            {
                role: 'system',
                content: systemPrompt
            }
        ];

        // Add user message to conversation
        const userMessage: ChatMessage = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        messages.push(userMessage);

        // Create OpenAI messages array, filtering out function messages for the API call
        const openaiMessages = messages
            .filter(msg => msg.role !== 'function')
            .map(msg => ({
                role: msg.role as 'system' | 'user' | 'assistant',
                content: msg.content
            }));

        // Add function definitions for the AI agent
        const functionDefinitions = [
            {
                name: "classify_issue",
                description: "Classify a civic issue into appropriate category",
                parameters: {
                    type: "object",
                    properties: {
                        issue_description: {
                            type: "string",
                            description: "Description of the civic issue to classify"
                        }
                    },
                    required: ["issue_description"]
                }
            },
            {
                name: "analyze_issue",
                description: "Analyze a civic issue and provide estimates",
                parameters: {
                    type: "object",
                    properties: {
                        issue: { type: "string" },
                        category: { type: "string" },
                        location: { type: "string" },
                        severity_indicators: { type: "string" }
                    },
                    required: ["issue", "category", "location", "severity_indicators"]
                }
            },
            {
                name: "create_report",
                description: "Create a complete civic issue report",
                parameters: {
                    type: "object",
                    properties: {
                        issue_description: {
                            type: "string",
                            description: "Description of the civic issue to report"
                        }
                    },
                    required: ["issue_description"]
                }
            }
        ];

        // Get AI response with function calling capability
        const response = await client.chat.completions.create({
            model: "openai/gpt-oss-20b",
            messages: openaiMessages,
            functions: functionDefinitions,
            function_call: "auto",
            temperature: 0.7,
            max_tokens: 1000
        });

        const assistantMessage = response.choices[0].message;
        let finalResponse = assistantMessage?.content || "I'm here to help you with civic issues. How can I assist you today?";
        let reportId: string | undefined;
        let nextSteps: string[] | undefined;

        // Handle function calls if any
        if (assistantMessage?.function_call) {
            const functionName = assistantMessage.function_call.name;
            const functionArgs = JSON.parse(assistantMessage.function_call.arguments || '{}');

            try {
                let functionResult: any;

                switch (functionName) {
                    case 'classify_issue':
                        functionResult = await callClassify(functionArgs.issue_description);
                        finalResponse = `I've classified your issue as: **${functionResult.category}** in **${functionResult.location}**. The severity indicators are: ${functionResult.severity_indicators}. Would you like me to analyze this issue further and create a complete report?`;
                        break;

                    case 'analyze_issue':
                        functionResult = await callAnalyze(
                            functionArgs.issue,
                            functionArgs.category,
                            functionArgs.location,
                            functionArgs.severity_indicators
                        );
                        finalResponse = `Here's the analysis for your issue:\n\n**Time Estimate:** ${functionResult.time_estimate}\n**Cost Estimate:** ${functionResult.cost_estimate}\n**Manpower Required:** ${functionResult.manpower_required}\n**Recommended Company:** ${functionResult.recommended_company}\n**Severity:** ${functionResult.severity}\n\n**Summary:** ${functionResult.summary}`;
                        break;

                    case 'create_report':
                        functionResult = await callReport(functionArgs.issue_description);
                        reportId = functionResult.report_id;
                        nextSteps = functionResult.next_steps;
                        finalResponse = `✅ **Report Created Successfully!**\n\n**Report ID:** ${functionResult.report_id}\n**Status:** ${functionResult.status}\n**Timestamp:** ${functionResult.timestamp}\n\n**Issue Summary:**\n- Category: ${functionResult.classification.category}\n- Location: ${functionResult.classification.location}\n- Severity: ${functionResult.analysis.severity}\n- Estimated Cost: ${functionResult.analysis.cost_estimate}\n- Time Required: ${functionResult.analysis.time_estimate}\n\n**Next Steps:**\n${functionResult.next_steps.map((step: string, index: number) => `${index + 1}. ${step}`).join('\n')}\n\nYour report has been forwarded to the municipal authorities. You can use the Report ID to track the progress.`;
                        break;

                    default:
                        finalResponse = "I'm not sure how to handle that request. Please try again.";
                }

                // Add function call and result to conversation
                messages.push({
                    role: 'assistant',
                    content: assistantMessage.content || '',
                    timestamp: new Date().toISOString()
                });

                messages.push({
                    role: 'function',
                    content: JSON.stringify(functionResult),
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('Function call error:', error);
                finalResponse = "I encountered an error while processing your request. Please try again or provide more details about the issue.";
            }
        }

        // Add assistant response to conversation
        const assistantResponse: ChatMessage = {
            role: 'assistant',
            content: finalResponse,
            timestamp: new Date().toISOString()
        };
        messages.push(assistantResponse);

        // Store updated conversation
        conversations.set(currentSessionId, messages);

        // Prepare response
        const chatResponse: ChatResponse = {
            response: finalResponse,
            session_id: currentSessionId,
            conversation_history: messages,
        };

        if (reportId) {
            chatResponse.report_id = reportId;
        }

        if (nextSteps) {
            chatResponse.next_steps = nextSteps;
        }

        res.status(200).json(chatResponse);

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ 
            error: 'Failed to process chat message',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export default chat;
