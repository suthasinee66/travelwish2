export type AIModel =
    | "claude"
    | "gpt"
    | "gemini";

// Local = ใช้ Backend ในเครื่อง
// Production = ใช้ Backend ที่ Deploy
const API_URL =
    import.meta.env.DEV
        ? "http://localhost:5000"
        : import.meta.env.VITE_API_URL;

export async function generateWithSelectedModel(
    selectedModel: AIModel,
    prompt: string,
    options?: {
        structuredPlanner?: boolean;
    }
): Promise<string> {

    const response = await fetch(
        `${API_URL}/api/ai`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                model: selectedModel,
                prompt,
                structuredPlanner:
                    options?.structuredPlanner === true
            })
        }
    );

    if (!response.ok) {

        const error =
            await response.text();

        console.error(
            "AI Server Error:",
            error
        );

        throw new Error(
            "AI server error"
        );
    }

    const data =
        await response.json();

    if (!data.content) {
        throw new Error(
            "AI returned empty response"
        );
    }

    if (
        options?.structuredPlanner &&
        data.finish_reason &&
        !["stop", "tool_calls"].includes(
            String(data.finish_reason)
        )
    ) {
        throw new Error(
            `AI response incomplete: ${data.finish_reason}`
        );
    }

    const content = String(data.content).trim();

    // บางโมเดลอาจครอบคำตอบจริงด้วย JSON เช่น
    // {"response":"## หัวข้อ\n..."}
    // แกะเฉพาะ wrapper ที่มี key เดียว เพื่อไม่กระทบ JSON
    // ที่ระบบใช้สำหรับ intent / trip extraction
    try {
        const parsed = JSON.parse(content);

        if (
            parsed &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
        ) {
            const keys = Object.keys(parsed);

            if (
                keys.length === 1 &&
                typeof parsed.response === "string"
            ) {
                return parsed.response.trim();
            }

            if (
                keys.length === 1 &&
                typeof parsed.content === "string"
            ) {
                return parsed.content.trim();
            }

            if (
                keys.length === 1 &&
                typeof parsed.reply === "string"
            ) {
                return parsed.reply.trim();
            }
        }
    } catch {
        // ไม่ใช่ JSON wrapper: คืนข้อความเดิมให้ ReactMarkdown render
    }

    return content;
}