import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Shield,
  Target,
  ArrowRight
} from 'lucide-react';
import { cn } from "@/lib/utils";

const SCORE_COLORS = {
  excellent: { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50' },
  good: { bg: 'bg-sky-500', text: 'text-sky-700', light: 'bg-sky-50' },
  fair: { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50' },
  poor: { bg: 'bg-rose-500', text: 'text-rose-700', light: 'bg-rose-50' }
};

function getScoreCategory(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

function HealthScore({ score, label }) {
  const category = getScoreCategory(score);
  const colors = SCORE_COLORS[category];
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="35"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            className="text-slate-100"
          />
          <circle
            cx="40"
            cy="40"
            r="35"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${score * 2.2} 220`}
            className={colors.text}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-slate-900">{score}</span>
        </div>
      </div>
      <span className="text-xs text-slate-500 mt-2">{label}</span>
    </div>
  );
}

export default function AIPortfolioAnalysis({ portfolioData }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this investment portfolio and provide a comprehensive assessment:

Portfolio Holdings:
${JSON.stringify(portfolioData, null, 2)}

Provide:
1. Overall health score (0-100) based on diversification, risk management, and performance
2. Individual scores for: diversification (0-100), risk level (0-100, higher=safer), performance (0-100)
3. 3-4 key insights about the portfolio's strengths
4. 3-4 specific recommendations for improvement (rebalancing, diversification, new investments)
5. 2-3 potential risks to watch
6. 2-3 opportunities based on current market trends

Be specific and actionable. Consider asset allocation, sector exposure, geographic diversification, and current market conditions.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            health_score: { type: "number", description: "Overall portfolio health score 0-100" },
            diversification_score: { type: "number", description: "Diversification score 0-100" },
            risk_score: { type: "number", description: "Risk management score 0-100 (higher is safer)" },
            performance_score: { type: "number", description: "Performance score 0-100" },
            insights: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  type: { type: "string", enum: ["positive", "neutral", "warning"] }
                }
              }
            },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string", enum: ["high", "medium", "low"] }
                }
              }
            },
            risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["high", "medium", "low"] }
                }
              }
            },
            opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            summary: { type: "string", description: "2-3 sentence executive summary" }
          }
        }
      });
      
      setAnalysis(result);
    } catch (err) {
      setError('Failed to analyze portfolio. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!analysis && !loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-violet-500/20">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">AI Portfolio Analysis</h3>
        </div>
        <p className="text-slate-400 mb-6">
          Get personalized insights, recommendations, and risk assessment powered by AI analysis of your portfolio and current market trends.
        </p>
        <Button 
          onClick={runAnalysis}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Analyze My Portfolio
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Analyzing your portfolio...</p>
            <p className="text-sm text-slate-400 mt-1">This may take a few seconds</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-rose-100">
        <p className="text-rose-600 mb-4">{error}</p>
        <Button onClick={runAnalysis} variant="outline">Try Again</Button>
      </div>
    );
  }

  const overallCategory = getScoreCategory(analysis.health_score);
  const overallColors = SCORE_COLORS[overallCategory];

  return (
    <div className="space-y-6">
      {/* Health Score Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-50">
              <Sparkles className="w-5 h-5 text-violet-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Portfolio Health</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={runAnalysis}
            className="text-slate-500"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>

        <div className="flex items-center gap-8 mb-6">
          <div className="flex flex-col items-center">
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-100" />
                <circle
                  cx="56" cy="56" r="48"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${analysis.health_score * 3.02} 302`}
                  className={overallColors.text}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900">{analysis.health_score}</span>
                <span className="text-xs text-slate-500">/ 100</span>
              </div>
            </div>
            <Badge className={cn("mt-2 capitalize", overallColors.light, overallColors.text)}>
              {overallCategory}
            </Badge>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-4">
            <HealthScore score={analysis.diversification_score} label="Diversification" />
            <HealthScore score={analysis.risk_score} label="Risk Mgmt" />
            <HealthScore score={analysis.performance_score} label="Performance" />
          </div>
        </div>

        <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 rounded-xl p-4">
          {analysis.summary}
        </p>
      </div>

      {/* Insights & Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Insights */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h4 className="font-semibold text-slate-900">Key Insights</h4>
          </div>
          <div className="space-y-3">
            {analysis.insights?.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                {insight.type === 'positive' && <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />}
                {insight.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />}
                {insight.type === 'neutral' && <Target className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />}
                <div>
                  <p className="font-medium text-slate-900 text-sm">{insight.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-slate-900">Recommendations</h4>
          </div>
          <div className="space-y-3">
            {analysis.recommendations?.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                <ArrowRight className={cn(
                  "w-5 h-5 mt-0.5 flex-shrink-0",
                  rec.priority === 'high' ? 'text-rose-500' :
                  rec.priority === 'medium' ? 'text-amber-500' : 'text-slate-400'
                )} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 text-sm">{rec.title}</p>
                    <Badge variant="outline" className={cn(
                      "text-xs capitalize",
                      rec.priority === 'high' ? 'border-rose-200 text-rose-600' :
                      rec.priority === 'medium' ? 'border-amber-200 text-amber-600' : 'border-slate-200'
                    )}>
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risks & Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risks */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-rose-500" />
            <h4 className="font-semibold text-slate-900">Potential Risks</h4>
          </div>
          <div className="space-y-3">
            {analysis.risks?.map((risk, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-rose-50/50 border border-rose-100">
                <TrendingDown className={cn(
                  "w-5 h-5 mt-0.5 flex-shrink-0",
                  risk.severity === 'high' ? 'text-rose-600' :
                  risk.severity === 'medium' ? 'text-rose-400' : 'text-rose-300'
                )} />
                <div>
                  <p className="font-medium text-slate-900 text-sm">{risk.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{risk.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Opportunities */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h4 className="font-semibold text-slate-900">Opportunities</h4>
          </div>
          <div className="space-y-3">
            {analysis.opportunities?.map((opp, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <Sparkles className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-900 text-sm">{opp.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opp.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}