/**
 * TravelWish: generate independently annotated Ground Truth CSVs.
 *
 * Usage:
 * npx tsx src/lib/algorithm/generateGroundTruthCsv.ts [inputDir] [outputDir]
 *
 * Input directory must contain attraction_rows.csv and 21 JSON logs named
 * travelwish_case{1..7}_{bangkok|chiangmai|phuket}.json.
 * For cases 1-3, the optional "(1).json" upload takes precedence.
 *
 * The ground-truth label is intentionally left EMPTY. Never use TDMC output
 * or ranks to decide whether an attraction is relevant.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Row = Record<string, unknown>;
const inputDir = process.argv[2] ?? join(process.cwd(), 'research-data');
const outputDir = process.argv[3] ?? join(process.cwd(), 'research-output');
const provinces = [
  ['bangkok', 'กรุงเทพมหานคร'],
  ['chiangmai', 'เชียงใหม่'],
  ['phuket', 'ภูเก็ต'],
] as const;

function parseCsv(input: string): Record<string, string>[] {
  const text = input.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(value => value.length > 0)) records.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) { row.push(cell); records.push(row); }
  const [header, ...body] = records;
  if (!header?.includes('att_id')) throw new Error('Invalid attraction_rows.csv: att_id header missing');
  return body.map(cells => Object.fromEntries(header.map((key, index) => [key, cells[index] ?? ''])));
}

function csvCell(value: unknown): string {
  const raw = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(raw) ? '"' + raw.replace(/"/g, '""') + '"' : raw;
}

function writeCsv(name: string, columns: string[], rows: Row[]) {
  const content = [columns, ...rows.map(row => columns.map(column => row[column] ?? ''))]
    .map(row => row.map(csvCell).join(','))
    .join('\r\n') + '\r\n';
  // UTF-8 BOM ensures Microsoft Excel correctly opens Thai characters.
  writeFileSync(join(outputDir, name), '\uFEFF' + content, 'utf8');
}

function extractJsonAfter(prompt: string, marker: string, first: '{' | '['): unknown {
  const markerPosition = prompt.indexOf(marker);
  if (markerPosition < 0) throw new Error('Missing prompt marker: ' + marker);
  const start = prompt.indexOf(first, markerPosition + marker.length);
  if (start < 0) throw new Error('No JSON after marker: ' + marker);
  let quoted = false;
  let escaped = false;
  const stack: string[] = [];
  for (let i = start; i < prompt.length; i++) {
    const ch = prompt[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') {
      const opening = stack.pop();
      if ((ch === '}' && opening !== '{') || (ch === ']' && opening !== '[')) {
        throw new Error('Malformed JSON after: ' + marker);
      }
      if (stack.length === 0) return JSON.parse(prompt.slice(start, i + 1));
    }
  }
  throw new Error('Unclosed JSON after: ' + marker);
}

interface ProfileBlock {
  profile: { name?: string; age?: string; gender?: string };
  preferences: Record<string, unknown>;
}
interface Candidate {
  rank?: number;
  attraction?: { id?: string; name_th?: string; distanceKm?: number };
}

function main() {
  mkdirSync(outputDir, { recursive: true });
  let available: string[];
  try {
    available = readdirSync(inputDir);
  } catch {
    throw new Error(
      'Input folder not found: ' + inputDir +
      '\nDownload and extract TravelWish_groundtruth_input_21cases.zip into the project root.' +
      '\nExpected folder: research-data (contains attraction_rows.csv and 21 JSON files).'
    );
  }
  const files = new Set(available);
  const attractionCsv = join(inputDir, 'attraction_rows.csv');
  const attractions = parseCsv(readFileSync(attractionCsv, 'utf8'));
  const byProvince = new Map(provinces.map(([, name]) => [
    name, attractions.filter(place => place.province === name),
  ]));

  const profiles: Row[] = [];
  const reference: Row[] = [];
  const annotation: Row[] = [];
  let processed = 0;

  for (let n = 1; n <= 7; n++) {
    for (const [slug, province] of provinces) {
      const stem = `travelwish_case${n}_${slug}`;
      const file = n <= 3 && files.has(stem + '(1).json')
        ? stem + '(1).json' : stem + '.json';
      if (!files.has(file)) {
        throw new Error(
          'Required JSON file missing: ' + file +
          '\nInput folder: ' + inputDir +
          '\nExtract TravelWish_groundtruth_input_21cases.zip into your project root, then run npm run groundtruth:csv.'
        );
      }

      const log = JSON.parse(readFileSync(join(inputDir, file), 'utf8'));
      const prompt: unknown = log.models?.gemini?.rounds?.[0]?.prompt;
      if (typeof prompt !== 'string') throw new Error(file + ': Gemini Round 1 prompt missing');

      const p = extractJsonAfter(prompt, '1. USER PROFILE + PERSONALIZATION CONTEXT', '{') as ProfileBlock;
      if (p.profile?.name?.toLowerCase() !== 'test' + n) {
        throw new Error(file + ': expected test' + n + ' but prompt contains ' + p.profile?.name);
      }
      const prefs = p.preferences;
      if (slug === 'bangkok') {
        profiles.push({
          case_id: 'Case ' + n,
          age: p.profile.age ?? '', gender: p.profile.gender ?? '',
          travel_type: prefs.travel_type ?? [],
          activities: prefs.activities ?? [],
          atmosphere: prefs.atmosphere ?? '',
          budget: prefs.budget ?? '',
          travel_companion: prefs.travel_companion ?? '',
          preferred_region: prefs.preferred_region ?? [],
          travel_goal: prefs.travel_goal ?? '',
          travel_time: prefs.travel_time ?? '',
        });
      }

      const tdmc = extractJsonAfter(prompt, 'TDMC CANDIDATES:', '[') as Candidate[];
      if (!Array.isArray(tdmc)) throw new Error(file + ': missing TDMC candidates');
      for (const entry of tdmc) {
        const a = entry.attraction ?? {};
        reference.push({
          case_id: 'Case ' + n, province,
          att_id: a.id ?? '', name_th: a.name_th ?? '',
          tdmc_rank: entry.rank ?? '', distanceKm: a.distanceKm ?? '',
          source_file: file,
        });
      }
      for (const attraction of byProvince.get(province) ?? []) {
        annotation.push({
          case_id: 'Case ' + n, province,
          att_id: attraction.att_id, name_th: attraction.name_th,
          travel_type: attraction.travel_type,
          activities: attraction.activities,
          atmosphere: attraction.atmosphere,
          budget: attraction.budget,
          travel_companion: attraction.travel_companion,
          category: attraction.category,
          detail_th: attraction.detail_th?.slice(0, 450) ?? '',
          relevant_0_or_1: '',
          reason: '', reviewer: '', review_notes: '',
        });
      }
      processed++;
      console.log(`Case ${n} — ${province}: ${(byProvince.get(province) ?? []).length} attractions, ${tdmc.length} TDMC candidates`);
    }
  }

  writeCsv('travelwish_ground_truth_annotation_7cases_3provinces.csv', [
    'case_id', 'province', 'att_id', 'name_th', 'travel_type',
    'activities', 'atmosphere', 'budget', 'travel_companion',
    'category', 'detail_th', 'relevant_0_or_1', 'reason',
    'reviewer', 'review_notes',
  ], annotation);
  writeCsv('travelwish_ground_truth_profiles.csv', [
    'case_id', 'age', 'gender', 'travel_type', 'activities',
    'atmosphere', 'budget', 'travel_companion', 'preferred_region',
    'travel_goal', 'travel_time',
  ], profiles);
  writeCsv('travelwish_tdmc_top30_reference_21runs.csv', [
    'case_id', 'province', 'att_id', 'name_th', 'tdmc_rank',
    'distanceKm', 'source_file',
  ], reference);
  console.log(`Done: ${processed} runs; ${annotation.length} unlabeled rows; ${reference.length} TDMC references.`);
  console.log('Do not edit/re-run over manually labeled CSV without backing it up.');
}
main();
