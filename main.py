import os
import asyncio
import json
import uuid
import shutil
import base64
import mimetypes
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

app = FastAPI()

# Directory Setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
IMAGE_DIR = os.path.join(OUTPUT_DIR, "images")
STATIC_DIR = os.path.join(BASE_DIR, "static")
os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

# Shared Client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# In-memory storage for generation status (reset on restart)
# In production, this would be Redis/DB, but here we stay simple.
class GenerationStatus(BaseModel):
    id: str
    round: int
    status: str # "planning", "generating", "completed", "failed"
    images: List[dict] = []
    error: Optional[str] = None

active_tasks = {}

# Constants
MAX_IMAGE_COUNT = int(os.getenv("MAX_IMAGE_COUNT", "1000"))

# Models
class FeedbackRequest(BaseModel):
    feedback: str
    state: dict # Global state passed from frontend

# --- Helper Functions ---

async def cleanup_images():
    """Removes oldest images if count exceeds MAX_IMAGE_COUNT."""
    files = [os.path.join(IMAGE_DIR, f) for f in os.listdir(IMAGE_DIR) if os.path.isfile(os.path.join(IMAGE_DIR, f))]
    if len(files) <= MAX_IMAGE_COUNT:
        return
    
    # Sort by creation time
    files.sort(key=os.path.getctime)
    num_to_delete = len(files) - MAX_IMAGE_COUNT
    for i in range(num_to_delete):
        try:
            os.remove(files[i])
        except Exception as e:
            print(f"Error deleting {files[i]}: {e}")

async def generate_images_task(task_id: str, feedback: str, state: dict):
    active_tasks[task_id]["status"] = "planning"
    try:
        # 1. Plan Next Round with Gemini 3 Flash Thinking
        prompt = f"""
        You are the 'Design Genome Manager & Strategist'. 
        Current User Design State: {json.dumps(state, indent=2)}
        User Feedback: "{feedback}"
        
        Task:
        1. **Rectify & Update DNA**: 
           - Update 'confirmed_likes' and 'hard_rejections' using the new feedback.
           - CONSOLIDATE: Merge similar points to keep the list concise.
           - RECTIFY: If new feedback contradicts previous DNA, prioritize the new feedback. 
           - **NARRATIVE SUMMARY**: Create a 2-3 sentence 'design_summary' in Markdown that synthesizes the user's current 'Design Persona' (e.g., 'The Cyber-Minimalist').
           - Ensure the DNA reflects the FULL history of the conversation, not just the last round.
           
        2. **Plan 9 Mutation Prompts (7+2 Strategy)**:
           - 7 EXPLOITATION: Focus on precise combinations of 'confirmed_likes'. 
             - Use 3 slots for 'Delta Mutations' of favorite images.
             - Use 4 slots for 'Hybrid Species' (e.g. Muscle + Monolith).
           - 2 EXPLORATION: 'Active Learning' wildcards. Test a boundary or try a geometry the user hasn't seen yet.
        
        Requirements:
        - Design language: Linear, Monolithic, Tech-focused.
        - Constraints: White clay model, unbranded, no wings, no traditional grilles.
        - Output Format: Respond ONLY with valid JSON.
        
        Example Output:
        {{
          "updated_state": {{
            "round": {state.get('round', 0) + 1},
            "design_summary": "Synthesized AI summary in Markdown...",
            "confirmed_likes": ["Point 1", "Point 2"],
            "hard_rejections": ["Point A", "Point B"],
            "exploration_history": [...]
          }},
          "plan": [
            {{"name": "unique_id", "prompt": "...", "type": "exploration/exploitation"}}
          ]
        }}
        """
        
        # Use Gemini 3 Flash with thinking and search
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                thinking_config=types.ThinkingConfig(thinking_level="HIGH"),
                tools=[types.Tool(googleSearch=types.GoogleSearch())]
            )
        )
        
        plan_data = json.loads(response.text)
        active_tasks[task_id]["status"] = "Generating designs..."
        active_tasks[task_id]["updated_state"] = plan_data["updated_state"]
        active_tasks[task_id]["round"] = state.get("round", 0) + 1

        # 2. Parallel Image Generation
        base_visual_prompt = "A photorealistic studio render of an unbranded concept car. Matte white automotive clay model, neutral gray cyclorama background, soft diffused studio lighting. Full vehicle in frame, front three-quarter left view at eye level, 50mm lens perspective, sharp focus. No logos, no text, exactly four wheels."

        async def generate_single_image(index, item):
            full_prompt = f"{base_visual_prompt} Design: {item['prompt']}"
            img_response = await asyncio.to_thread(
                client.models.generate_content,
                model="gemini-2.5-flash-image",
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"]
                )
            )
            
            for part in img_response.candidates[0].content.parts:
                if part.inline_data:
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                    filename = f"{task_id}_{index}_{timestamp}.png"
                    filepath = os.path.join(IMAGE_DIR, filename)
                    with open(filepath, "wb") as f:
                        f.write(part.inline_data.data)
                    
                    return {
                        "name": item["name"],
                        "url": f"/api/images/{filename}",
                        "prompt": item["prompt"],
                        "type": item["type"]
                    }
            return None

        # Gather all 9 tasks concurrently
        tasks = [generate_single_image(i, item) for i, item in enumerate(plan_data["plan"])]
        results = await asyncio.gather(*tasks)
        
        # Filter out any None results
        active_tasks[task_id]["images"] = [r for r in results if r is not None]
        active_tasks[task_id]["status"] = "completed"
        await cleanup_images()

    except Exception as e:
        print(f"Error in generation task: {e}")
        active_tasks[task_id]["status"] = "failed"
        active_tasks[task_id]["error"] = str(e)

# --- Endpoints ---

@app.post("/api/feedback")
async def handle_feedback(req: FeedbackRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    active_tasks[task_id] = {
        "id": task_id,
        "round": req.state.get("round", 0),
        "status": "Analyzing your feedback...",
        "images": [],
        "updated_state": req.state
    }
    background_tasks.add_task(generate_images_task, task_id, req.feedback, req.state)
    return {"task_id": task_id}

@app.get("/api/status/{task_id}")
async def get_status(task_id: str):
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return active_tasks[task_id]

@app.get("/api/images/{filename}")
async def get_image(filename: str):
    filepath = os.path.join(IMAGE_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(filepath)

# Serve Frontend (Must be after API routes)
if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    # Use PORT from env or 8000
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
