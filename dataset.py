"""Backward-compatible entrypoint for dataset generation.

Use `data_generator.py` as the primary module.
"""

from data_generator import FILE_NAME, generate_dataset, save_dataset


if __name__ == "__main__":
    df = generate_dataset()
    path = save_dataset(df, FILE_NAME)
    print(f"Dataset saved: {path}")