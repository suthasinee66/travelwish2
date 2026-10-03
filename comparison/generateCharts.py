import json
import os
import csv
from collections import defaultdict

import numpy as np
import pandas as pd

import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

# ============================================================
# CONFIG
# ============================================================

INPUT_FILE = "comparison/comparisonResults.json"
OUTPUT_DIR = "comparison/charts"
os.makedirs(OUTPUT_DIR, exist_ok=True)

FINAL_EXPERIMENT = "Distance Emphasis"
FINAL_ALPHA = 0.2
FINAL_BETA = 0.3
FINAL_GAMMA = 0.5

BASELINE_LABEL = "Weighted Profile-Matching Baseline"
TDMC_LABEL = "TDMC-APD"

BASELINE_COLOR = "#8C8C8C"
TDMC_COLOR = "#1F77B4"
GREEN = "#59A14F"
RED = "#E15759"

# ============================================================
# FONT
# ============================================================

available_fonts = {font.name for font in fm.fontManager.ttflist}
thai_fonts = [
    "Tahoma",
    "Noto Sans Thai",
    "Noto Sans Thai Looped",
    "Leelawadee UI",
    "Arial Unicode MS",
    "DejaVu Sans",
]

selected_font = "DejaVu Sans"
for font in thai_fonts:
    if font in available_fonts:
        selected_font = font
        break

plt.rcParams["font.family"] = selected_font
plt.rcParams["axes.unicode_minus"] = False

# ============================================================
# METRICS
# nDCG intentionally removed from all charts/report exports.
# ============================================================

METRICS = [
    "precision",
    "recall",
    "f1",
    "averageRating",
    "diversity",
    "avgDistance",
    "runtime",
]

METRIC_LABELS = {
    "precision": "Precision",
    "recall": "Recall",
    "f1": "F1",
    "averageRating": "Average Rating",
    "diversity": "Diversity",
    "avgDistance": "Average Distance",
    "runtime": "Runtime",
}

LOWER_IS_BETTER = {"avgDistance", "runtime"}

# ============================================================
# HELPERS
# ============================================================

def safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def average(values):
    return sum(values) / len(values) if values else 0.0


def get_experiment_name(row):
    experiment = row.get("experiment", {})
    tdmc = row.get("tdmc", {})
    return experiment.get("name") or tdmc.get("experimentName") or "Unknown"


def get_weight(row, key):
    experiment = row.get("experiment", {})
    tdmc = row.get("tdmc", {})
    return safe_float(experiment.get(key, tdmc.get(key, 0)))


def get_metric(row, algorithm, metric):
    if metric == "runtime":
        return safe_float(row.get(algorithm, {}).get("runtime", 0))
    return safe_float(row.get(algorithm, {}).get("metrics", {}).get(metric, 0))


def improvement(baseline, tdmc, metric):
    if metric in LOWER_IS_BETTER:
        return baseline - tdmc
    return tdmc - baseline


def improvement_percent(baseline, tdmc, metric):
    if baseline == 0:
        return 0.0
    if metric in LOWER_IS_BETTER:
        return ((baseline - tdmc) / baseline) * 100
    return ((tdmc - baseline) / baseline) * 100


def save_chart(filename):
    path = os.path.join(OUTPUT_DIR, filename)
    plt.tight_layout()
    plt.savefig(path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"Saved: {path}")


# ============================================================
# LOAD RESULTS
# ============================================================

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

if isinstance(data, dict):
    if "results" in data:
        rows = data["results"]
    elif "data" in data:
        rows = data["data"]
    else:
        rows = []
        for value in data.values():
            if isinstance(value, list):
                rows.extend(value)
else:
    rows = data

final_rows = []
for row in rows:
    if (
        get_experiment_name(row) == FINAL_EXPERIMENT
        and abs(get_weight(row, "alpha") - FINAL_ALPHA) < 0.0001
        and abs(get_weight(row, "beta") - FINAL_BETA) < 0.0001
        and abs(get_weight(row, "gamma") - FINAL_GAMMA) < 0.0001
    ):
        final_rows.append(row)

