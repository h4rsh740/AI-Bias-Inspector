from typing import Dict, Any

import pandas as pd
from fairlearn.metrics import (
    MetricFrame, 
    selection_rate, 
    demographic_parity_difference,
    equal_opportunity_difference
)
from sklearn.metrics import accuracy_score


def evaluate_fairness(
    y_true: pd.Series,
    y_pred: pd.Series,
    sensitive: pd.Series,
) -> Dict[str, Any]:
    """Calculate fairness metrics with demographic parity as primary bias metric."""
    metric_frame = MetricFrame(
        metrics={"selection_rate": selection_rate},
        y_true=y_true,
        y_pred=y_pred,
        sensitive_features=sensitive,
    )

    rates = metric_frame.by_group["selection_rate"]
    
    # sensitive maps {Male: 1, Female: 0}
    female_rate = float(rates.get(0, 0.0))
    male_rate = float(rates.get(1, 0.0))
    bias_diff = abs(male_rate - female_rate)
    
    dp_diff = demographic_parity_difference(y_true, y_pred, sensitive_features=sensitive)
    eo_diff = equal_opportunity_difference(y_true, y_pred, sensitive_features=sensitive)
    acc = accuracy_score(y_true, y_pred)
    
    # Determine bias level based on instructions:
    # < 0.05 -> Low
    # 0.05-0.15 -> Medium
    # > 0.15 -> High
    if bias_diff < 0.05:
        bias_level = "Low"
    elif bias_diff <= 0.15:
        bias_level = "Medium"
    else:
        bias_level = "High"

    chart_data = [
        {"group": "Female", "rate": female_rate},
        {"group": "Male", "rate": male_rate}
    ]
    
    return {
        "accuracy": acc,
        "female_rate": female_rate,
        "male_rate": male_rate,
        "bias_diff": bias_diff,
        "bias_difference": bias_diff,
        "demographic_parity_diff": dp_diff,
        "equal_opportunity_diff": eo_diff,
        "metric_used": "demographic_parity_difference",
        "bias_level": bias_level,
        "chart_data": chart_data
    }
