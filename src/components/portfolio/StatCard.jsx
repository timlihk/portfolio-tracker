import React from 'react';
import { cn } from "@/lib/utils";

export default function StatCard({ 
  title, 
  value, 
  subValue, 
  icon: Icon, 
  trend, 
  trendValue,
  className 
}) {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';
  
  return (
    <div className={cn(
      "bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300",
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm font-medium text-slate-500 tracking-wide uppercase">
          {title}
        </span>
        {Icon && (
          <div className="p-2 bg-slate-50 rounded-xl">
            <Icon className="w-5 h-5 text-slate-400" />
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <h3 className="text-3xl font-semibold text-slate-900 tracking-tight">
          {value}
        </h3>
        
        <div className="flex items-center gap-2">
          {trendValue && (
            <span className={cn(
              "text-sm font-medium px-2 py-0.5 rounded-full",
              isPositive && "text-emerald-700 bg-emerald-50",
              isNegative && "text-rose-700 bg-rose-50",
              !isPositive && !isNegative && "text-slate-600 bg-slate-50"
            )}>
              {isPositive && '+'}{trendValue}
            </span>
          )}
          {subValue && (
            <span className="text-sm text-slate-500">{subValue}</span>
          )}
        </div>
      </div>
    </div>
  );
}