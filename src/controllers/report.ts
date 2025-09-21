import { Request, Response } from 'express';
import classify from './classify';
import analyze from './analyze';

const report = async (req: Request, res: Response): Promise<void> => {
    try {
        const { issue } = req.body;

        if (!issue) {
            res.status(400).json({ error: 'Issue description is required' });
            return;
        }

        let classification: any;
        const classifyReq = { body: { issue } } as Request;
        const classifyRes = {
            status: (code: number) => ({
                json: (data: any) => {
                    classification = data;
                    return { status: code, json: () => data };
                }
            }),
            json: (data: any) => { classification = data; }
        } as unknown as Response;

        await classify(classifyReq, classifyRes);
        console.log('Classification result:', classification);

        let analysis: any;
        const analyzeReq = {
            body: {
                issue: classification.issue,
                category: classification.category,
                location: classification.location,
                severity_indicators: classification.severity_indicators
            }
        } as Request;
        
        const analyzeRes = {
            status: (code: number) => ({
                json: (data: any) => {
                    analysis = data;
                    return { status: code, json: () => data };
                }
            }),
            json: (data: any) => { analysis = data; }
        } as unknown as Response;

        await analyze(analyzeReq, analyzeRes);
        console.log('Analysis result:', analysis);

        const comprehensiveReport = {
            report_id: `RPT-${Date.now()}`,
            timestamp: new Date().toISOString(),
            original_issue: issue,
            classification: {
                issue: classification.issue,
                category: classification.category,
                location: classification.location,
                severity_indicators: classification.severity_indicators
            },
            analysis: {
                time_estimate: analysis.time_estimate,
                cost_estimate: analysis.cost_estimate,
                manpower_required: analysis.manpower_required,
                recommended_company: analysis.recommended_company,
                severity: analysis.severity,
                summary: analysis.summary
            },
            status: "processed",
            next_steps: [
                "Forward to municipal department",
                "Assign to recommended contractor",
                "Schedule repair work",
                "Monitor progress"
            ]
        };

        res.status(200).json(comprehensiveReport);

    } catch (error) {
        console.error('Pipeline error:', error);
        res.status(500).json({ 
            error: 'Failed to process civic issue report',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

export default report;
