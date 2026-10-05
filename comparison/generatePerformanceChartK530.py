import json
import os
import csv
from collections import defaultdict

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

K_VALUES_EXPECTED = [5, 10, 15, 20, 25, 30]

# ============================================================
# FONT
# ============================================================

available_fonts = {font.name for font in fm.fontManager.ttflist}
selected_font = "DejaVu Sans"
for font in [
    "Tahoma",
    "Noto Sans Thai",
    "Noto Sans Thai Looped",
    "Leelawadee UI",
    "Arial Unicode MS",
    "DejaVu Sans",
]:
    if font in available_fonts:
        selected_font = font
        break

plt.rcParams["font.family"] = selected_font
plt.rcParams["axes.unicode_minus"] = False

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
    return safe_float(row.get(algorithm, {}).get("metrics", {}).get(metric, 0))


def dynamic_ylim(values, metric):
    if metric == "precision":
        return 0.0, 1.05

    max_value = max(values) if values else 1.0
    if max_value <= 0:
        return 0.0, 1.0

    upper = max_value * 1.15

    if metric == "recall":
        upper = max(upper, 0.25)
    elif metric == "f1":
        upper = max(upper, 0.35)
    elif metric == "diversity":
        upper = max(upper, 0.30)

    return 0.0, upper

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
        "ไม่พบข้อมูล Distance Emphasis ที่มี alpha=0.2, beta=0.3, gamma=0.5"
    )

# ============================================================
# AGGREGATE BY K ACROSS TEST PROVINCES
# ============================================================

grouped = defaultdict(list)
for row in final_rows:
    k = int(row.get("k", 0))
    if k in K_VALUES_EXPECTED:
        grouped[k].append(row)

k_values = sorted(grouped.keys())

if k_values != K_VALUES_EXPECTED:
    print(f"Warning: expected K values {K_VALUES_EXPECTED}, found {k_values}")

metrics = ["precision", "recall", "f1", "diversity"]
metric_labels = {
    "precision": "Precision",
    "recall": "Recall",
    "f1": "F1-score",
    "diversity": "Diversity",
}

summary_rows = []
series = {}

for metric in metrics:
    baseline_values = []
    tdmc_values = []

    for k in k_values:
        rows_k = grouped[k]
        baseline_avg = average([
            get_metric(row, "old", metric)
            for row in rows_k
        ])
        tdmc_avg = average([
            get_metric(row, "tdmc", metric)
            for row in rows_k
        ])

        baseline_values.append(baseline_avg)
        tdmc_values.append(tdmc_avg)

        summary_rows.append({
            "Metric": metric_labels[metric],
            "K": k,
            BASELINE_LABEL: baseline_avg,
            TDMC_LABEL: tdmc_avg,
        })

    series[metric] = {
        "baseline": baseline_values,
        "tdmc": tdmc_values,
    }

# ============================================================
# EXPORT CSV
# ============================================================

csv_path = os.path.join(
    OUTPUT_DIR,
    "01_weighted_profile_matching_vs_tdmc_apd_k5_k30.csv",
)

with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=["Metric", "K", BASELINE_LABEL, TDMC_LABEL],
    )
    writer.writeheader()
    writer.writerows(summary_rows)

# ============================================================
# PERFORMANCE CHART K=5..30
# ============================================================

fig, axes = plt.subplots(2, 2, figsize=(15, 10), sharex=True)
axes = axes.flatten()

for ax, metric in zip(axes, metrics):
    baseline_values = series[metric]["baseline"]
    tdmc_values = series[metric]["tdmc"]

    ax.plot(
        k_values,
        baseline_values,
        marker="o",
        linewidth=2.2,
        color=BASELINE_COLOR,
        markerfacecolor=BASELINE_COLOR,
        markeredgecolor=BASELINE_COLOR,
        label=BASELINE_LABEL,
    )
    ax.plot(
        k_values,
        tdmc_values,
        marker="o",
        linewidth=2.2,
        color=TDMC_COLOR,
        markerfacecolor=TDMC_COLOR,
        markeredgecolor=TDMC_COLOR,
        label=TDMC_LABEL,
    )

    ymin, ymax = dynamic_ylim(
        baseline_values + tdmc_values,
        metric,
    )
    ax.set_ylim(ymin, ymax)

    ax.set_title(metric_labels[metric], fontsize=14, fontweight="bold")
    ax.set_xlabel("Recommendation List Size (K)")
    ax.set_ylabel("Score")
    ax.set_xticks(k_values)
    ax.grid(True, linestyle="--", alpha=0.25)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

fig.suptitle(
    "Weighted Profile-Matching Baseline vs TDMC-APD\n"
    "Performance Across Recommendation List Sizes (K = 5–30)",
    fontsize=16,
    fontweight="bold",
    y=0.985,
)

handles, labels = axes[0].get_legend_handles_labels()
fig.legend(
    handles,
    labels,
    loc="upper center",
    bbox_to_anchor=(0.5, 0.925),
    ncol=2,
    frameon=False,
)

fig.subplots_adjust(
    top=0.84,
    bottom=0.08,
    left=0.07,
    right=0.98,
    hspace=0.28,
    wspace=0.12,
)

png_path = os.path.join(
    OUTPUT_DIR,
    "01_weighted_profile_matching_vs_tdmc_apd_k5_k30.png",
)
plt.savefig(png_path, dpi=300, bbox_inches="tight")
plt.close()

print(f"Saved: {png_path}")
print(f"Saved: {csv_path}")
print(f"K values used: {k_values}")
