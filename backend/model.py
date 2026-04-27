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

    mitigator = ExponentiatedGradient(
        estimator=LogisticRegression(solver="liblinear", random_state=random_state),
        constraints=DemographicParity(),
        eps=0.01,
    )
    mitigator.fit(x_train, y_train, sensitive_features=s_train)

    y_pred_mitigated = pd.Series(mitigator.predict(x_test), index=y_test.index)

    return mitigator, x_test, y_test, s_test, y_pred_baseline, y_pred_mitigated


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
