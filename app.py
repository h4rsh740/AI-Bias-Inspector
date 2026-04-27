import pandas as pd
import streamlit as st

from fairness import evaluate_fairness
from model import train_model

st.set_page_config(page_title="AI Bias Inspector", page_icon="⚖️", layout="centered")

st.title("⚖️ AI Bias Inspector")
st.caption(
    "Detect and explain potential bias in AI decision systems before deployment."
)

uploaded_file = st.file_uploader("Upload dataset", type=["csv"])

if uploaded_file is not None:
    df = pd.read_csv(uploaded_file)

    st.subheader("Dataset Preview")
    st.dataframe(df.head(), use_container_width=True)

    use_gender = st.checkbox("Include gender in model (may increase bias)", value=False)

    try:
        model, x_test, y_test, sensitive = train_model(df, use_gender=use_gender)
        y_pred = model.predict(x_test)

        female, male, bias, chart_data = evaluate_fairness(y_test, y_pred, sensitive)

        st.subheader("Results")
        c1, c2, c3 = st.columns(3)
        c1.metric("Female approval rate", f"{female:.2f}")
        c2.metric("Male approval rate", f"{male:.2f}")
        c3.metric("Bias difference", f"{bias:.2f}")

        st.bar_chart(chart_data)

        if bias < 0.05:
            st.success("Low Bias")
        elif bias < 0.15:
            st.warning("Moderate Bias")
        else:
            st.error("High Bias")

        st.markdown("### Model setup")
        st.write(
            "Features used:",
            ["income", "age", "gender"] if use_gender else ["income", "age"],
        )

    except Exception as exc:
        st.error(f"Could not process dataset: {exc}")
else:
    st.info("Upload a CSV file to start the bias analysis.")
