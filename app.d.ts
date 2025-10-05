// In app.d.ts
declare namespace NodeJS {
    interface ProcessEnv {
        EXPO_PUBLIC_GEMINI_API_KEY: string;
    }
}