import os
from typing import Optional

import numpy as np
import pandas as pd

FILE_NAME = "loan_data.csv"
N_SAMPLES = 200


def generate_dataset(n_samples: int = N_SAMPLES, seed: Optional[int] = 42) -> pd.DataFrame:
    """Generate a synthetic loan dataset with a controllable random seed."""
    if n_samples <= 0:
        raise ValueError("n_samples must be greater than 0")

    if seed is not None:
        np.random.seed(seed)

    rows = []
    for _ in range(n_samples):
        income = np.random.randint(20000, 100000)
        age = np.random.randint(21, 60)
        gender = np.random.choice(["Male", "Female"])

        approval_prob = 0.2

        if income > 60000:
            approval_prob += 0.5
        elif income < 30000:
            approval_prob -= 0.3

        if age > 35:
            approval_prob += 0.1

        # Intentional bias signal for demonstration purposes.
        if gender == "Male":
            approval_prob += 0.15
        else:
            approval_prob -= 0.15

        approval_prob = max(0.0, min(1.0, approval_prob))
        loan_approved = int(np.random.rand() < approval_prob)

        rows.append([income, age, gender, loan_approved])

    return pd.DataFrame(rows, columns=["income", "age", "gender", "loan_approved"])


def save_dataset(df: pd.DataFrame, filename: str = FILE_NAME) -> str:
    """Save dataset in current working directory and return the file path."""
    path = os.path.join(os.getcwd(), filename)
    df.to_csv(path, index=False)
    return path


if __name__ == "__main__":
    dataset = generate_dataset()
    output_path = save_dataset(dataset)
    print(f"Dataset saved: {output_path}")
