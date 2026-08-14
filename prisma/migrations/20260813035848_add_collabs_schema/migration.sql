-- CreateTable
CREATE TABLE "creator_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roles" TEXT NOT NULL DEFAULT '[]',
    "genres" TEXT NOT NULL DEFAULT '[]',
    "skills" TEXT NOT NULL DEFAULT '[]',
    "experience" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "remotePref" TEXT NOT NULL DEFAULT 'both',
    "availability" TEXT NOT NULL DEFAULT 'open',
    "headline" TEXT NOT NULL DEFAULT '',
    "portfolioLinks" TEXT NOT NULL DEFAULT '[]',
    "ratingAvg" REAL,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "creator_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collaboration_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "lookingFor" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "genre" TEXT NOT NULL,
    "subgenre" TEXT NOT NULL DEFAULT '',
    "mood" TEXT NOT NULL DEFAULT '',
    "skillsNeeded" TEXT NOT NULL DEFAULT '[]',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "locationType" TEXT NOT NULL DEFAULT 'remote',
    "location" TEXT NOT NULL DEFAULT '',
    "deadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "contactPref" TEXT NOT NULL DEFAULT 'in_app',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "collaboration_posts_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collaboration_applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "proposedPriceCents" INTEGER,
    "portfolioLinks" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "postId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    CONSTRAINT "collaboration_applications_postId_fkey" FOREIGN KEY ("postId") REFERENCES "collaboration_posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collaboration_applications_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collaboration_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "coverKey" TEXT,
    "releaseUrl" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "postId" TEXT NOT NULL,
    CONSTRAINT "collaboration_projects_postId_fkey" FOREIGN KEY ("postId") REFERENCES "collaboration_posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collaboration_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" DATETIME,
    "showcaseOnProfile" BOOLEAN NOT NULL DEFAULT true,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "collaboration_participants_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "collaboration_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collaboration_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collaboration_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    CONSTRAINT "collaboration_messages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "collaboration_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collaboration_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collaboration_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaderId" TEXT NOT NULL,
    "postId" TEXT,
    "applicationId" TEXT,
    "projectId" TEXT,
    "messageId" TEXT,
    CONSTRAINT "collaboration_files_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collaboration_files_postId_fkey" FOREIGN KEY ("postId") REFERENCES "collaboration_posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collaboration_files_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "collaboration_applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collaboration_files_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "collaboration_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collaboration_files_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "collaboration_messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collaboration_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "assigneeId" TEXT,
    CONSTRAINT "collaboration_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "collaboration_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collaboration_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collaboration_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "communication" INTEGER NOT NULL,
    "reliability" INTEGER NOT NULL,
    "qualityOfWork" INTEGER NOT NULL,
    "professionalism" INTEGER NOT NULL,
    "overall" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    CONSTRAINT "collaboration_reviews_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "collaboration_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collaboration_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collaboration_reviews_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collaboration_invitations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL DEFAULT '',
    "roleNeeded" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    CONSTRAINT "collaboration_invitations_postId_fkey" FOREIGN KEY ("postId") REFERENCES "collaboration_posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collaboration_invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collaboration_invitations_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "link" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_userId_key" ON "creator_profiles"("userId");

-- CreateIndex
CREATE INDEX "creator_profiles_availability_idx" ON "creator_profiles"("availability");

-- CreateIndex
CREATE INDEX "collaboration_posts_creatorId_idx" ON "collaboration_posts"("creatorId");

-- CreateIndex
CREATE INDEX "collaboration_posts_status_idx" ON "collaboration_posts"("status");

-- CreateIndex
CREATE INDEX "collaboration_posts_lookingFor_idx" ON "collaboration_posts"("lookingFor");

-- CreateIndex
CREATE INDEX "collaboration_posts_genre_idx" ON "collaboration_posts"("genre");

-- CreateIndex
CREATE INDEX "collaboration_posts_isPaid_idx" ON "collaboration_posts"("isPaid");

-- CreateIndex
CREATE INDEX "collaboration_posts_locationType_idx" ON "collaboration_posts"("locationType");

-- CreateIndex
CREATE INDEX "collaboration_posts_createdAt_idx" ON "collaboration_posts"("createdAt");

-- CreateIndex
CREATE INDEX "collaboration_applications_postId_idx" ON "collaboration_applications"("postId");

-- CreateIndex
CREATE INDEX "collaboration_applications_applicantId_idx" ON "collaboration_applications"("applicantId");

-- CreateIndex
CREATE INDEX "collaboration_applications_status_idx" ON "collaboration_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "collaboration_projects_postId_key" ON "collaboration_projects"("postId");

-- CreateIndex
CREATE INDEX "collaboration_projects_status_idx" ON "collaboration_projects"("status");

-- CreateIndex
CREATE INDEX "collaboration_participants_userId_idx" ON "collaboration_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "collaboration_participants_projectId_userId_key" ON "collaboration_participants"("projectId", "userId");

-- CreateIndex
CREATE INDEX "collaboration_messages_projectId_idx" ON "collaboration_messages"("projectId");

-- CreateIndex
CREATE INDEX "collaboration_messages_createdAt_idx" ON "collaboration_messages"("createdAt");

-- CreateIndex
CREATE INDEX "collaboration_files_postId_idx" ON "collaboration_files"("postId");

-- CreateIndex
CREATE INDEX "collaboration_files_applicationId_idx" ON "collaboration_files"("applicationId");

-- CreateIndex
CREATE INDEX "collaboration_files_projectId_idx" ON "collaboration_files"("projectId");

-- CreateIndex
CREATE INDEX "collaboration_files_messageId_idx" ON "collaboration_files"("messageId");

-- CreateIndex
CREATE INDEX "collaboration_files_uploaderId_idx" ON "collaboration_files"("uploaderId");

-- CreateIndex
CREATE INDEX "collaboration_tasks_projectId_idx" ON "collaboration_tasks"("projectId");

-- CreateIndex
CREATE INDEX "collaboration_tasks_assigneeId_idx" ON "collaboration_tasks"("assigneeId");

-- CreateIndex
CREATE INDEX "collaboration_tasks_dueDate_idx" ON "collaboration_tasks"("dueDate");

-- CreateIndex
CREATE INDEX "collaboration_reviews_revieweeId_idx" ON "collaboration_reviews"("revieweeId");

-- CreateIndex
CREATE INDEX "collaboration_reviews_projectId_idx" ON "collaboration_reviews"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "collaboration_reviews_projectId_reviewerId_revieweeId_key" ON "collaboration_reviews"("projectId", "reviewerId", "revieweeId");

-- CreateIndex
CREATE INDEX "collaboration_invitations_postId_idx" ON "collaboration_invitations"("postId");

-- CreateIndex
CREATE INDEX "collaboration_invitations_inviterId_idx" ON "collaboration_invitations"("inviterId");

-- CreateIndex
CREATE INDEX "collaboration_invitations_inviteeId_idx" ON "collaboration_invitations"("inviteeId");

-- CreateIndex
CREATE INDEX "collaboration_invitations_status_idx" ON "collaboration_invitations"("status");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");
