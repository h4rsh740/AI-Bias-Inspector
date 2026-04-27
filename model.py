from typing import Tuple

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
        }

        if best is None:
            best = record
            continue

        if (record["gap"] < best["gap"]) or (
            record["gap"] == best["gap"] and record["acc"] > best["acc"]
        ):
            best = record

    if best is None:
        return baseline_model, x_test, y_test, s_test, y_pred_baseline

    if (best["gap"] >= baseline_gap) and (best["acc_drop"] > max_accuracy_drop):
        return baseline_model, x_test, y_test, s_test, y_pred_baseline

    return best["model"], x_test, y_test, s_test, best["pred"]
