'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';

interface DashboardData {
  overview: {
    totalLeads: number;
    enriched: number;
    avgScore: number;
    contacted: number;
    replied: number;
    newLeads: number;
    ready: number;
    doNotContact: number;
  };
  statusBreakdown: Record<string, number>;
  nicheBreakdown: { niche: string; count: number }[];
  recentRuns: {
    id: string;
    query: string;
    location: string;
    totalNewLeads: number;
    totalDuplicates: number;
    estimatedCost: number;
    createdAt: string;
    status: string;
  }[];
  campaigns: {
    totalSent: number;
    totalFailed: number;
    totalBounced: number;
    totalReplied: number;
  };
}

interface UsageData {
  today: { searchRequests: number; detailRequests: number; estimatedCost: number };
  month: { searchRequests: number; detailRequests: number; estimatedCost: number };
  caps: { dailySearchLimit: number; dailyDetailLimit: number; monthlySearchLimit: number; monthlyDetailLimit: number };
  percentUsed: { dailySearch: number; dailyDetail: number; monthlySearch: number; monthlyDetail: number };
  warnings: string[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, usageRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/usage'),
      ]);
      const dashData = await dashRes.json();
      const usageData = await usageRes.json();
      setData(dashData);
      setUsage(usageData);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <Sidebar>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <div className="page-subtitle">Overview of your lead generation pipeline</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchData}>
          ↻ Refresh
        </button>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="loading-overlay">
            <div className="spinner spinner-lg"></div>
            <span>Loading dashboard...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-xl animate-in">
            {/* Alerts */}
            {usage?.warnings && usage.warnings.length > 0 && (
              <div className="flex flex-col gap-sm">
                {usage.warnings.map((w, i) => (
                  <div key={i} className="alert alert-warning">⚠️ {w}</div>
                ))}
              </div>
            )}

            {/* KPIs */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">Total Leads</div>
                <div className="kpi-value">{data?.overview.totalLeads || 0}</div>
                <div className="kpi-detail">{data?.overview.newLeads || 0} new, {data?.overview.ready || 0} ready</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Enriched</div>
                <div className="kpi-value">{data?.overview.enriched || 0}</div>
                <div className="kpi-detail">
                  {data?.overview.totalLeads ? Math.round((data.overview.enriched / data.overview.totalLeads) * 100) : 0}% of total
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Avg Score</div>
                <div className="kpi-value">{data?.overview.avgScore || 0}</div>
                <div className="kpi-detail">Out of 100</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Contacted</div>
                <div className="kpi-value">{data?.overview.contacted || 0}</div>
                <div className="kpi-detail">{data?.overview.replied || 0} replied</div>
              </div>
            </div>

            <div className="grid-2">
              {/* API Usage */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">API Usage — Today</div>
                    <div className="card-subtitle">Google Maps API requests</div>
                  </div>
                  <span className="font-mono text-sm text-accent">
                    ${usage?.today.estimatedCost.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex flex-col gap-md">
                  <div>
                    <div className="flex justify-between text-sm mb-lg" style={{ marginBottom: '4px' }}>
                      <span>Search</span>
                      <span className="text-muted">{usage?.today.searchRequests || 0} / {usage?.caps.dailySearchLimit || 0}</span>
                    </div>
                    <div className="gauge">
                      <div
                        className={`gauge-fill ${(usage?.percentUsed.dailySearch || 0) > 95 ? 'danger' : (usage?.percentUsed.dailySearch || 0) > 80 ? 'warning' : ''}`}
                        style={{ width: `${Math.min(usage?.percentUsed.dailySearch || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm" style={{ marginBottom: '4px' }}>
                      <span>Details</span>
                      <span className="text-muted">{usage?.today.detailRequests || 0} / {usage?.caps.dailyDetailLimit || 0}</span>
                    </div>
                    <div className="gauge">
                      <div
                        className={`gauge-fill ${(usage?.percentUsed.dailyDetail || 0) > 95 ? 'danger' : (usage?.percentUsed.dailyDetail || 0) > 80 ? 'warning' : ''}`}
                        style={{ width: `${Math.min(usage?.percentUsed.dailyDetail || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Usage */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">API Usage — This Month</div>
                    <div className="card-subtitle">Cumulative monthly usage</div>
                  </div>
                  <span className="font-mono text-sm text-accent">
                    ${usage?.month.estimatedCost.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex flex-col gap-md">
                  <div>
                    <div className="flex justify-between text-sm" style={{ marginBottom: '4px' }}>
                      <span>Search</span>
                      <span className="text-muted">{usage?.month.searchRequests || 0} / {usage?.caps.monthlySearchLimit || 0}</span>
                    </div>
                    <div className="gauge">
                      <div
                        className={`gauge-fill ${(usage?.percentUsed.monthlySearch || 0) > 95 ? 'danger' : (usage?.percentUsed.monthlySearch || 0) > 80 ? 'warning' : ''}`}
                        style={{ width: `${Math.min(usage?.percentUsed.monthlySearch || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm" style={{ marginBottom: '4px' }}>
                      <span>Details</span>
                      <span className="text-muted">{usage?.month.detailRequests || 0} / {usage?.caps.monthlyDetailLimit || 0}</span>
                    </div>
                    <div className="gauge">
                      <div
                        className={`gauge-fill ${(usage?.percentUsed.monthlyDetail || 0) > 95 ? 'danger' : (usage?.percentUsed.monthlyDetail || 0) > 80 ? 'warning' : ''}`}
                        style={{ width: `${Math.min(usage?.percentUsed.monthlyDetail || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid-2">
              {/* Campaign Stats */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Campaign Performance</div>
                </div>
                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  <div>
                    <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sent</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-accent)' }}>
                      {data?.campaigns.totalSent || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Replied</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                      {data?.campaigns.totalReplied || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bounced</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>
                      {data?.campaigns.totalBounced || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Failed</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>
                      {data?.campaigns.totalFailed || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Runs */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Recent Search Runs</div>
                </div>
                {data?.recentRuns && data.recentRuns.length > 0 ? (
                  <div className="flex flex-col gap-sm">
                    {data.recentRuns.map(run => (
                      <div key={run.id} style={{
                        padding: 'var(--space-sm) var(--space-md)',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <div>
                          <div className="text-sm" style={{ fontWeight: 500 }}>{run.query}</div>
                          <div className="text-xs text-muted">{run.location}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="text-sm text-accent">+{run.totalNewLeads} leads</div>
                          <div className="text-xs text-muted">${run.estimatedCost.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted text-sm">No search runs yet</div>
                )}
              </div>
            </div>

            {/* Niche Breakdown */}
            {data?.nicheBreakdown && data.nicheBreakdown.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Leads by Niche</div>
                </div>
                <div className="flex flex-col gap-sm">
                  {data.nicheBreakdown.map(n => {
                    const maxCount = Math.max(...data.nicheBreakdown.map(x => x.count));
                    return (
                      <div key={n.niche} className="flex items-center gap-md">
                        <span className="text-sm" style={{ width: 150, flexShrink: 0 }}>{n.niche}</span>
                        <div className="gauge" style={{ flex: 1 }}>
                          <div className="gauge-fill" style={{ width: `${(n.count / maxCount) * 100}%` }} />
                        </div>
                        <span className="font-mono text-sm text-accent" style={{ width: 40, textAlign: 'right' }}>{n.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status Breakdown */}
            {data?.statusBreakdown && Object.keys(data.statusBreakdown).length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Lead Status Breakdown</div>
                </div>
                <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
                  {Object.entries(data.statusBreakdown).map(([status, count]) => (
                    <div key={status} className={`badge badge-${status.toLowerCase().replace(/_/g, '-')}`}>
                      {status.replace(/_/g, ' ')} ({count})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Sidebar>
  );
}
