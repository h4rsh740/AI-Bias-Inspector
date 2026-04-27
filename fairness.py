from typing import Dict, Tuple

import pandas as pd
from fairlearn.metrics import MetricFrame, selection_rate


def evaluate_fairness(
    y_true: pd.Series,
    y_pred: pd.Series,
    sensitive: pd.Series,
) -> Tuple[float, float, float, Dict[str, float]]:
    """Return female rate, male rate, absolute bias gap, and dictionary for charting."""
    metric_frame = MetricFrame(
        metrics={"selection_rate": selection_rate},
        y_true=y_true,
        y_pred=y_pred,
        sensitive_features=sensitive,
    )

    rates = metric_frame.by_group["selection_rate"]

    female = float(rates.get(0, 0.0))
    male = float(rates.get(1, 0.0))
    bias_diff = abs(male - female)

    chart_data = {"Female": female, "Male": male}
    return female, male, bias_diff, chart_data
