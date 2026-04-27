# 🧠 AI Bias Inspector

### 🚨 Detect • Measure • Explain • Mitigate Bias in ML Systems

<p align="center">
  <img src="https://img.shields.io/badge/AI-Fairness-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/ML-scikit--learn-orange?style=for-the-badge&logo=scikit-learn" />
  <img src="https://img.shields.io/badge/Fairness-Fairlearn-purple?style=for-the-badge" />
</p>

---

## 📌 Overview

**AI Bias Inspector** is a full-stack fairness analysis platform that helps detect, quantify, and mitigate bias in machine learning models.

Built with **React + FastAPI + Fairlearn**, it provides a **real-world, production-style system** for responsible AI evaluation.

---

## 🚨 Problem Statement

Modern AI systems are used in critical decisions like:

* 💼 Hiring
* 🏦 Loan approval
* 🏥 Healthcare

However, these systems often learn from **biased historical data**, leading to:

❌ Discrimination
❌ Unfair decisions
❌ Ethical risks

> Even if sensitive attributes (like gender) are removed, models can still learn bias through **proxy features** (income, age, etc.)

---

## 🎯 Objective

Build a system that can:

* 🔍 Detect bias in datasets and models
* 📊 Measure fairness using statistical metrics
* ⚖️ Apply bias mitigation techniques
* 📈 Compare results before vs after mitigation
* 🧠 Explain model decisions using SHAP

---

## 🧠 Key Insight

> Removing sensitive features does NOT eliminate bias.
> Models can still discriminate using indirect signals.

---

## ⚙️ Tech Stack

| Layer             | Technology                  |
| ----------------- | --------------------------- |
| 🖥 Frontend       | React, Vite, Tailwind CSS   |
| ⚙️ Backend        | FastAPI, Uvicorn            |
| 🤖 ML             | scikit-learn, pandas, numpy |
| ⚖️ Fairness       | Fairlearn                   |
| 🔍 Explainability | SHAP                        |
| 🚀 Deployment     | Docker, Render              |

---

## 🏗️ Architecture

```text
React UI → FastAPI → ML Model → Fairness Analysis → JSON → UI Dashboard
```

---

## ✨ Features

* 📤 Upload CSV datasets
* 📊 Data profiling & imbalance detection
* 🤖 ML model training (with/without sensitive features)
* ⚖️ Fairness metrics:

  * Selection Rate
  * Demographic Parity
  * Equal Opportunity
* 🔧 Bias mitigation using **ExponentiatedGradient**
* 📉 Before vs After comparison
* 📊 Interactive charts
* 🧠 SHAP explainability
* 📦 Batch predictions

---

## 📁 Project Structure

```bash
AI-Bias-Inspector/
├── backend/
│   ├── api.py
│   ├── model.py
│   ├── fairness.py
│   ├── explainability.py
│   ├── data_generator.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
├── README.md
```

---

## 🚀 Quick Start

### 🔹 Backend Setup

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn api:app --reload
```

👉 API Docs: http://localhost:8000/docs

---

### 🔹 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

👉 App: http://localhost:5173

---

## 📊 Fairness Metrics

### Selection Rate

Probability of approval per group

### Bias Difference

Difference in approval rates between groups

### Demographic Parity

Equal outcome distribution across groups

### Equal Opportunity

Equal true positive rate across groups

---

## 🔧 Mitigation Strategy

We use **Fairlearn's ExponentiatedGradient**:

* Applies fairness constraints mathematically
* Optimizes accuracy vs fairness tradeoff
* Avoids manual threshold hacks

---

## 📈 Example Output

```json
{
  "before": {
    "accuracy": 0.61,
    "bias_diff": 0.13
  },
  "after": {
    "accuracy": 0.60,
    "bias_diff": 0.06
  },
  "fairness_improved": true
}
```

---

## 🔄 Workflow

1. Upload dataset
2. Analyze bias
3. View fairness metrics
4. Apply mitigation
5. Compare results
6. Interpret using SHAP

---

## 🔮 Future Improvements

* 📄 Export fairness reports (PDF)
* 🌍 Real-world datasets integration
* 🤖 Auto bias detection
* 📊 Advanced dashboards
* ☁️ Cloud deployment

---

## 🤝 Contributing

Contributions are welcome!

```bash
1. Fork the repo
2. Create a branch
3. Commit changes
4. Open PR
```

---

## 📜 License

Add your license here.

---

## 👨‍💻 DEV'S ( GITHUB)

**Kartikeyan Dubey** - **kartikeyan-sudo**
**Harsh Singh**      - **h4rsh740**
---

## ⭐ Final Note

> AI should not just be intelligent — it must be **fair, transparent, and responsible**.
