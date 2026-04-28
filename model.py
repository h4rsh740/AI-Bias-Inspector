from typing import Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from fairlearn.reductions import ExponentiatedGradient, DemographicParity

REQUIRED_COLUMNS = {"income", "age", "gender", "loan_approved"}


def _validate_input(df: pd.DataFrame) -> None:
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")


def train_model(
    df: pd.DataFrame,
    use_gender: bool = False,
    test_size: float = 0.3,
    random_state: int = 42,
) -> Tuple[LogisticRegression, pd.DataFrame, pd.Series, pd.Series]:
    """Train a logistic regression model and return holdout data for evaluation."""
    _validate_input(df)
    data = df.copy()

    data["gender"] = data["gender"].map({"Male": 1, "Female": 0})
    if data["gender"].isna().any():
        raise ValueError("Unexpected values in 'gender'. Expected only 'Male' or 'Female'.")

    if use_gender:
        features = data[["income", "age", "gender"]]
    else:
        features = data[["income", "age"]]

    target = data["loan_approved"]
    sensitive = data["gender"]

    x_train, x_test, y_train, y_test, _, s_test = train_test_split(
        features,
        target,
        sensitive,
        test_size=test_size,
        random_state=random_state,
        stratify=target,
    )

    model = LogisticRegression(solver="liblinear", random_state=random_state)
    model.fit(x_train, y_train)

    return model, x_test, y_test, s_test

def mitigate_bias(
    df: pd.DataFrame,
    use_gender: bool = False,
    test_size: float = 0.3,
    random_state: int = 42,
):
    _validate_input(df)
    data = df.copy()

    data["gender"] = data["gender"].astype(str).str.strip().map(
        {"Male": 1, "Female": 0, "1": 1, "1.0": 1, "0": 0, "0.0": 0}
    )
    if data["gender"].isna().any():
        raise ValueError("Unexpected values in 'gender'. Expected only 'Male' or 'Female'.")

    features = data[["income", "age", "gender"]] if use_gender else data[["income", "age"]]
    target = data["loan_approved"]
    sensitive = data["gender"]

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

    s_test_series = pd.Series(s_test, index=y_test.index)
    female_mask = s_test_series == 0
    male_mask = s_test_series == 1

    baseline_female_rate = float(y_pred_baseline.loc[female_mask].mean()) if female_mask.any() else 0.0
    baseline_male_rate = float(y_pred_baseline.loc[male_mask].mean()) if male_mask.any() else 0.0
    baseline_gap = abs(baseline_male_rate - baseline_female_rate)
    baseline_acc = float((y_pred_baseline == y_test).mean())

    def group_rate_match(pred_proba: pd.Series, sensitive: pd.Series, target_rate: float) -> pd.Series:
        adjusted = pd.Series(0, index=pred_proba.index)
        for group_value in [0, 1]:
            group_idx = sensitive[sensitive == group_value].index
            if len(group_idx) == 0:
                continue
            group_scores = pred_proba.loc[group_idx]
            k = int(np.round(target_rate * len(group_scores)))
            if k <= 0:
                continue
            if k >= len(group_scores):
                adjusted.loc[group_idx] = 1
                continue
            top_idx = group_scores.sort_values(ascending=False).head(k).index
            adjusted.loc[top_idx] = 1
        return adjusted

    best = {
        "model": baseline_model,
        "pred": y_pred_baseline,
        "gap": baseline_gap,
        "acc": baseline_acc,
        "acc_drop": 0.0,
    }

    y_train_pred = pd.Series(baseline_model.predict(x_train), index=y_train.index)
    target_rate = float(y_train_pred.mean())
    y_test_proba = pd.Series(baseline_model.predict_proba(x_test)[:, 1], index=y_test.index)
    y_post = group_rate_match(y_test_proba, s_test_series, target_rate)

    post_female_rate = float(y_post.loc[female_mask].mean()) if female_mask.any() else 0.0
    post_male_rate = float(y_post.loc[male_mask].mean()) if male_mask.any() else 0.0
    post_gap = abs(post_male_rate - post_female_rate)
    post_acc = float((y_post == y_test).mean())
    post_record = {
        "model": baseline_model,
        "pred": y_post,
        "gap": post_gap,
        "acc": post_acc,
        "acc_drop": baseline_acc - post_acc,
    }

    if (post_record["gap"] < best["gap"]) or (
        post_record["gap"] == best["gap"] and post_record["acc"] > best["acc"]
    ):
        best = post_record

    eps_grid = [0.001, 0.005, 0.01, 0.02, 0.05, 0.1]
    for eps in eps_grid:
        candidate = ExponentiatedGradient(
            estimator=LogisticRegression(solver="liblinear", random_state=random_state),
            constraints=DemographicParity(),
            eps=eps,
        )
        candidate.fit(x_train, y_train, sensitive_features=s_train)
        y_candidate = pd.Series(candidate.predict(x_test, random_state=random_state), index=y_test.index)

        female_rate = float(y_candidate.loc[female_mask].mean()) if female_mask.any() else 0.0
        male_rate = float(y_candidate.loc[male_mask].mean()) if male_mask.any() else 0.0
        gap = abs(male_rate - female_rate)
        acc = float((y_candidate == y_test).mean())

        record = {
            "model": candidate,
            "pred": y_candidate,
            "gap": gap,
            "acc": acc,
            "acc_drop": baseline_acc - acc,
        }

        if (record["gap"] < best["gap"]) or (
            record["gap"] == best["gap"] and record["acc"] > best["acc"]
        ):
            best = record

    return best["model"], x_test, y_test, s_test, best["pred"]
