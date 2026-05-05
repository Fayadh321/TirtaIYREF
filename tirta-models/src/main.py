from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import router
from src.core.visual_analyzer import VisualAnalyzer


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.analyzer = VisualAnalyzer()
    yield


app = FastAPI(title="Tirta Visual Analyzer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
