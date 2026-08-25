import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Lightbulb, AlertTriangle, Trophy, Target, Sparkles, TrendingDown } from 'lucide-react';
import { ProcessedResult } from '../types';

interface Props {
    data: ProcessedResult;
}

export const SmartInsights: React.FC<Props> = ({ data }) => {
    const insights = useMemo(() => {
        if (!data || data.grandTotal.total === 0) return [];
        const result = [];
        const summaries = data.summaries.filter(s => s.total > 0 && !s.daName.includes('⚠️'));
        const TARGET = 94.0;

        // 1. Overall Health / Goal Tracking
        const fdds = data.grandTotal.successRate;
        if (fdds >= TARGET) {
            result.push({
                type: 'success',
                icon: <Trophy className="text-amber-500" size={24} />,
                title: 'أداء استثنائي!',
                desc: `النسبة الحالية (${fdds.toFixed(1)}%) تتجاوز الهدف المطلوب (${TARGET}%). الشبكة تعمل بكفاءة عالية.`
            });
        } else {
            const requiredToHitTarget = Math.ceil((TARGET / 100 * data.grandTotal.total) - data.grandTotal.delivered);
            if (requiredToHitTarget > 0) {
                 result.push({
                    type: 'warning',
                    icon: <Target className="text-blue-500" size={24} />,
                    title: 'الهدف اليومي (Daily Target)',
                    desc: `للوصول إلى الهدف (${TARGET}%)، نحتاج إلى توصيل ${requiredToHitTarget} شحنة إضافية بنجاح.`
                });
            }
        }

        // 2. Top Agent
        if (summaries.length > 0) {
            const topAgent = [...summaries].sort((a, b) => b.successRate - a.successRate || b.total - a.total)[0];
            if (topAgent && topAgent.successRate >= 95 && topAgent.total >= 10) {
                result.push({
                    type: 'info',
                    icon: <Sparkles className="text-emerald-500" size={24} />,
                    title: 'بطل التوصيل (Top Performer)',
                    desc: `المندوب "${topAgent.daName}" يتصدر الأداء اليوم بنسبة مذهلة ${topAgent.successRate.toFixed(1)}% (${topAgent.delivered} شحنة).`
                });
            }
        }

        // 3. Bottleneck / Warnings (RTO or Failed)
        if (summaries.length > 0) {
            const highRtoAgent = [...summaries].sort((a, b) => (b.rto / b.total) - (a.rto / a.total))[0];
            if (highRtoAgent && (highRtoAgent.rto / highRtoAgent.total) > 0.15 && highRtoAgent.total > 10) {
                result.push({
                    type: 'danger',
                    icon: <AlertTriangle className="text-rose-500" size={24} />,
                    title: 'تنبيه المرتجعات (High RTO)',
                    desc: `المندوب "${highRtoAgent.daName}" لديه نسبة مرتجعات مقلقة تبلغ ${((highRtoAgent.rto / highRtoAgent.total)*100).toFixed(1)}%. يجب المتابعة.`
                });
            } else {
                const highFailAgent = [...summaries].sort((a, b) => (b.failed / b.total) - (a.failed / a.total))[0];
                if (highFailAgent && (highFailAgent.failed / highFailAgent.total) > 0.15 && highFailAgent.total > 10) {
                    result.push({
                        type: 'danger',
                        icon: <TrendingDown className="text-rose-500" size={24} />,
                        title: 'تنبيه الشحنات الفاشلة',
                        desc: `المندوب "${highFailAgent.daName}" يواجه صعوبات في التوصيل، نسبة الفشل ${((highFailAgent.failed / highFailAgent.total)*100).toFixed(1)}%.`
                    });
                }
            }
        }

        return result;
    }, [data]);

    if (insights.length === 0) return null;

    return (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl p-6 mb-6 shadow-sm no-print relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="flex items-center gap-3 mb-5 relative z-10">
                <div className="bg-indigo-100 dark:bg-indigo-800/50 p-2 rounded-lg">
                    <Lightbulb className="text-indigo-600 dark:text-indigo-400" size={20} />
                </div>
                <h3 className="text-xl font-black text-indigo-900 dark:text-indigo-300">الرؤى الذكية (AI Insights)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
                {insights.map((insight, idx) => (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
                        key={idx}
                        className="bg-white/70 dark:bg-black/30 p-5 rounded-xl border border-white/80 dark:border-white/5 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                {insight.icon}
                            </div>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{insight.title}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                            {insight.desc}
                        </p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
