⚖️ FairLoan AI
🧠 Detect • Measure • Mitigate Bias in Credit Models

🚀 Overview

FairLoan AI is a lightweight full-stack application that helps you:

🔍 Detect bias in machine learning models
📊 Measure fairness using standard metrics
🛡️ Mitigate bias before deployment

Even if you remove sensitive features like gender, models can still learn bias via proxy variables (e.g., income, age). This tool uncovers and fixes that, ensuring fair access to credit.

✨ Features
📂 Upload any CSV dataset
🧪 Train models with/without sensitive attributes
📊 Fairness metrics:
Selection Rate
Demographic Parity
Equal Opportunity
🛡️ Bias mitigation using ThresholdOptimizer
📈 Before vs After comparison
⬇️ Export bias reports (JSON)
🌌 Animated UI (Three.js background)
🎨 Glassmorphism + smooth animations
🔬 SHAP Explainability (Waterfall & Global Feature Importance)
☁️ Google Cloud Ready (Cloud Run, Firebase, BigQuery hooks)

🏗️ Architecture
Frontend (React + Three.js)
        ↓ Axios
Backend API (FastAPI + Uvicorn)
        ↓ Pandas
ML Engine (Scikit-Learn + Fairlearn + SHAP)
        ↓
JSON → UI Visualization

🛠️ Tech Stack
Layer	Tech
Frontend	React 18, Vite, Three.js, Framer Motion
Styling	CSS (Glassmorphism)
Charts	Recharts
Backend	FastAPI, Uvicorn
ML	Scikit-Learn, SHAP
Fairness	Fairlearn
Data	Pandas, NumPy
☁️ Cloud	Google Cloud Run, Firebase, BigQuery

📁 Project Structure
ML/
├── backend/
│   ├── api.py
│   ├── model.py
│   ├── fairness.py
│   ├── explainability.py
│   ├── data_generator.py
│   ├── Dockerfile
│   ├── cloudbuild.yaml
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── App.jsx
│       └── index.css
│
└── README.md

⚙️ Installation
🔹 Prerequisites
Python 3.10+
Node.js 18+

🐍 Backend Setup
cd backend

# Create virtual environment
python -m venv venv

# Activate
venv\Scripts\activate      # Windows
source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn api:app --reload --port 8000

📍 API: http://localhost:8000

📘 Docs: http://localhost:8000/docs

⚛️ Frontend Setup
cd frontend
npm install
npm run dev

📍 App: http://localhost:5173

🚀 Usage
Open the frontend
Go to the Simulator Tab to test individual loans and see SHAP explanations.
Upload a dataset (income, age, gender, loan_approved, etc.) in the Global Data tab.
Toggle sensitive feature inclusion
Click Analyze Bias
Click Mitigate Bias
Export report

📊 API Endpoints
Method	Endpoint	Description
POST	/generate-data	Generate dataset
POST	/train-model	Train + evaluate + global SHAP
POST	/analyze-bias	Same as train
POST	/mitigate-bias	Apply mitigation
POST	/predict-loan	Simulate individual loan + local SHAP + BigQuery hook

📈 Bias Scoring
Score	Level	Meaning
< 0.05	✅ Low	Fair model
0.05–0.15	⚠️ Medium	Moderate bias
> 0.15	🚨 High	Significant bias

🤝 Contributing

Pull requests are welcome!
If you find bugs or want new features, open an issue.

💡 Inspiration

Built to address a real-world challenge:
How can we ensure AI systems are fair before they impact real lives?

❤️ Built With
React · FastAPI · Three.js · Scikit-Learn · Fairlearn · SHAP
