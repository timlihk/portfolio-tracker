import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, TrendingUp, TrendingDown, AlertTriangle, Calendar, DollarSign } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function TransactionAIAnalysis({ transactions }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runAnalysis = async () => {
    if (!transactions || transactions.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const transactionSummary = transactions.map(t => ({
        date: t.date,
        type: t.transaction_type,
        asset: t.asset_name,
        asset_type: t.asset_type,
        amount: t.total_amount,
        fees: t.fees || 0
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these investment transactions and provide insights:

${JSON.stringify(transactionSummary, null, 2)}

Provide:
1. Overall transaction patterns (frequency, timing, types)
2. Notable events or significant transactions
3. Fee analysis
4. Investment behavior insights
5. Suggestions for optimization`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Brief overview of transaction activity" },
            patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  trend: { type: "string", enum: ["positive", "negative", "neutral"] }
                }
              }
            },
            significant_events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  event: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            total_fees: { type: "number" },
            fee_insights: { type: "string" },
            suggestions: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setAnalysis(result);
    } catch (err) {
      setError('Failed to analyze transactions. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!transactions || transactions.length === 0) {
    return null;
  }

  if (!analysis && !loading) {
    return (
      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-xl">
              <Sparkles className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">AI Transaction Analysis</h3>
              <p className="text-sm text-slate-500">Get insights on your transaction patterns</p>
            </div>
          </div>
          <Button onClick={runAnalysis} className="bg-violet-600 hover:bg-violet-700">
            <Sparkles className="w-4 h-4 mr-2" />
            Analyze
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 mb-6">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin mb-3" />
          <p className="text-slate-600">Analyzing your transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 rounded-2xl border border-rose-100 p-6 mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <p className="text-rose-700">{error}</p>
          <Button variant="outline" size="sm" onClick={runAnalysis} className="ml-auto">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const trendIcons = {
    positive: <TrendingUp className="w-4 h-4 text-emerald-600" />,
    negative: <TrendingDown className="w-4 h-4 text-rose-600" />,
    neutral: <DollarSign className="w-4 h-4 text-slate-500" />
  };

  const trendColors = {
    positive: 'bg-emerald-50 border-emerald-100',
    negative: 'bg-rose-50 border-rose-100',
    neutral: 'bg-slate-50 border-slate-100'
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-xl">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <h3 className="font-semibold text-slate-800">Transaction Analysis</h3>
        </div>
        <Button variant="outline" size="sm" onClick={runAnalysis}>
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="bg-slate-50 rounded-xl p-4 mb-6">
        <p className="text-slate-700">{analysis.summary}</p>
      </div>

      {/* Patterns */}
      {analysis.patterns && analysis.patterns.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Patterns</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis.patterns.map((pattern, idx) => (
              <div key={idx} className={cn("rounded-xl border p-4", trendColors[pattern.trend])}>
                <div className="flex items-center gap-2 mb-2">
                  {trendIcons[pattern.trend]}
                  <span className="font-medium text-slate-800">{pattern.title}</span>
                </div>
                <p className="text-sm text-slate-600">{pattern.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Significant Events */}
      {analysis.significant_events && analysis.significant_events.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Significant Events</h4>
          <div className="space-y-2">
            {analysis.significant_events.map((event, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <Calendar className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-amber-700">{event.date}</span>
                  </div>
                  <p className="text-sm text-slate-700 font-medium">{event.event}</p>
                  <p className="text-xs text-slate-500">{event.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fee Insights */}
      {analysis.fee_insights && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Fee Analysis</h4>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-slate-800">
                Total Fees: ${(analysis.total_fees || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-sm text-slate-600">{analysis.fee_insights}</p>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {analysis.suggestions && analysis.suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Suggestions</h4>
          <ul className="space-y-2">
            {analysis.suggestions.map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-violet-600 font-bold">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}