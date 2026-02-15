import prisma from './prisma';
import { estimateCost } from './google-maps';

// ─── Types ──────────────────────────────────────────────────────
export interface UsageSummary {
    today: {
        searchRequests: number;
        detailRequests: number;
        estimatedCost: number;
    };
    month: {
        searchRequests: number;
        detailRequests: number;
        estimatedCost: number;
    };
    caps: {
        dailySearchLimit: number;
        dailyDetailLimit: number;
        monthlySearchLimit: number;
        monthlyDetailLimit: number;
        perRunSearchLimit: number;
        perRunDetailLimit: number;
        perRunMaxPlaces: number;
        maxPaginationDepth: number;
        dailySendLimit: number;
        monthlySendLimit: number;
    };
    percentUsed: {
        dailySearch: number;
        dailyDetail: number;
        monthlySearch: number;
        monthlyDetail: number;
    };
    warnings: string[];
}

export interface CapCheckResult {
    allowed: boolean;
    remaining: number;
    percentUsed: number;
    warning?: string;
}

// ─── Get or Create Default Caps ─────────────────────────────────
export async function getOrCreateCaps() {
    let caps = await prisma.apiUsageCap.findFirst({ where: { isActive: true } });
    if (!caps) {
        caps = await prisma.apiUsageCap.create({ data: {} });
    }
    return caps;
}

// ─── Track Request ──────────────────────────────────────────────
export async function trackRequest(endpoint: string, count: number = 1) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const caps = await getOrCreateCaps();
    const costPer1000 = endpoint === 'search' ? caps.searchCostPer1000 : caps.detailCostPer1000;
    const cost = (count / 1000) * costPer1000;

    await prisma.apiUsage.upsert({
        where: {
            date_endpoint: {
                date: today,
                endpoint,
            },
        },
        update: {
            requestCount: { increment: count },
            estimatedCost: { increment: cost },
        },
        create: {
            date: today,
            endpoint,
            requestCount: count,
            estimatedCost: cost,
        },
    });
}

// ─── Check Caps ─────────────────────────────────────────────────
export async function checkDailyCap(endpoint: string): Promise<CapCheckResult> {
    const caps = await getOrCreateCaps();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.apiUsage.findUnique({
        where: { date_endpoint: { date: today, endpoint } },
    });

    const used = usage?.requestCount || 0;
    const limit = endpoint === 'search' ? caps.dailySearchLimit : caps.dailyDetailLimit;
    const remaining = Math.max(0, limit - used);
    const percentUsed = limit > 0 ? (used / limit) * 100 : 0;

    let warning: string | undefined;
    if (percentUsed >= 95 && caps.warningThreshold95) {
        warning = `⚠️ CRITICAL: ${endpoint} usage at ${percentUsed.toFixed(1)}% of daily cap`;
    } else if (percentUsed >= 80 && caps.warningThreshold80) {
        warning = `⚠️ WARNING: ${endpoint} usage at ${percentUsed.toFixed(1)}% of daily cap`;
    }

    return {
        allowed: remaining > 0,
        remaining,
        percentUsed,
        warning,
    };
}

export async function checkMonthlyCap(endpoint: string): Promise<CapCheckResult> {
    const caps = await getOrCreateCaps();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = await prisma.apiUsage.aggregate({
        where: {
            endpoint,
            date: { gte: monthStart },
        },
        _sum: { requestCount: true },
    });

    const used = usage._sum.requestCount || 0;
    const limit = endpoint === 'search' ? caps.monthlySearchLimit : caps.monthlyDetailLimit;
    const remaining = Math.max(0, limit - used);
    const percentUsed = limit > 0 ? (used / limit) * 100 : 0;

    let warning: string | undefined;
    if (percentUsed >= 95 && caps.warningThreshold95) {
        warning = `⚠️ CRITICAL: ${endpoint} monthly usage at ${percentUsed.toFixed(1)}%`;
    } else if (percentUsed >= 80 && caps.warningThreshold80) {
        warning = `⚠️ WARNING: ${endpoint} monthly usage at ${percentUsed.toFixed(1)}%`;
    }

    return {
        allowed: remaining > 0,
        remaining,
        percentUsed,
        warning,
    };
}

