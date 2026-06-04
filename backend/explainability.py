"""SHAP-based model explainability for FairLoan AI."""

from typing import Dict, Any, List

import numpy as np
import pandas as pd
import shap
from sklearn.linear_model import LogisticRegression


def compute_shap_values(
    model: LogisticRegression,
    x_data: pd.DataFrame,
    applicant_df: pd.DataFrame = None,
) -> Dict[str, Any]:
    """Compute SHAP values for model explainability.
    
    Args:
        model: A fitted LogisticRegression model.
        x_data: Training/test data used as background for the explainer.
        applicant_df: Optional single-row DataFrame for individual explanation.
                      If None, returns global feature importance only.
    
    Returns:
        Dictionary with global_importance and optionally per-feature contributions.
    """
    # Use LinearExplainer for LogisticRegression — fast and deterministic
    explainer = shap.LinearExplainer(model, x_data)
    
    result = {}
    
    # Global feature importance (mean absolute SHAP values)
    shap_values_all = explainer.shap_values(x_data)
    feature_names = list(x_data.columns)
    mean_abs_shap = np.abs(shap_values_all).mean(axis=0).tolist()
    
    global_importance = [
        {"feature": name, "importance": round(val, 4)}
        for name, val in sorted(
            zip(feature_names, mean_abs_shap),
            key=lambda x: x[1],
            reverse=True,
        )
    ]
    result["global_importance"] = global_importance
    
    # Individual explanation
    if applicant_df is not None:
        shap_values_single = explainer.shap_values(applicant_df)
        base_value = float(explainer.expected_value)
        
        contributions = []
        for name, val, shap_val in zip(
            feature_names,
            applicant_df.iloc[0].tolist(),
            shap_values_single[0].tolist(),
        ):
            contributions.append({
                "feature": name,
                "value": round(float(val), 2),
                "shap_value": round(float(shap_val), 4),
                "direction": "positive" if shap_val > 0 else "negative",
            })
        
        # Sort by absolute SHAP value
        contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        
        result["base_value"] = round(base_value, 4)
        result["contributions"] = contributions
        result["prediction_value"] = round(base_value + sum(c["shap_value"] for c in contributions), 4)
    
    return result
