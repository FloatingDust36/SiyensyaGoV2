// app/utils/sessionManager.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DetectedObject, SceneContext, AnalysisResult } from '../navigation/types';

const SESSION_STORAGE_KEY = '@siyensyago_sessions';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export type DiscoverySession = {
    sessionId: string;
    fullImageUri: string;
    detectedObjects: DetectedObject[];
    exploredObjectIds: string[];
    context?: SceneContext;
    results: Record<string, AnalysisResult>;
    createdAt: number;
    expiresAt: number;
};

class SessionManager {
    private sessions: Map<string, DiscoverySession> = new Map();
    private initialized: boolean = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            const data = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
            if (data) {
                const sessionsArray: DiscoverySession[] = JSON.parse(data);

                const now = Date.now();
                sessionsArray.forEach(session => {
                    if (session.expiresAt > now) {
                        this.sessions.set(session.sessionId, session);
                    }
                });

                console.log(`✓ Loaded ${this.sessions.size} active sessions`);
            }
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing session manager:', error);
            this.sessions = new Map();
            this.initialized = true;
        }
    }

    private async persist(): Promise<void> {
        try {
            const sessionsArray = Array.from(this.sessions.values());
            await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionsArray));
        } catch (error) {
            console.error('Error persisting sessions:', error);
        }
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async createSession(
        fullImageUri: string,
        detectedObjects: DetectedObject[],
        context?: SceneContext
    ): Promise<string> {
        await this.initialize();

        const now = Date.now();
        const sessionId = this.generateSessionId();

        const session: DiscoverySession = {
            sessionId,
            fullImageUri,
            detectedObjects,
            exploredObjectIds: [],
            context,
            results: {},
            createdAt: now,
            expiresAt: now + SESSION_DURATION
        };

        this.sessions.set(sessionId, session);
        await this.persist();

        console.log(`Created session ${sessionId} with ${detectedObjects.length} objects`);
        return sessionId;
    }

    async getSession(sessionId: string): Promise<DiscoverySession | null> {
        await this.initialize();

        const session = this.sessions.get(sessionId);
        if (!session) return null;

        if (session.expiresAt < Date.now()) {
            this.sessions.delete(sessionId);
            await this.persist();
            console.log(` Session ${sessionId} expired`);
            return null;
        }

        return session;
    }

    async markObjectAsExplored(sessionId: string, objectId: string): Promise<void> {
        await this.initialize();

        const session = this.sessions.get(sessionId);
        if (!session) {
            console.warn(`Session ${sessionId} not found`);
            return;
        }

        if (!session.exploredObjectIds.includes(objectId)) {
            session.exploredObjectIds.push(objectId);
            this.sessions.set(sessionId, session);
            await this.persist();

            console.log(`✓ Marked ${objectId} as explored in session ${sessionId}`);
        }
    }

    async getUnexploredObjects(sessionId: string): Promise<DetectedObject[]> {
        const session = await this.getSession(sessionId);
        if (!session) return [];

        return session.detectedObjects.filter(
            obj => !session.exploredObjectIds.includes(obj.id)
        );
    }

    async hasUnexploredObjects(sessionId: string): Promise<boolean> {
        const unexplored = await this.getUnexploredObjects(sessionId);
        return unexplored.length > 0;
    }

    async getSessionStats(sessionId: string): Promise<{
        totalObjects: number;
        exploredCount: number;
        unexploredCount: number;
        completionPercentage: number;
        timeRemaining: string;
    } | null> {
        const session = await this.getSession(sessionId);
        if (!session) return null;

        const totalObjects = session.detectedObjects.length;
        const exploredCount = session.exploredObjectIds.length;
        const unexploredCount = totalObjects - exploredCount;
        const completionPercentage = totalObjects > 0
            ? Math.round((exploredCount / totalObjects) * 100)
            : 0;

        const remainingMs = session.expiresAt - Date.now();
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const timeRemaining = `${remainingHours}h ${remainingMinutes}m`;

        return {
            totalObjects,
            exploredCount,
            unexploredCount,
            completionPercentage,
            timeRemaining
        };
    }

    async cleanupExpiredSessions(): Promise<number> {
        await this.initialize();

        const now = Date.now();
        let cleanedCount = 0;

        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.expiresAt < now) {
                this.sessions.delete(sessionId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            await this.persist();
            console.log(`✓ Cleaned up ${cleanedCount} expired sessions`);
        }

        return cleanedCount;
    }

    async deleteSession(sessionId: string): Promise<void> {
        await this.initialize();

        if (this.sessions.delete(sessionId)) {
            await this.persist();
            console.log(`✓ Deleted session ${sessionId}`);
        }
    }

    async clearAllSessions(): Promise<void> {
        this.sessions.clear();
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        console.log('✓ Cleared all sessions');
    }

    async getAllSessions(): Promise<DiscoverySession[]> {
        await this.initialize();
        return Array.from(this.sessions.values());
    }

    async saveAnalysisResult(sessionId: string, objectId: string, result: AnalysisResult): Promise<void> {
        await this.initialize();
        const session = this.sessions.get(sessionId);
        if (session) {
            session.results[objectId] = result;
            this.sessions.set(sessionId, session);
            await this.persist();
            console.log(`✓ Cached analysis result for ${objectId}`);
        }
    }

    async getCachedResult(sessionId: string, objectId: string): Promise<AnalysisResult | undefined> {
        await this.initialize();
        const session = this.sessions.get(sessionId);
        return session?.results[objectId];
    }
}

export const sessionManager = new SessionManager();