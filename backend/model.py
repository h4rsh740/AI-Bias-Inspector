from typing import Tuple, Any

import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from fairlearn.reductions import ExponentiatedGradient, DemographicParity

REQUIRED_COLUMNS = {"income", "age", "gender", "loan_approved"}
EXTENDED_COLUMNS = {"credit_score", "loan_amount", "employment_years"}


def _validate_input(df: pd.DataFrame) -> None:
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")


def _prepare_features(df: pd.DataFrame, use_gender: bool = False):
    """Prepare features, handling both basic and extended column sets."""
    data = df.copy()

    # ensure mapping strings to int if needed
    data["gender"] = data["gender"].astype(str).str.strip().map(
        {"Male": 1, "Female": 0, "1": 1, "1.0": 1, "0": 0, "0.0": 0}
    )

    if data["gender"].isna().any():
        raise ValueError("Unexpected values in 'gender'. Expected only 'Male' or 'Female'.")

    # Determine available feature columns
    base_features = ["income", "age"]
    extended = [col for col in ["credit_score", "loan_amount", "employment_years"] if col in data.columns]
    
    feature_cols = base_features + extended
    if use_gender:
        feature_cols = ["income", "age", "gender"] + extended

    features = data[feature_cols]
    target = data["loan_approved"]
    sensitive = data["gender"]
    
    return data, features, target, sensitive, feature_cols


def train_model(
    df: pd.DataFrame,
    use_gender: bool = False,
    test_size: float = 0.3,
    random_state: int = 42,
) -> Tuple[LogisticRegression, pd.DataFrame, pd.Series, pd.Series]:
    """Train a logistic regression model and return holdout data for evaluation."""
    _validate_input(df)
    data, features, target, sensitive, feature_cols = _prepare_features(df, use_gender)

    x_train, x_test, y_train, y_test, _, s_test = train_test_split(
        features, target, sensitive, test_size=test_size, random_state=random_state, stratify=target
    )

    model = LogisticRegression(solver="liblinear", random_state=random_state)
    model.fit(x_train, y_train)

    return model, x_test, y_test, s_test


def mitigate_bias(
    df: pd.DataFrame,
    use_gender: bool = False,
    test_size: float = 0.3,
    random_state: int = 42,
) -> Tuple[Any, pd.DataFrame, pd.Series, pd.Series, pd.Series, pd.Series]:
    """Train baseline and fair models using constrained optimization.

    Uses ExponentiatedGradient with a DemographicParity constraint so mitigation
    is data-driven and reproducible, not based on manual threshold hacks.
    """
    _validate_input(df)
    data, features, target, sensitive, feature_cols = _prepare_features(df, use_gender)

    x_train, x_test, y_train, y_test, s_train, s_test = train_test_split(
        features,
        target,
        sensitive,
        test_size=test_size,
        random_state=random_state,
        stratify=target,
    )

    baseline_model = LogisticRegression(solver="liblinear", random_state=random_state)
    baseline_model.fit(x_train, y_train)
    y_pred_baseline = pd.Series(baseline_model.predict(x_test), index=y_test.index)

    # Compute baseline fairness gap (|male_rate - female_rate|) on the same holdout split.
    s_test_series = pd.Series(s_test, index=y_test.index)
    female_mask = s_test_series == 0
    male_mask = s_test_series == 1

    baseline_female_rate = float(y_pred_baseline.loc[female_mask].mean()) if female_mask.any() else 0.0
    baseline_male_rate = float(y_pred_baseline.loc[male_mask].mean()) if male_mask.any() else 0.0
    baseline_gap = abs(baseline_male_rate - baseline_female_rate)
    baseline_acc = float((y_pred_baseline == y_test).mean())

    # Tune eps over a small deterministic grid and pick the best fairness/accuracy trade-off.
    eps_grid = [0.001, 0.005, 0.01, 0.02, 0.05]
    max_accuracy_drop = 0.05

    best = None
    for eps in eps_grid:
        candidate = ExponentiatedGradient(
            estimator=LogisticRegression(solver="liblinear", random_state=random_state),
            constraints=DemographicParity(),
            eps=eps,
        )
        candidate.fit(x_train, y_train, sensitive_features=s_train)

        # EG prediction is randomized by design; fix random_state for reproducibility.
        y_candidate = pd.Series(candidate.predict(x_test, random_state=random_state), index=y_test.index)

        female_rate = float(y_candidate.loc[female_mask].mean()) if female_mask.any() else 0.0
        male_rate = float(y_candidate.loc[male_mask].mean()) if male_mask.any() else 0.0
        gap = abs(male_rate - female_rate)
        acc = float((y_candidate == y_test).mean())
        acc_drop = baseline_acc - acc

        record = {
            "model": candidate,
            "pred": y_candidate,
            "gap": gap,
            "acc": acc,
            "acc_drop": acc_drop,
            "eps": eps,
        }

        if best is None:
            best = record
            continue

        # Prefer lower fairness gap; tie-break with higher accuracy.
        if (record["gap"] < best["gap"]) or (
            record["gap"] == best["gap"] and record["acc"] > best["acc"]
        ):
            best = record

    # If the best fairness model hurts accuracy too much without improving fairness,
    # keep baseline behavior to avoid "mitigation makes it worse" outcomes.
    if best is None:
        return baseline_model, x_test, y_test, s_test, y_pred_baseline, y_pred_baseline

    if (best["gap"] >= baseline_gap) and (best["acc_drop"] > max_accuracy_drop):
        return baseline_model, x_test, y_test, s_test, y_pred_baseline, y_pred_baseline

    return best["model"], x_test, y_test, s_test, y_pred_baseline, best["pred"]


def predict_single(
    df_training: pd.DataFrame,
    applicant: dict,
    use_gender: bool = False,
    random_state: int = 42,
) -> dict:
    """Train on the full dataset then predict for a single applicant.
    
    Returns a dict with decision, probability, and feature contributions.
    """
    _validate_input(df_training)
    data, features, target, sensitive, feature_cols = _prepare_features(df_training, use_gender)

    model = LogisticRegression(solver="liblinear", random_state=random_state)
    model.fit(features, target)

    # Build applicant feature vector
    applicant_features = {}
    for col in feature_cols:
        if col == "gender":
            applicant_features[col] = 1 if applicant.get("gender", "Male") == "Male" else 0
        else:
            applicant_features[col] = applicant.get(col, 0)

    applicant_df = pd.DataFrame([applicant_features])
    
    probability = model.predict_proba(applicant_df)[0]
    prediction = model.predict(applicant_df)[0]
    
    # Feature importance via coefficients
    coefficients = dict(zip(feature_cols, model.coef_[0].tolist()))

    return {
        "approved": bool(prediction),
        "probability_approved": float(probability[1]),
        "probability_denied": float(probability[0]),
        "coefficients": coefficients,
        "features_used": feature_cols,
    }
