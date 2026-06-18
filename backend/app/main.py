from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import scopes, categories, iso_controls, requirements, answers, review

app = FastAPI(title="Anforderungsdatenbank API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scopes.router)
app.include_router(categories.router)
app.include_router(iso_controls.router)
app.include_router(requirements.router)
app.include_router(answers.router)
app.include_router(review.router)


@app.get("/health")
def health():
    return {"status": "ok"}