// ─── Full Usage Summary ─────────────────────────────────────────
export async function getUsageSummary(): Promise<UsageSummary> {
    const caps = await getOrCreateCaps();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's usage
    const todayUsage = await prisma.apiUsage.findMany({
        where: { date: today },
    });

    const todaySearch = todayUsage.find((u: { endpoint: string }) => u.endpoint === 'search');
    const todayDetail = todayUsage.find((u: { endpoint: string }) => u.endpoint === 'detail');

    // Monthly usage
    const monthUsage = await prisma.apiUsage.groupBy({
        by: ['endpoint'],
        where: { date: { gte: monthStart } },
        _sum: { requestCount: true, estimatedCost: true },
    });

    const monthSearch = monthUsage.find((u: { endpoint: string }) => u.endpoint === 'search');
    const monthDetail = monthUsage.find((u: { endpoint: string }) => u.endpoint === 'detail');

    const todaySearchCount = todaySearch?.requestCount || 0;
    const todayDetailCount = todayDetail?.requestCount || 0;
    const monthSearchCount = monthSearch?._sum.requestCount || 0;
    const monthDetailCount = monthDetail?._sum.requestCount || 0;

    // Warnings
    const warnings: string[] = [];
    const dailySearchPct = caps.dailySearchLimit > 0 ? (todaySearchCount / caps.dailySearchLimit) * 100 : 0;
    const dailyDetailPct = caps.dailyDetailLimit > 0 ? (todayDetailCount / caps.dailyDetailLimit) * 100 : 0;
    const monthlySearchPct = caps.monthlySearchLimit > 0 ? (monthSearchCount / caps.monthlySearchLimit) * 100 : 0;
    const monthlyDetailPct = caps.monthlyDetailLimit > 0 ? (monthDetailCount / caps.monthlyDetailLimit) * 100 : 0;

    if (dailySearchPct >= 80) warnings.push(`Daily search at ${dailySearchPct.toFixed(0)}%`);
    if (dailyDetailPct >= 80) warnings.push(`Daily details at ${dailyDetailPct.toFixed(0)}%`);
    if (monthlySearchPct >= 80) warnings.push(`Monthly search at ${monthlySearchPct.toFixed(0)}%`);
    if (monthlyDetailPct >= 80) warnings.push(`Monthly details at ${monthlyDetailPct.toFixed(0)}%`);

    const todayCost = estimateCost(todaySearchCount, todayDetailCount, caps.searchCostPer1000, caps.detailCostPer1000);
    const monthCost = estimateCost(monthSearchCount, monthDetailCount, caps.searchCostPer1000, caps.detailCostPer1000);

    return {
        today: {
            searchRequests: todaySearchCount,
            detailRequests: todayDetailCount,
            estimatedCost: todayCost.totalCost,
        },
        month: {
            searchRequests: monthSearchCount,
            detailRequests: monthDetailCount,
            estimatedCost: monthCost.totalCost,
        },
        caps: {
            dailySearchLimit: caps.dailySearchLimit,
            dailyDetailLimit: caps.dailyDetailLimit,
            monthlySearchLimit: caps.monthlySearchLimit,
            monthlyDetailLimit: caps.monthlyDetailLimit,
            perRunSearchLimit: caps.perRunSearchLimit,
            perRunDetailLimit: caps.perRunDetailLimit,
            perRunMaxPlaces: caps.perRunMaxPlaces,
            maxPaginationDepth: caps.maxPaginationDepth,
            dailySendLimit: caps.dailySendLimit,
            monthlySendLimit: caps.monthlySendLimit,
        },
        percentUsed: {
            dailySearch: dailySearchPct,
            dailyDetail: dailyDetailPct,
            monthlySearch: monthlySearchPct,
            monthlyDetail: monthlyDetailPct,
        },
        warnings,
    };
}
