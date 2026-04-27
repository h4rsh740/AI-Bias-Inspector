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

    mitigator = ExponentiatedGradient(
        estimator=LogisticRegression(solver="liblinear", random_state=random_state),
        constraints=DemographicParity(),
        eps=0.01,
    )
    mitigator.fit(x_train, y_train, sensitive_features=s_train)

    y_pred_mitigated = pd.Series(mitigator.predict(x_test), index=y_test.index)
    return mitigator, x_test, y_test, s_test, y_pred_mitigated
