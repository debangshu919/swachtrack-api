//@ts-nocheck
import { Handler } from "netlify:edge";
import client from "../../src/openai_client.ts";

// Simple Netlify function handler
export const handler: Handler = async (event) => {
  const { httpMethod, path, headers, body, queryStringParameters } = event;

  // Parse request body if present
  let requestBody: any = null;
  if (body && httpMethod !== "GET") {
    try {
      requestBody = JSON.parse(body);
    } catch (error) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Invalid JSON in request body",
          timestamp: new Date().toISOString(),
        }),
      };
    }
  }

  // Handle different routes
  switch (path) {
    case "/api/chat":
      if (httpMethod !== "POST") {
        return {
          statusCode: 405,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: "Method Not Allowed",
            message: "Only POST method is allowed for this endpoint",
          }),
        };
      }

      try {
        const { message, session_id, conversation_history } = requestBody || {};
        if (!message) {
          return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Message is required" }),
          };
        }

        // In-memory conversation storage (per function instance)
        if (!globalThis.conversations) {
          globalThis.conversations = new Map();
        }
        const conversations = globalThis.conversations;

        const systemPrompt = `You are SwachTrack AI Assistant, a helpful civic issue management bot for Indian municipalities. You help citizens report and track civic issues like potholes, streetlights, water logging, garbage problems, etc.\n\nYour capabilities:\n1. Help citizens report civic issues by understanding their descriptions\n2. Classify issues into appropriate categories\n3. Analyze issues and provide estimates for resolution\n4. Create comprehensive reports for municipal authorities\n5. Answer questions about civic issues and municipal services\n\nWhen a citizen wants to report an issue:\n1. First, understand and clarify the issue details\n2. Use the classify function to categorize the issue\n3. Use the analyze function to get estimates and recommendations\n4. Use the report function to create a complete report\n5. Provide the citizen with a report ID and next steps\n\nBe friendly, helpful, and professional. Always ask for clarification if the issue description is unclear. Focus on Indian urban contexts and municipal practices.\n\nAvailable functions:\n- classify_issue(issue_description): Classify a civic issue\n- analyze_issue(issue, category, location, severity): Analyze issue and get estimates\n- create_report(issue_description): Create a complete report with classification and analysis\n\nAlways respond in a conversational manner and guide citizens through the reporting process.`;

        // Generate session ID if not provided
        const currentSessionId =
          session_id ||
          `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        let messages = conversations.get(currentSessionId) || [
          { role: "system", content: systemPrompt },
        ];

        // Add user message
        messages.push({
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        });

        // Prepare OpenAI messages
        const openaiMessages = messages
          .filter((msg) => msg.role !== "function")
          .map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));

        // Function definitions
        const functionDefinitions = [
          {
            name: "classify_issue",
            description: "Classify a civic issue into appropriate category",
            parameters: {
              type: "object",
              properties: {
                issue_description: {
                  type: "string",
                  description: "Description of the civic issue to classify",
                },
              },
              required: ["issue_description"],
            },
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
                severity_indicators: { type: "string" },
              },
              required: [
                "issue",
                "category",
                "location",
                "severity_indicators",
              ],
            },
          },
          {
            name: "create_report",
            description: "Create a complete civic issue report",
            parameters: {
              type: "object",
              properties: {
                issue_description: {
                  type: "string",
                  description: "Description of the civic issue to report",
                },
              },
              required: ["issue_description"],
            },
          },
        ];

        // Helper functions for classify, analyze, report
        async function callClassify(issue) {
          const classifySystemPrompt = `You are an AI classifier for civic issues reported by citizens in Indian cities. You receive a description or image-based details of the problem. Your job is to:\n\n1. Classify the issue into exactly one of these categories relevant to Indian urban contexts: \"streetlights\", \"potholes\", \"overflowing dustbins\", \"water logging\", \"roadblocks\", \"broken footpaths\", \"garbage dumping\", or \"other civic issues\". Choose only one category that best fits the report. If the issue is unclear or does not fit any, select \"other civic issues\".\n\n2. Extract the location mentioned in the issue description. If no specific location is mentioned, infer a general area or return \"Location not specified\".\n\n3. Assess severity indicators based on the description, considering factors like:\n   - Traffic impact\n   - Safety concerns\n   - Environmental impact\n   - Population density\n   - Weather conditions (monsoon, etc.)\n   - Urgency level\n\nReturn all three pieces of information in the specified JSON format.`;
          const classifyMessages = [
            { role: "system", content: classifySystemPrompt },
            { role: "user", content: issue },
          ];
          const response = await client.chat.completions.create({
            model: "openai/gpt-oss-20b",
            messages: classifyMessages,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "classification_schema",
                schema: {
                  type: "object",
                  properties: {
                    issue: { type: "string" },
                    category: { type: "string" },
                    location: { type: "string" },
                    severity_indicators: { type: "string" },
                  },
                  required: [
                    "issue",
                    "category",
                    "location",
                    "severity_indicators",
                  ],
                  additionalProperties: false,
                },
              },
            },
          });
          const assistantMessage = response.choices[0].message?.content ?? "{}";
          return JSON.parse(assistantMessage);
        }

        async function callAnalyze(
          issue,
          category,
          location,
          severity_indicators
        ) {
          const analyzeSystemPrompt = `You are an AI assistant specializing in civic issue management for Indian municipalities. Given a detailed report with issue category, location in an Indian city, severity indicators (urgency, damage extent), and any textual or visual context, perform these tasks:\n\n- Estimate the time, cost (in INR), and manpower needed to fix the issue based on typical Indian municipal standards.\n- Recommend the best suitable Indian company or local contractor for this issue, considering region, company expertise, and availability.\n- Assess the severity on a scale (low, medium, high) incorporating factors such as monsoon impact, population density, and traffic conditions typical of Indian cities.\n- Generate a concise summary that includes issue category, resource estimates, recommended company, severity level, and critical notes.\n\nEXAMPLE:\n{\n\"time_estimate\": \"2 days\",\n\"cost_estimate\": \"₹35,000\",\n\"manpower_required\": \"5 workers\",\n\"recommended_company\": \"Delhi Urban Services Ltd.\",\n\"severity\": \"high\",\n\"summary\": \"Water logging reported near MG Road, Mumbai. Estimated repair time 2 days with moderate cost. Delhi Urban Services Ltd. recommended due to proven expertise. Severity high due to monsoon season and heavy traffic.\"\n}\n\nNOTE: Make sure all responses suit the urban Indian environment and municipal practices.`;
          const analysisPrompt = `\n        Issue: ${issue}\n        Category: ${category}\n        Location: ${location}\n        Severity Indicators: ${severity_indicators}\n        \n        Please analyze this civic issue and provide detailed estimates and recommendations.\n        `;
          const analyzeMessages = [
            { role: "system", content: analyzeSystemPrompt },
            { role: "user", content: analysisPrompt },
          ];
          const response = await client.chat.completions.create({
            model: "openai/gpt-oss-20b",
            messages: analyzeMessages,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "analysis_schema",
                schema: {
                  type: "object",
                  properties: {
                    time_estimate: { type: "string" },
                    cost_estimate: { type: "string" },
                    manpower_required: { type: "string" },
                    recommended_company: { type: "string" },
                    severity: { type: "string" },
                    summary: { type: "string" },
                  },
                  required: [
                    "time_estimate",
                    "cost_estimate",
                    "manpower_required",
                    "recommended_company",
                    "severity",
                    "summary",
                  ],
                  additionalProperties: false,
                },
              },
            },
          });
          const assistantMessage = response.choices[0].message?.content ?? "{}";
          return JSON.parse(assistantMessage);
        }

        async function callReport(issue) {
          // Step 1: Classify
          const classification = await callClassify(issue);
          // Step 2: Analyze
          const analysis = await callAnalyze(
            classification.issue,
            classification.category,
            classification.location,
            classification.severity_indicators
          );
          // Step 3: Compose report
          return {
            report_id: `RPT-${Date.now()}`,
            timestamp: new Date().toISOString(),
            original_issue: issue,
            classification: {
              issue: classification.issue,
              category: classification.category,
              location: classification.location,
              severity_indicators: classification.severity_indicators,
            },
            analysis: {
              time_estimate: analysis.time_estimate,
              cost_estimate: analysis.cost_estimate,
              manpower_required: analysis.manpower_required,
              recommended_company: analysis.recommended_company,
              severity: analysis.severity,
              summary: analysis.summary,
            },
            status: "processed",
            next_steps: [
              "Forward to municipal department",
              "Assign to recommended contractor",
              "Schedule repair work",
              "Monitor progress",
            ],
          };
        }

        // Get AI response with function calling capability
        const response = await client.chat.completions.create({
          model: "openai/gpt-oss-20b",
          messages: openaiMessages,
          functions: functionDefinitions,
          function_call: "auto",
          temperature: 0.7,
          max_tokens: 1000,
        });

        const assistantMessage = response.choices[0].message;
        let finalResponse =
          assistantMessage?.content ||
          "I'm here to help you with civic issues. How can I assist you today?";
        let reportId;
        let nextSteps;

        // Handle function calls if any
        if (assistantMessage?.function_call) {
          const functionName = assistantMessage.function_call.name;
          const functionArgs = JSON.parse(
            assistantMessage.function_call.arguments || "{}"
          );
          let functionResult;
          try {
            switch (functionName) {
              case "classify_issue":
                functionResult = await callClassify(
                  functionArgs.issue_description
                );
                finalResponse = `I've classified your issue as: **${functionResult.category}** in **${functionResult.location}**. The severity indicators are: ${functionResult.severity_indicators}. Would you like me to analyze this issue further and create a complete report?`;
                break;
              case "analyze_issue":
                functionResult = await callAnalyze(
                  functionArgs.issue,
                  functionArgs.category,
                  functionArgs.location,
                  functionArgs.severity_indicators
                );
                finalResponse = `Here's the analysis for your issue:\n\n**Time Estimate:** ${functionResult.time_estimate}\n**Cost Estimate:** ${functionResult.cost_estimate}\n**Manpower Required:** ${functionResult.manpower_required}\n**Recommended Company:** ${functionResult.recommended_company}\n**Severity:** ${functionResult.severity}\n\n**Summary:** ${functionResult.summary}`;
                break;
              case "create_report":
                functionResult = await callReport(
                  functionArgs.issue_description
                );
                reportId = functionResult.report_id;
                nextSteps = functionResult.next_steps;
                finalResponse = `✅ **Report Created Successfully!**\n\n**Report ID:** ${
                  functionResult.report_id
                }\n**Status:** ${functionResult.status}\n**Timestamp:** ${
                  functionResult.timestamp
                }\n\n**Issue Summary:**\n- Category: ${
                  functionResult.classification.category
                }\n- Location: ${
                  functionResult.classification.location
                }\n- Severity: ${
                  functionResult.analysis.severity
                }\n- Estimated Cost: ${
                  functionResult.analysis.cost_estimate
                }\n- Time Required: ${
                  functionResult.analysis.time_estimate
                }\n\n**Next Steps:**\n${functionResult.next_steps
                  .map((step, index) => `${index + 1}. ${step}`)
                  .join(
                    "\n"
                  )}\n\nYour report has been forwarded to the municipal authorities. You can use the Report ID to track the progress.`;
                break;
              default:
                finalResponse =
                  "I'm not sure how to handle that request. Please try again.";
            }
            // Add function call and result to conversation
            messages.push({
              role: "assistant",
              content: assistantMessage.content || "",
              timestamp: new Date().toISOString(),
            });
            messages.push({
              role: "function",
              content: JSON.stringify(functionResult),
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            console.error("Function call error:", error);
            finalResponse =
              "I encountered an error while processing your request. Please try again or provide more details about the issue.";
          }
        }

        // Add assistant response to conversation
        messages.push({
          role: "assistant",
          content: finalResponse,
          timestamp: new Date().toISOString(),
        });
        // Store updated conversation
        conversations.set(currentSessionId, messages);

        // Prepare response
        // Filter out system prompt from conversation_history in response
        const filteredHistory = messages.filter((m) => m.role !== "system");
        const chatResponse = {
          response: finalResponse,
          session_id: currentSessionId,
          conversation_history: filteredHistory,
        };
        if (reportId) chatResponse.report_id = reportId;
        if (nextSteps) chatResponse.next_steps = nextSteps;

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chatResponse),
        };
      } catch (error) {
        console.error("Chat error:", error);
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: "Failed to process chat message",
            details: error instanceof Error ? error.message : "Unknown error",
          }),
        };
      }
    case "/":
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Welcome to SwachTrack API",
          version: "1.0.0",
          endpoints: {
            health: "/health",
            api: "/api",
          },
        }),
      };

    case "/health":
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "OK",
          message: "SwachTrack API is running",
          timestamp: new Date().toISOString(),
          environment: "production",
        }),
      };

    case "/api/status":
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "SwachTrack API is operational",
          version: "1.0.0",
        }),
      };

    case "/api/classify":
      if (httpMethod !== "POST") {
        return {
          statusCode: 405,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: "Method Not Allowed",
            message: "Only POST method is allowed for this endpoint",
          }),
        };
      }

      try {
        const { issue } = requestBody || {};

        if (!issue) {
          return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              error: "Bad Request",
              message: "Issue description is required",
            }),
          };
        }

        const systemPrompt = `
You are an AI classifier for civic issues reported by citizens in Indian cities. You receive a description or image-based details of the problem. Your job is to:

1. Classify the issue into exactly one of these categories relevant to Indian urban contexts: "streetlights", "potholes", "overflowing dustbins", "water logging", "roadblocks", "broken footpaths", "garbage dumping", or "other civic issues". Choose only one category that best fits the report. If the issue is unclear or does not fit any, select "other civic issues".

2. Extract the location mentioned in the issue description. If no specific location is mentioned, infer a general area or return "Location not specified".

3. Assess severity indicators based on the description, considering factors like:
   - Traffic impact
   - Safety concerns
   - Environmental impact
   - Population density
   - Weather conditions (monsoon, etc.)
   - Urgency level

Return all three pieces of information in the specified JSON format.
`;

        const messages = [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: issue },
        ];

        const response = await client.chat.completions.create({
          model: "openai/gpt-oss-20b",
          messages: messages,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "classification_schema",
              schema: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  category: { type: "string" },
                  location: { type: "string" },
                  severity_indicators: { type: "string" },
                },
                required: [
                  "issue",
                  "category",
                  "location",
                  "severity_indicators",
                ],
                additionalProperties: false,
              },
            },
          },
        });

        const assistantMessage = response.choices[0].message?.content ?? "{}";
        const classification = JSON.parse(assistantMessage);

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(classification),
        };
      } catch (error) {
        console.error("Classification error:", error);
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Failed to classify issue" }),
        };
      }

    case "/api/analyze":
      if (httpMethod !== "POST") {
        return {
          statusCode: 405,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: "Method Not Allowed",
            message: "Only POST method is allowed for this endpoint",
          }),
        };
      }

      try {
        const { issue, category, location, severity_indicators } =
          requestBody || {};

        if (!issue || !category || !location || !severity_indicators) {
          return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              error: "Bad Request",
              message:
                "All fields (issue, category, location, severity_indicators) are required",
            }),
          };
        }

        const systemPrompt = `
You are an AI assistant specializing in civic issue management for Indian municipalities. Given a detailed report with issue category, location in an Indian city, severity indicators (urgency, damage extent), and any textual or visual context, perform these tasks:

- Estimate the time, cost (in INR), and manpower needed to fix the issue based on typical Indian municipal standards.
- Recommend the best suitable Indian company or local contractor for this issue, considering region, company expertise, and availability.
- Assess the severity on a scale (low, medium, high) incorporating factors such as monsoon impact, population density, and traffic conditions typical of Indian cities.
- Generate a concise summary that includes issue category, resource estimates, recommended company, severity level, and critical notes.

EXAMPLE:
{
"time_estimate": "2 days",
"cost_estimate": "₹35,000",
"manpower_required": "5 workers",
"recommended_company": "Delhi Urban Services Ltd.",
"severity": "high",
"summary": "Water logging reported near MG Road, Mumbai. Estimated repair time 2 days with moderate cost. Delhi Urban Services Ltd. recommended due to proven expertise. Severity high due to monsoon season and heavy traffic."
}

NOTE: Make sure all responses suit the urban Indian environment and municipal practices.
`;

        const analysisPrompt = `
        Issue: ${issue}
        Category: ${category}
        Location: ${location}
        Severity Indicators: ${severity_indicators}
        
        Please analyze this civic issue and provide detailed estimates and recommendations.
        `;

        const messages = [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: analysisPrompt },
        ];

        const response = await client.chat.completions.create({
          model: "openai/gpt-oss-20b",
          messages: messages,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "analysis_schema",
              schema: {
                type: "object",
                properties: {
                  time_estimate: { type: "string" },
                  cost_estimate: { type: "string" },
                  manpower_required: { type: "string" },
                  recommended_company: { type: "string" },
                  severity: { type: "string" },
                  summary: { type: "string" },
                },
                required: [
                  "time_estimate",
                  "cost_estimate",
                  "manpower_required",
                  "recommended_company",
                  "severity",
                  "summary",
                ],
                additionalProperties: false,
              },
            },
          },
        });

        const assistantMessage = response.choices[0].message?.content ?? "{}";
        const analysis = JSON.parse(assistantMessage);

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(analysis),
        };
      } catch (error) {
        console.error("Analysis error:", error);
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Failed to analyze issue" }),
        };
      }

    case "/api/report":
      if (httpMethod !== "POST") {
        return {
          statusCode: 405,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: "Method Not Allowed",
            message: "Only POST method is allowed for this endpoint",
          }),
        };
      }

      try {
        const { issue } = requestBody || {};

        if (!issue) {
          return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              error: "Bad Request",
              message: "Issue description is required",
            }),
          };
        }

        // Step 1: Classify the issue
        const classifySystemPrompt = `
You are an AI classifier for civic issues reported by citizens in Indian cities. You receive a description or image-based details of the problem. Your job is to:

1. Classify the issue into exactly one of these categories relevant to Indian urban contexts: "streetlights", "potholes", "overflowing dustbins", "water logging", "roadblocks", "broken footpaths", "garbage dumping", or "other civic issues". Choose only one category that best fits the report. If the issue is unclear or does not fit any, select "other civic issues".

2. Extract the location mentioned in the issue description. If no specific location is mentioned, infer a general area or return "Location not specified".

3. Assess severity indicators based on the description, considering factors like:
   - Traffic impact
   - Safety concerns
   - Environmental impact
   - Population density
   - Weather conditions (monsoon, etc.)
   - Urgency level

Return all three pieces of information in the specified JSON format.
`;

        const classifyMessages = [
          { role: "system" as const, content: classifySystemPrompt },
          { role: "user" as const, content: issue },
        ];

        const classifyResponse = await client.chat.completions.create({
          model: "openai/gpt-oss-20b",
          messages: classifyMessages,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "classification_schema",
              schema: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  category: { type: "string" },
                  location: { type: "string" },
                  severity_indicators: { type: "string" },
                },
                required: [
                  "issue",
                  "category",
                  "location",
                  "severity_indicators",
                ],
                additionalProperties: false,
              },
            },
          },
        });

        const classifyMessage =
          classifyResponse.choices[0].message?.content ?? "{}";
        const classification = JSON.parse(classifyMessage);

        // Step 2: Analyze the classified issue
        const analyzeSystemPrompt = `
You are an AI assistant specializing in civic issue management for Indian municipalities. Given a detailed report with issue category, location in an Indian city, severity indicators (urgency, damage extent), and any textual or visual context, perform these tasks:

- Estimate the time, cost (in INR), and manpower needed to fix the issue based on typical Indian municipal standards.
- Recommend the best suitable Indian company or local contractor for this issue, considering region, company expertise, and availability.
- Assess the severity on a scale (low, medium, high) incorporating factors such as monsoon impact, population density, and traffic conditions typical of Indian cities.
- Generate a concise summary that includes issue category, resource estimates, recommended company, severity level, and critical notes.

EXAMPLE:
{
"time_estimate": "2 days",
"cost_estimate": "₹35,000",
"manpower_required": "5 workers",
"recommended_company": "Delhi Urban Services Ltd.",
"severity": "high",
"summary": "Water logging reported near MG Road, Mumbai. Estimated repair time 2 days with moderate cost. Delhi Urban Services Ltd. recommended due to proven expertise. Severity high due to monsoon season and heavy traffic."
}

NOTE: Make sure all responses suit the urban Indian environment and municipal practices.
`;

        const analysisPrompt = `
        Issue: ${classification.issue}
        Category: ${classification.category}
        Location: ${classification.location}
        Severity Indicators: ${classification.severity_indicators}
        
        Please analyze this civic issue and provide detailed estimates and recommendations.
        `;

        const analyzeMessages = [
          { role: "system" as const, content: analyzeSystemPrompt },
          { role: "user" as const, content: analysisPrompt },
        ];

        const analyzeResponse = await client.chat.completions.create({
          model: "openai/gpt-oss-20b",
          messages: analyzeMessages,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "analysis_schema",
              schema: {
                type: "object",
                properties: {
                  time_estimate: { type: "string" },
                  cost_estimate: { type: "string" },
                  manpower_required: { type: "string" },
                  recommended_company: { type: "string" },
                  severity: { type: "string" },
                  summary: { type: "string" },
                },
                required: [
                  "time_estimate",
                  "cost_estimate",
                  "manpower_required",
                  "recommended_company",
                  "severity",
                  "summary",
                ],
                additionalProperties: false,
              },
            },
          },
        });

        const analyzeMessage =
          analyzeResponse.choices[0].message?.content ?? "{}";
        const analysis = JSON.parse(analyzeMessage);

        // Step 3: Create comprehensive report
        const comprehensiveReport = {
          report_id: `RPT-${Date.now()}`,
          timestamp: new Date().toISOString(),
          original_issue: issue,
          classification: {
            issue: classification.issue,
            category: classification.category,
            location: classification.location,
            severity_indicators: classification.severity_indicators,
          },
          analysis: {
            time_estimate: analysis.time_estimate,
            cost_estimate: analysis.cost_estimate,
            manpower_required: analysis.manpower_required,
            recommended_company: analysis.recommended_company,
            severity: analysis.severity,
            summary: analysis.summary,
          },
          status: "processed",
          next_steps: [
            "Forward to municipal department",
            "Assign to recommended contractor",
            "Schedule repair work",
            "Monitor progress",
          ],
        };

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(comprehensiveReport),
        };
      } catch (error) {
        console.error("Pipeline error:", error);
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: "Failed to process civic issue report",
            details: error instanceof Error ? error.message : "Unknown error",
          }),
        };
      }

    default:
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Not Found",
          message: `Route ${path} not found`,
          timestamp: new Date().toISOString(),
        }),
      };
  }
};
