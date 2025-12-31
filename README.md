# Dream Car Finder 🚗✨

Dream Car Finder is an AI-driven automotive design discovery engine built on an **Active Learning** framework. It helps users discover, refine, and synthesize high-aesthetic car designs from vague concepts through natural language feedback and intelligent iteration.

![Branding](frontend/public/favicon.png)

## 🌟 Key Features

### 1. Automated Active Discovery Loop
The system employs a "Feedback-Evolution-Exploration" cycle:
- **Archetype Warm-up**: Generates 9 diverse initial concepts to probe the user's aesthetic baseline.
- **Human-in-the-Loop**: Processes natural language feedback to understand what you love and what you reject.
- **7+2 Evolution Strategy**:
    - **7 Exploitation Slots**: Evolve winning genes through mutation and hybridization.
    - **2 Exploration Slots**: Introduce "wildcard" designs to break local optima and discover unexpected styles.

### 2. Intelligent Design Genome
- **AI Persona Summary**: Real-time synthesis of your unique "Design Personality" using Gemini 3 Flash.
- **DNA Rectification**: Automatically resolves contradictions in feedback and consolidates design preferences.
- **Session Persistence**: Progress is automatically saved to local storage—never lose your design evolution even after a refresh.

### 3. Voice-Driven Interaction
- **Seamless Transcription**: Integrated AI Builder Space speech-to-text API for effortless natural language feedback.
- **Visual Feedback**: Real-time 10-second sliding window waveform visualization gives you confidence that the system is hearing your design intent.
- **Intelligent Status**: Clear visual indicators during the transcribing phase ensure a smooth, transparent UX.

### 4. High-Performance Engineering
- **Parallel Generation**: Utilizes asynchronous coroutines to generate 9 high-quality images simultaneously (Gemini 2.5 Flash Image).
- **16:9 Cinema Aspect Ratio**: Optimized for automotive silhouettes, capturing the full elegance of long, low profiles.
- **Non-intrusive HUD**: A sleek status overlay in the bottom-right corner keeps you informed without interrupting your workspace.
- **Docker-Ready**: Optimized for deployment with a multi-stage Dockerfile and single-process/single-port configuration.
- **Robustness**: Built-in **Exponential Backoff** retry logic to gracefully handle API rate limits and model overloads.

## 🧠 Design Philosophy: Workflow over Plumbing

Dream Car Finder is a showcase of the **AI Architect** mindset. By leveraging the comprehensive AI capabilities of [AI Builder Space](https://space.ai-builders.com), the project focuses entirely on designing high-value AI workflows rather than managing low-level infrastructure.

Key AI orchestrations integrated via AI Builder Space:
- **Strategic Reasoning**: Analyzing vague user feedback to synthesize a precise "Design Genome."
- **Evolutionary Creativity**: Generating subsequent design iterations by cross-referencing user preferences with previous visual outputs.
- **Multimodal Feedback**: Real-time voice-to-text transcription to lower the barrier for design iteration.

By offloading the "plumbing" (authentication, model scaling, deployment) to the [AI Architect course](https://www.superlinear.academy/c/aa/)'s native ecosystem, the development energy was directed toward what matters most: **the active discovery loop and user experience.**

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React + Vite (Vanilla CSS for premium aesthetics)
- **AI Engine**: AI Builder Space Platform
  - **Gemini 3 Flash Preview (Thinking Mode)**: For strategic planning and DNA synthesis.
  - **Gemini 2.5 Flash Image**: For multi-threaded image generation.
  - **Audio Transcription API**: For real-time voice-to-text design feedback.
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js & npm (for building the frontend)
- An AI Builder Space API Token (`AI_BUILDER_TOKEN`)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/grapeot/CarFinder.git
   cd CarFinder
   ```

2. **Setup environment variables**:
   Create a `.env` file in the root directory:
   ```env
   AI_BUILDER_TOKEN=your_ai_builder_token_here
   MAX_IMAGE_COUNT=1000
   PORT=8002
   ```
   
   **Note**: The application now uses the AI Builder Space platform instead of direct Gemini API calls.

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Build the frontend**:
   ```bash
   ./scripts/build-frontend.sh
   ```

5. **Run the application**:
   ```bash
   python3 main.py
   ```

### 🐳 Docker Deployment

The project is fully containerized for easy deployment:

```bash
docker build -t car-finder .
docker run -p 8000:8000 -e AI_BUILDER_TOKEN=your_token car-finder
```

Access the UI at `http://localhost:8000`.

## 📖 Documentation
- [Workflow Design](docs/workflow.md): Detailed explanation of the active discovery loop (Chinese).
- [Engineering Design](docs/design.md): Technical architecture and state management (Chinese).

## 🛡️ License
MIT License. Feel free to explore and evolve your own designs!
