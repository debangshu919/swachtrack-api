import client from "../openai_client";
import { Request, Response } from 'express';

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
`
let messages: any = [
    {
        "role": "system",
        "content": systemPrompt
    }
]

const classify = async (req: Request, res: Response) => {
    try {
        const { issue } = req.body;

        messages.push({
            "role": "user",
            "content": issue
        });

        const response = await client.chat.completions.create({
            "model": "openai/gpt-oss-20b",
            "messages": messages,
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
                    required: ["issue", "category", "location", "severity_indicators"],
                    additionalProperties: false,
                  },
                },
              },
        });
        
        const assistantMessage = response.choices[0].message?.content ?? "{}";
        const classification = JSON.parse(assistantMessage);
        console.log(classification);

        messages.push({
            "role": "assistant",
            "content": assistantMessage
        });

        res.status(200).json(classification);
    } catch (error) {
        console.error('Classification error:', error);
        res.status(500).json({ error: 'Failed to classify issue' });
    }
}

export default classify;
