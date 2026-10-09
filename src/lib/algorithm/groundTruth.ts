import { promises as fs } from "fs";
import path from "path";

export const GROUND_TRUTH_SCORE_RELEVANT = 2;

export interface GroundTruthRow {
    profile_id: string;
    province: string;
    att_id: string;
    relevant_score: number | null;
}

export function groundTruthKey(
    profileId: string,
    province: string
): string {
    return `${profileId}::${province}`;
}

function parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let value = "";
    let quoted = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (quoted && line[i + 1] === '"') {
                value += '"';
                i++;
            } else {
                quoted = !quoted;
            }
        } else if (char === "," && !quoted) {
            values.push(value);
            value = "";
        } else {
            value += char;
        }
    }

    values.push(value);
    return values;
}

export function parseGroundTruthCsv(content: string): GroundTruthRow[] {
    const lines = content
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter(line => line.trim().length > 0);

    if (lines.length === 0) {
        return [];
    }

    const header = parseCsvLine(lines[0]).map(value => value.trim());
    const profileIndex = header.indexOf("profile_id");
    const provinceIndex = header.indexOf("province");
    const attIdIndex = header.indexOf("att_id");
    const scoreIndex = header.indexOf("relevant_score");

    if (
        profileIndex < 0 ||
        provinceIndex < 0 ||
        attIdIndex < 0 ||
        scoreIndex < 0
    ) {
        throw new Error(
            "ground_truth_pool.csv must contain profile_id, province, att_id and relevant_score columns."
        );
    }

    return lines.slice(1).map(line => {
        const cells = parseCsvLine(line);
        const rawScore = (cells[scoreIndex] ?? "").trim();
        const score = rawScore === "" ? null : Number(rawScore);

        if (
            score !== null &&
            (!Number.isInteger(score) || score < 0 || score > 2)
        ) {
            throw new Error(
                `Invalid relevant_score "${rawScore}" for att_id=${cells[attIdIndex] ?? ""}. Use only 0, 1 or 2.`
            );
        }

        return {
            profile_id: (cells[profileIndex] ?? "").trim(),
            province: (cells[provinceIndex] ?? "").trim(),
            att_id: (cells[attIdIndex] ?? "").trim(),
            relevant_score: score,
        };
    });
}

export async function loadGroundTruthByProfileProvince(
    csvPath = path.join(process.cwd(), "comparison", "ground_truth_pool.csv")
): Promise<Map<string, Set<string>>> {
    let content: string;

    try {
        content = await fs.readFile(csvPath, "utf8");
    } catch (error: any) {
        if (error?.code === "ENOENT") {
            throw new Error(
                `Ground Truth file not found: ${csvPath}\nRun: npx tsx src/lib/algorithm/generateGroundTruthPool.ts\nThen fill relevant_score with 0/1/2 before running the comparison.`
            );
        }

        throw error;
    }

    const rows = parseGroundTruthCsv(content);

    if (rows.length === 0) {
        throw new Error("Ground Truth CSV is empty.");
    }

    const unlabeled = rows.filter(row => row.relevant_score === null);

    if (unlabeled.length > 0) {
        throw new Error(
            `Ground Truth is not fully labeled: ${unlabeled.length} rows still have blank relevant_score. Fill every row with 0, 1 or 2.`
        );
    }

    const byProfileProvince =
        new Map<string, Set<string>>();

    for (const row of rows) {
        if (
            row.relevant_score !== GROUND_TRUTH_SCORE_RELEVANT ||
            !row.profile_id ||
            !row.province ||
            !row.att_id
        ) {
            continue;
        }

        const key =
            groundTruthKey(
                row.profile_id,
                row.province
            );

        const set =
            byProfileProvince.get(key) ??
            new Set<string>();

        set.add(
            row.att_id
        );

        byProfileProvince.set(
            key,
            set
        );
    }

    return byProfileProvince;
}