if not final_rows:
    raise ValueError(
        "ไม่พบข้อมูล Distance Emphasis ที่มี α=0.2, β=0.3, γ=0.5"
    )

# ============================================================
# AGGREGATE BY PROVINCE / K
# ============================================================

grouped = defaultdict(list)
for row in final_rows:
    grouped[(row.get("province", "Unknown"), row.get("k", 0))].append(row)

cases = sorted(grouped.keys())
case_results = []

for province, k in cases:
    rows_case = grouped[(province, k)]
    result = {"province": province, "k": k}

    for metric in METRICS:
        baseline_value = average([
            get_metric(row, "old", metric)
            for row in rows_case
        ])
        tdmc_value = average([
            get_metric(row, "tdmc", metric)
            for row in rows_case
        ])

        result[f"baseline_{metric}"] = baseline_value
        result[f"tdmc_{metric}"] = tdmc_value
        result[f"improvement_{metric}"] = improvement(
            baseline_value, tdmc_value, metric
        )
        result[f"improvement_pct_{metric}"] = improvement_percent(
            baseline_value, tdmc_value, metric
        )

    case_results.append(result)

overall = {}
for metric in METRICS:
    baseline_avg = average([r[f"baseline_{metric}"] for r in case_results])
    tdmc_avg = average([r[f"tdmc_{metric}"] for r in case_results])
    overall[metric] = {
        "baseline": baseline_avg,
        "tdmc": tdmc_avg,
        "improvement": improvement(baseline_avg, tdmc_avg, metric),
        "improvement_pct": improvement_percent(baseline_avg, tdmc_avg, metric),
    }

# ============================================================
# EXPORT CSV — NO NDCG
# ============================================================

case_csv = "comparison/weighted_profile_matching_vs_tdmc_apd_by_case.csv"
fieldnames = ["province", "k"]
for metric in METRICS:
    fieldnames.extend([
        f"baseline_{metric}",
        f"tdmc_{metric}",
        f"improvement_{metric}",
        f"improvement_pct_{metric}",
    ])

