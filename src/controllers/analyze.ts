import client from "../openai_client";
import { Request, Response } from 'express';

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
`

let messages: any = [
    {
        "role": "system",
        "content": systemPrompt
    }
]

const analyze = async (req: Request, res: Response) => {
    try {
        const { issue, category, location, severity_indicators } = req.body;

        const analysisPrompt = `
        Issue: ${issue}
        Category: ${category}
        Location: ${location}
        Severity Indicators: ${severity_indicators}
        
        Please analyze this civic issue and provide detailed estimates and recommendations.
        `;

        messages.push({
            "role": "user",
            "content": analysisPrompt
        });

        const response = await client.chat.completions.create({
            "model": "openai/gpt-oss-20b",
            "messages": messages,
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
                      summary: { type: "string"}
                    },
                    required: ["time_estimate", "cost_estimate", "manpower_required", "recommended_company", "severity", "summary"],
                    additionalProperties: false,
                  },
                },
              },
        });
        
        const assistantMessage = response.choices[0].message?.content ?? "{}";
        const analysis = JSON.parse(assistantMessage);
        console.log(analysis);

        messages.push({
            "role": "assistant",
            "content": assistantMessage
        });

        res.status(200).json(analysis);
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze issue' });
    }
}

export default analyze;