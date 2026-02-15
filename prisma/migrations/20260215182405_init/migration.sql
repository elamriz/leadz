-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'READY', 'QUEUED', 'SENT', 'BOUNCED', 'REPLIED', 'NOT_INTERESTED', 'FOLLOW_UP', 'DO_NOT_CONTACT');

-- CreateEnum
CREATE TYPE "EmailConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'GUESSED', 'NONE');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SendStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'BOUNCED', 'OPENED', 'CLICKED', 'REPLIED', 'UNSUBSCRIBED');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "placeId" TEXT,
    "displayName" TEXT NOT NULL,
    "formattedAddress" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "nationalPhone" TEXT,
    "websiteUri" TEXT,
    "websiteDomain" TEXT,
    "rating" DOUBLE PRECISION,
    "userRatingCount" INTEGER,
    "businessStatus" TEXT,
    "types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "niche" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "score" INTEGER NOT NULL DEFAULT 0,
    "topReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "contactCooldownDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEmail" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'website_crawl',
    "confidence" "EmailConfidence" NOT NULL DEFAULT 'NONE',
    "isGeneric" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringSignal" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "hasWebsite" BOOLEAN NOT NULL DEFAULT false,
    "httpsPresent" BOOLEAN NOT NULL DEFAULT false,
    "mobileFriendly" BOOLEAN NOT NULL DEFAULT false,
    "loadTimeMs" INTEGER,
    "hasMetaTags" BOOLEAN NOT NULL DEFAULT false,
    "hasTitle" BOOLEAN NOT NULL DEFAULT false,
    "hasDescription" BOOLEAN NOT NULL DEFAULT false,
    "outdatedTech" BOOLEAN NOT NULL DEFAULT false,
    "emailFound" BOOLEAN NOT NULL DEFAULT false,
    "phoneFound" BOOLEAN NOT NULL DEFAULT false,
    "ratingValue" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "isOperational" BOOLEAN NOT NULL DEFAULT true,
    "distanceFromCenter" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'default',
    "noWebsiteWeight" INTEGER NOT NULL DEFAULT 30,
    "highRatingWeight" INTEGER NOT NULL DEFAULT 10,
    "highRatingThreshold" DOUBLE PRECISION NOT NULL DEFAULT 4.3,
    "reviewCountWeight" INTEGER NOT NULL DEFAULT 15,
    "reviewCountThreshold" INTEGER NOT NULL DEFAULT 50,
    "highReviewCountWeight" INTEGER NOT NULL DEFAULT 25,
    "highReviewCountThreshold" INTEGER NOT NULL DEFAULT 200,
    "hasPhoneWeight" INTEGER NOT NULL DEFAULT 5,
    "emailFoundWeight" INTEGER NOT NULL DEFAULT 10,
    "noHttpsWeight" INTEGER NOT NULL DEFAULT 10,
    "notMobileFriendlyWeight" INTEGER NOT NULL DEFAULT 10,
    "slowLoadWeight" INTEGER NOT NULL DEFAULT 5,
    "slowLoadThreshold" INTEGER NOT NULL DEFAULT 3000,
    "noMetaTagsWeight" INTEGER NOT NULL DEFAULT 5,
    "recentContactPenalty" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoringConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchRun" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radiusKm" INTEGER NOT NULL DEFAULT 50,
    "maxResults" INTEGER NOT NULL DEFAULT 60,
    "maxSearchRequests" INTEGER NOT NULL DEFAULT 5,
    "maxDetailRequests" INTEGER NOT NULL DEFAULT 60,
    "maxPaginationDepth" INTEGER NOT NULL DEFAULT 3,
    "isDryRun" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalPlacesFound" INTEGER NOT NULL DEFAULT 0,
    "totalNewLeads" INTEGER NOT NULL DEFAULT 0,
    "totalDuplicates" INTEGER NOT NULL DEFAULT 0,
    "searchRequests" INTEGER NOT NULL DEFAULT 0,
    "detailRequests" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "errors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchRunLead" (
    "id" TEXT NOT NULL,
    "searchRunId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchRunLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "templateId" TEXT,
    "niche" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "dailyLimit" INTEGER NOT NULL DEFAULT 50,
    "minDelaySeconds" INTEGER NOT NULL DEFAULT 5,
    "maxDelaySeconds" INTEGER NOT NULL DEFAULT 45,
    "cooldownDays" INTEGER NOT NULL DEFAULT 30,
    "safeSendMode" BOOLEAN NOT NULL DEFAULT true,
    "audienceFilters" TEXT,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "totalBounced" INTEGER NOT NULL DEFAULT 0,
    "totalOpened" INTEGER NOT NULL DEFAULT 0,
    "totalReplied" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSend" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "SendStatus" NOT NULL DEFAULT 'QUEUED',
    "templateUsed" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignSend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "niche" TEXT,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuppressionEntry" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "domain" TEXT,
    "reason" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuppressionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiUsage" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "endpoint" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiUsageCap" (
    "id" TEXT NOT NULL,
    "dailySearchLimit" INTEGER NOT NULL DEFAULT 100,
    "dailyDetailLimit" INTEGER NOT NULL DEFAULT 500,
    "monthlySearchLimit" INTEGER NOT NULL DEFAULT 2000,
    "monthlyDetailLimit" INTEGER NOT NULL DEFAULT 10000,
    "perRunSearchLimit" INTEGER NOT NULL DEFAULT 10,
    "perRunDetailLimit" INTEGER NOT NULL DEFAULT 100,
    "perRunMaxPlaces" INTEGER NOT NULL DEFAULT 100,
    "maxPaginationDepth" INTEGER NOT NULL DEFAULT 3,
    "searchCostPer1000" DOUBLE PRECISION NOT NULL DEFAULT 32.0,
    "detailCostPer1000" DOUBLE PRECISION NOT NULL DEFAULT 17.0,
    "dailySendLimit" INTEGER NOT NULL DEFAULT 100,
    "monthlySendLimit" INTEGER NOT NULL DEFAULT 2000,
    "warningThreshold80" BOOLEAN NOT NULL DEFAULT true,
    "warningThreshold95" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiUsageCap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_placeId_key" ON "Lead"("placeId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_score_idx" ON "Lead"("score");

-- CreateIndex
CREATE INDEX "Lead_niche_idx" ON "Lead"("niche");

-- CreateIndex
CREATE INDEX "Lead_websiteDomain_idx" ON "Lead"("websiteDomain");

-- CreateIndex
CREATE INDEX "Lead_nationalPhone_idx" ON "Lead"("nationalPhone");

-- CreateIndex
CREATE INDEX "LeadEmail_email_idx" ON "LeadEmail"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LeadEmail_leadId_email_key" ON "LeadEmail"("leadId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringSignal_leadId_key" ON "ScoringSignal"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "SearchRunLead_searchRunId_leadId_key" ON "SearchRunLead"("searchRunId", "leadId");

-- CreateIndex
CREATE INDEX "CampaignSend_campaignId_idx" ON "CampaignSend"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignSend_leadId_idx" ON "CampaignSend"("leadId");

-- CreateIndex
CREATE INDEX "CampaignSend_status_idx" ON "CampaignSend"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SuppressionEntry_email_key" ON "SuppressionEntry"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SuppressionEntry_domain_key" ON "SuppressionEntry"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "ApiUsage_date_endpoint_key" ON "ApiUsage"("date", "endpoint");

-- CreateIndex
CREATE INDEX "AuditLog_leadId_idx" ON "AuditLog"("leadId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- AddForeignKey
ALTER TABLE "LeadEmail" ADD CONSTRAINT "LeadEmail_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringSignal" ADD CONSTRAINT "ScoringSignal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchRunLead" ADD CONSTRAINT "SearchRunLead_searchRunId_fkey" FOREIGN KEY ("searchRunId") REFERENCES "SearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchRunLead" ADD CONSTRAINT "SearchRunLead_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSend" ADD CONSTRAINT "CampaignSend_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSend" ADD CONSTRAINT "CampaignSend_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