with open(case_csv, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(case_results)

summary_csv = "comparison/FINAL_weighted_profile_matching_vs_tdmc_apd_summary.csv"
with open(summary_csv, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.writer(f)
    writer.writerow([
        "Configuration",
        "Alpha",
        "Beta",
        "Gamma",
        "Metric",
        BASELINE_LABEL,
        TDMC_LABEL,
        "Improvement",
        "Improvement (%)",
    ])
    for metric in METRICS:
        result = overall[metric]
        writer.writerow([
            FINAL_EXPERIMENT,
            FINAL_ALPHA,
            FINAL_BETA,
            FINAL_GAMMA,
            METRIC_LABELS[metric],
            result["baseline"],
            result["tdmc"],
            result["improvement"],
            result["improvement_pct"],
        ])

# ============================================================
# CHART 01 — PERFORMANCE ACROSS K
# Precision / Recall / F1 / Diversity only
# ============================================================

performance_metrics = ["precision", "recall", "f1", "diversity"]
y_axis_ranges = {
    "precision": (0.0, 1.0),
    "recall": (0.0, 0.2),
    "f1": (0.0, 0.3),
    "diversity": (0.0, 0.3),
}

k_values = sorted({r["k"] for r in case_results})
chart_rows = []

fig, axes = plt.subplots(2, 2, figsize=(15, 10), sharex=True)
axes = axes.flatten()

for ax, metric in zip(axes, performance_metrics):
    actual_k = []
    baseline_values = []
    tdmc_values = []

    for k in k_values:
        k_cases = [r for r in case_results if r["k"] == k]
        if not k_cases:
            continue

        baseline_avg = average([r[f"baseline_{metric}"] for r in k_cases])
        tdmc_avg = average([r[f"tdmc_{metric}"] for r in k_cases])

        actual_k.append(k)
        baseline_values.append(baseline_avg)
        tdmc_values.append(tdmc_avg)

        chart_rows.append({
            "Metric": METRIC_LABELS[metric],
            "K": k,
            BASELINE_LABEL: baseline_avg,
            TDMC_LABEL: tdmc_avg,
        })

    ax.plot(
        actual_k,
        baseline_values,
        marker="o",
        linewidth=2.4,
        color=BASELINE_COLOR,
        label=BASELINE_LABEL,
    )
    ax.plot(
        actual_k,
        tdmc_values,
        marker="o",
        linewidth=2.4,
        color=TDMC_COLOR,
        label=TDMC_LABEL,
    )

    ax.set_title(METRIC_LABELS[metric], fontsize=14, fontweight="bold")
    ax.set_xlabel("Recommendation List Size (K)")
    ax.set_ylabel("Score")
    ax.set_ylim(*y_axis_ranges[metric])
    ax.set_xticks(k_values)
    ax.grid(True, linestyle="--", alpha=0.25)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

handles, labels = axes[0].get_legend_handles_labels()
fig.legend(handles, labels, loc="upper center", ncol=2, frameon=False)
fig.suptitle(
    f"{BASELINE_LABEL} vs {TDMC_LABEL} Performance Across Recommendation List Sizes",
    fontsize=16,
    fontweight="bold",
    y=1.01,
)
plt.tight_layout(rect=[0, 0, 1, 0.95])
save_chart("01_weighted_profile_matching_vs_tdmc_apd_k1_k10.png")

pd.DataFrame(chart_rows).to_csv(
    os.path.join(OUTPUT_DIR, "01_weighted_profile_matching_vs_tdmc_apd_k1_k10.csv"),
    index=False,
    encoding="utf-8-sig",
)

# ============================================================
# CHART 02 — OVERALL QUALITY METRICS
# nDCG intentionally absent
# ============================================================

quality_metrics = ["precision", "recall", "f1", "diversity"]
labels = [METRIC_LABELS[m] for m in quality_metrics]
baseline_values = [overall[m]["baseline"] for m in quality_metrics]
tdmc_values = [overall[m]["tdmc"] for m in quality_metrics]

x = np.arange(len(labels))
width = 0.36
plt.figure(figsize=(10, 6))
plt.bar(x - width / 2, baseline_values, width, label=BASELINE_LABEL, color=BASELINE_COLOR)
plt.bar(x + width / 2, tdmc_values, width, label=TDMC_LABEL, color=TDMC_COLOR)
plt.xticks(x, labels)
plt.ylabel("Score")
plt.title(f"Overall Recommendation Performance — {BASELINE_LABEL} vs {TDMC_LABEL}")
plt.legend()
plt.grid(axis="y", linestyle="--", alpha=0.3)
save_chart("02_overall_recommendation_performance.png")

# ============================================================
# CHART 03 — IMPROVEMENT (%)
# ============================================================

improvement_metrics = [
    "precision",
    "recall",
    "f1",
    "diversity",
    "averageRating",
    "avgDistance",
    "runtime",
]
imp_labels = [METRIC_LABELS[m] for m in improvement_metrics]
imp_values = [overall[m]["improvement_pct"] for m in improvement_metrics]
colors = [GREEN if value >= 0 else RED for value in imp_values]

y = np.arange(len(imp_labels))
plt.figure(figsize=(11, 7))
plt.barh(y, imp_values, color=colors)
plt.axvline(0, linewidth=1)
plt.yticks(y, imp_labels)
plt.xlabel("Improvement (%)")
plt.title(f"{TDMC_LABEL} Improvement over {BASELINE_LABEL}")
plt.grid(axis="x", linestyle="--", alpha=0.3)
save_chart("03_tdmc_apd_improvement_over_weighted_profile_matching.png")

# ============================================================
# CHART 04 — AVERAGE RATING
# ============================================================

plt.figure(figsize=(8, 5))
labels = [BASELINE_LABEL, TDMC_LABEL]
values = [overall["averageRating"]["baseline"], overall["averageRating"]["tdmc"]]
plt.bar(labels, values, color=[BASELINE_COLOR, TDMC_COLOR], width=0.55)
plt.ylabel("Average Rating")
plt.ylim(0, 5.5)
plt.title("Average Rating Comparison")
plt.grid(axis="y", linestyle="--", alpha=0.3)
save_chart("04_average_rating.png")

# ============================================================
# CHART 05 — AVERAGE DISTANCE
# ============================================================

plt.figure(figsize=(8, 5))
values = [overall["avgDistance"]["baseline"], overall["avgDistance"]["tdmc"]]
plt.bar(labels, values, color=[BASELINE_COLOR, TDMC_COLOR], width=0.55)
plt.ylabel("Average Distance (km)")
plt.title("Average Distance Comparison")
plt.grid(axis="y", linestyle="--", alpha=0.3)
save_chart("05_average_distance.png")

# ============================================================
# CHART 06 — RUNTIME
# ============================================================

plt.figure(figsize=(8, 5))
values = [overall["runtime"]["baseline"], overall["runtime"]["tdmc"]]
plt.bar(labels, values, color=[BASELINE_COLOR, TDMC_COLOR], width=0.55)
plt.ylabel("Runtime (ms)")
plt.title("Runtime Comparison")
plt.grid(axis="y", linestyle="--", alpha=0.3)
save_chart("06_runtime.png")

# ============================================================
# CHART 07 — F1 VS DIVERSITY
# ============================================================

plt.figure(figsize=(9, 7))
for result in case_results:
    plt.scatter(
        result["baseline_f1"],
        result["baseline_diversity"],
        color=BASELINE_COLOR,
        s=80,
        alpha=0.8,
        marker="o",
    )
    plt.scatter(
        result["tdmc_f1"],
        result["tdmc_diversity"],
        color=TDMC_COLOR,
        s=80,
        alpha=0.8,
        marker="^",
    )

plt.scatter([], [], color=BASELINE_COLOR, s=80, marker="o", label=BASELINE_LABEL)
plt.scatter([], [], color=TDMC_COLOR, s=80, marker="^", label=TDMC_LABEL)
plt.xlabel("F1")
plt.ylabel("Diversity")
plt.title("F1 vs Diversity")
plt.legend()
plt.grid(linestyle="--", alpha=0.3)
save_chart("07_f1_vs_diversity.png")

# ============================================================
# CHART 08 — RATING VS DISTANCE
# ============================================================

plt.figure(figsize=(9, 7))
for result in case_results:
    plt.scatter(
        result["baseline_avgDistance"],
        result["baseline_averageRating"],
        color=BASELINE_COLOR,
        s=80,
        alpha=0.8,
        marker="o",
    )
    plt.scatter(
        result["tdmc_avgDistance"],
        result["tdmc_averageRating"],
        color=TDMC_COLOR,
        s=80,
        alpha=0.8,
        marker="^",
    )

plt.scatter([], [], color=BASELINE_COLOR, s=80, marker="o", label=BASELINE_LABEL)
plt.scatter([], [], color=TDMC_COLOR, s=80, marker="^", label=TDMC_LABEL)
plt.xlabel("Average Distance (km)")
plt.ylabel("Average Rating")
plt.title("Average Rating vs Average Distance")
plt.legend()
plt.grid(linestyle="--", alpha=0.3)
save_chart("08_rating_vs_distance.png")

# ============================================================
# CHART 09 — FINAL APD WEIGHTS
# ============================================================

weights = [FINAL_ALPHA, FINAL_BETA, FINAL_GAMMA]
weight_labels = ["Accuracy (α)", "Popularity (β)", "Distance (γ)"]
plt.figure(figsize=(8, 6))
plt.bar(weight_labels, weights, width=0.55)
plt.ylabel("Weight")
plt.title(f"Final {TDMC_LABEL} APD Configuration")
plt.ylim(0, 0.6)
plt.grid(axis="y", linestyle="--", alpha=0.3)
save_chart("09_tdmc_apd_weights.png")

print("\n========================================")
print("CHART GENERATION COMPLETE")
print("========================================")
print(f"Baseline label: {BASELINE_LABEL}")
print(f"Proposed method: {TDMC_LABEL}")
print("nDCG: excluded from all generated charts and CSV summaries")
print(f"Output directory: {OUTPUT_DIR}")
