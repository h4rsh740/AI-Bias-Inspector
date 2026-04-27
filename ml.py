"""Backward-compatible CLI script for quick evaluation.

Use `app.py`, `model.py`, and `fairness.py` as the main project modules.
"""

import pandas as pd
from sklearn.metrics import accuracy_score

from fairness import evaluate_fairness
from model import train_model


def main() -> None:
    df = pd.read_csv("loan_data.csv")

    print("== Without gender feature ==")
    model_no_gender, x_test_ng, y_test_ng, sensitive_ng = train_model(df, use_gender=False)
    y_pred_ng = model_no_gender.predict(x_test_ng)
    acc_ng = accuracy_score(y_test_ng, y_pred_ng)
    female_ng, male_ng, bias_ng, _ = evaluate_fairness(y_test_ng, y_pred_ng, sensitive_ng)
    print(f"Accuracy: {acc_ng:.4f}")
    print(f"Female approval: {female_ng:.2f}")
    print(f"Male approval: {male_ng:.2f}")
    print(f"Bias difference: {bias_ng:.2f}\n")

    print("== With gender feature ==")
    model_gender, x_test_g, y_test_g, sensitive_g = train_model(df, use_gender=True)
    y_pred_g = model_gender.predict(x_test_g)
    acc_g = accuracy_score(y_test_g, y_pred_g)
    female_g, male_g, bias_g, _ = evaluate_fairness(y_test_g, y_pred_g, sensitive_g)
    print(f"Accuracy: {acc_g:.4f}")
    print(f"Female approval: {female_g:.2f}")
    print(f"Male approval: {male_g:.2f}")
    print(f"Bias difference: {bias_g:.2f}")


if __name__ == "__main__":
    main()