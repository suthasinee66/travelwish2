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

function markdownValue(
    value: unknown,
    depth = 0
): string {
    if (
        value == null ||
        value === ""
    ) {
        return "";
    }

    if (
        typeof value ===
        "string"
    ) {
        return value.trim();
    }

    if (
        typeof value ===
        "number" ||
        typeof value ===
        "boolean"
    ) {
        return String(value);
    }

    if (Array.isArray(value)) {
        return value
            .map(item => {
                if (
                    item &&
                    typeof item ===
                    "object"
                ) {
                    const nested =
                        markdownValue(
                            item,
                            depth + 1
                        );

                    return nested
                        ? `- ${nested.replace(
                            /\n/g,
                            "\n  "
                        )}`
                        : "";
                }

                const text =
                    markdownValue(
                        item,
                        depth + 1
                    );

                return text
                    ? `- ${text}`
                    : "";
            })
            .filter(Boolean)
            .join("\n");
    }

    if (
        typeof value ===
        "object"
    ) {
        return Object.entries(
            value as Record<
                string,
                unknown
            >
        )
            .map(
                ([
                    key,
                    nestedValue
                ]) => {
                    const nested =
                        markdownValue(
                            nestedValue,
                            depth + 1
                        );

                    if (!nested) {
                        return "";
                    }

                    return `**${key}:** ${nested}`;
                }
            )
            .filter(Boolean)
            .join("\n");
    }

    return "";
}

function structuredJsonToMarkdown(
    parsed: Record<
        string,
        unknown
    >
) {
    const wrapperKeys = [
        "message",
        "markdown",
        "response",
        "content",
        "reply",
        "answer",
        "text",
    ];

    for (
        const key of wrapperKeys
    ) {
        if (
            typeof parsed[
                key
            ] === "string"
        ) {
            return String(
                parsed[key]
            ).trim();
        }
    }

    const titleKeys = [
        "สถานที่",
        "ชื่อสถานที่",
        "title",
        "name",
        "place",
    ];

    let title = "";

    for (
        const key of titleKeys
    ) {
        if (
            typeof parsed[
                key
            ] === "string"
        ) {
            title =
                String(
                    parsed[key]
                ).trim();

            if (title) {
                break;
            }
        }
    }

    const parts:
        string[] = [];

    if (title) {
        parts.push(
            `## ${title}`
        );
    }

    Object.entries(
        parsed
    ).forEach(
        ([
            key,
            value
        ]) => {
            if (
                title &&
                titleKeys.includes(
                    key
                )
            ) {
                return;
            }

            const body =
                markdownValue(
                    value
                );

            if (!body) {
                return;
            }

            parts.push(
                `### ${key}\n\n${body}`
            );
        }
    );

    return parts.join(
        "\n\n"
    );
}

export function normalizeMarkdownResponse(
    value: string
) {
    let text =
        String(value ?? "")
            .trim();

    // แกะ markdown/json fence ก่อน เพื่อรองรับโมเดลที่ชอบครอบคำตอบ
    text = text.replace(
        /^\s*```(?:markdown|md|json)?\s*\n?/i,
        ""
    );

    text = text.replace(
        /\n?\s*```\s*$/i,
        ""
    );

    text = text.replace(
        /```(?:markdown|md)\s*\n?([\s\S]*?)```/gi,
        (
            _match,
            markdownBody
        ) =>
            `\n\n${String(
                markdownBody ??
                ""
            ).trim()}\n\n`
    );

    text = text.replace(
        /```(?:markdown|md)\s*\n?/gi,
        ""
    );

    // บาง provider/model ยังคืน JSON แม้ prompt ขอ Markdown
    // รองรับทั้ง:
    // {"message":"### ..."}
    // และ structured JSON เช่น {"สถานที่":"...", "คำแนะนำ":[...]}
    try {
        const parsed =
            JSON.parse(
                text
            );

        if (
            parsed &&
            typeof parsed ===
                "object" &&
            !Array.isArray(
                parsed
            )
        ) {
            const markdown =
                structuredJsonToMarkdown(
                    parsed as Record<
                        string,
                        unknown
                    >
                );

            if (markdown) {
                text =
                    markdown;
            }
        }
    } catch {
        // ไม่ใช่ JSON ที่ parse ได้:
        // เก็บ Markdown/text เดิมไว้ตามปกติ
    }

    // เผื่อ wrapper string ด้านในมี markdown fence อีกชั้น
    text = text.replace(
        /```(?:markdown|md)\s*\n?([\s\S]*?)```/gi,
        (
            _match,
            markdownBody
        ) =>
            `\n\n${String(
                markdownBody ??
                ""
            ).trim()}\n\n`
    );

    text = text.replace(
        /```(?:markdown|md)\s*\n?/gi,
        ""
    );

    return text.trim();
}

async function waitBeforeAIRetry(
    milliseconds: number
) {
    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );
}

export async function generateWithSelectedModel(
    selectedModel: AIModel,
    prompt: string,
    options?: {
        responseMode?:
            | "planner_json"
            | "trend_context"
            | "accommodation_json"
            | "markdown";
    }
): Promise<string> {

    let response:
        Response | null =
        null;

    const retryDelays =
        [0, 1200, 2800];

    for (
        let attempt = 0;
        attempt <
        retryDelays.length;
        attempt += 1
    ) {
        const delay =
            retryDelays[
                attempt
            ];

        if (delay > 0) {
            console.warn(
                `⏳ AI 429 retry ${attempt}/${retryDelays.length - 1} in ${delay}ms`
            );

            await waitBeforeAIRetry(
                delay
            );
        }

        response =
            await fetch(
                `${API_URL}/api/ai`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            model:
                                selectedModel,

                            prompt,

                            responseMode:
                                options
                                    ?.responseMode ??
                                null
                        })
                }
            );

        if (
            response.status !==
            429
        ) {
            break;
        }

        const retryError =
            await response
                .clone()
                .text();

        console.warn(
            "⚠️ AI RATE LIMITED:",
            retryError
        );
    }

    if (
        !response ||
        !response.ok
    ) {
        const error =
            response
                ? await response.text()
                : "No AI response";

        console.error(
            "AI Server Error:",
            error
        );

        throw new Error(
            response?.status === 429
                ? "AI server rate limited after retries"
                : "AI server error"
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
        (
            options?.responseMode === "planner_json" ||
            options?.responseMode === "trend_context" ||
            options?.responseMode === "accommodation_json"
        ) &&
        data.finish_reason &&
        !["stop", "tool_calls"].includes(
            String(data.finish_reason)
        )
    ) {
        throw new Error(
            `AI response incomplete: ${data.finish_reason}`
        );
    }

    const rawContent =
        String(
            data.content
        ).trim();

    const content =
        options?.responseMode ===
        "markdown"
            ? normalizeMarkdownResponse(
                rawContent
            )
            : rawContent;

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