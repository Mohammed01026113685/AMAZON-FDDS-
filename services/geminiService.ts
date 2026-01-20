import { GoogleGenAI } from "@google/genai";
import { ProcessedResult } from "../types";

export const analyzeDailyPerformance = async (data: ProcessedResult): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Prepare prompt
        const top3 = [...data.summaries].sort((a,b) => b.successRate - a.successRate).slice(0,3).map(a => `${a.daName} (${a.successRate.toFixed(1)}%)`).join(', ');
        const bottom3 = [...data.summaries].filter(a => a.total > 5).sort((a,b) => a.successRate - b.successRate).slice(0,3).map(a => `${a.daName} (${a.successRate.toFixed(1)}%, Failed: ${a.failed})`).join(', ');
        
        const prompt = `
        Act as a logistics manager assistant. Analyze this daily delivery report for a station.
        Station Total Volume: ${data.grandTotal.total}
        Station Success Rate: ${data.grandTotal.successRate.toFixed(1)}%
        Delivered: ${data.grandTotal.delivered}
        Failed/RTO: ${data.grandTotal.failed + data.grandTotal.rto}

        Top Performers: ${top3}
        Low Performers (Need Attention): ${bottom3}

        Please provide a short, professional summary in Arabic (اللغة العربية).
        Structure:
        1. General Assessment (Excellent/Good/Needs Improvement).
        2. Key Highlights (Who did great).
        3. Areas of Concern (Who is struggling and specifically mentions the high failure count).
        4. One actionable tip for tomorrow.
        
        Keep it concise (max 150 words). Format with bullet points.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text || "Could not generate analysis.";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "حدث خطأ أثناء الاتصال بالمساعد الذكي.";
    }
};