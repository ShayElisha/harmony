import os
from typing import Any

import httpx
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="HarmonyAI Service", version="0.1.0")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-r1:8b")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")


class InputPayload(BaseModel):
    input: str = Field(min_length=2)


async def ask_model(prompt: str) -> str:
    # Prefer local Ollama first; fallback to hosted DeepSeek when configured.
    try:
        return await ask_ollama(prompt)
    except Exception:
        if DEEPSEEK_API_KEY:
            return await ask_deepseek(prompt)
        raise


async def ask_ollama(prompt: str) -> str:
    body: dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(f"{OLLAMA_URL}/api/generate", json=body)
        resp.raise_for_status()
        data = resp.json()
        return data.get("response", "").strip()


async def ask_deepseek(prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    body: dict[str, Any] = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "אתה עוזר זוגי אינטליגנטי ורגיש. "
                    "ענה תמיד בעברית פשוטה וברורה. "
                    "היה פרקטי, אמפתי, תמציתי ומכבד. "
                    "מותר הומור וציניות עדינה בלבד, בלי זלזול או פגיעה."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{DEEPSEEK_BASE_URL}/chat/completions",
            headers=headers,
            json=body,
        )
        resp.raise_for_status()
        data = resp.json()
        choices = data.get("choices", [])
        if not choices:
            return ""
        return choices[0].get("message", {}).get("content", "").strip()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "harmonyai-ai-service"}


@app.post("/translate")
async def translate(payload: InputPayload) -> dict[str, Any]:
    prompt = f"""
אתה עוזר זוגי עם הומור עדין ומכבד.
נתח את ההודעה הבאה והחזר תשובה קצרה, פרקטית וברורה בעברית.
קלט: {payload.input}

החזר בדיוק בפורמט הבא:
1) פירוש רגשי: משפט אחד.
2) מה כנראה קורה כאן: משפט אחד.
3) מה לעשות עכשיו (פרקטי): צעד קצר וברור לביצוע מיידי.
4) מה לא לומר: משפט אחד קצר.
5) עקיצה צינית עדינה: משפט קצר ולא פוגעני.
"""
    try:
        result = await ask_model(prompt)
        return {"mode": "translate", "result": result}
    except Exception:
        return {
            "mode": "translate",
            "result": (
                "1) פירוש רגשי: כנראה יש מתח רגשי או ריחוק רגעי.\n"
                "2) מה כנראה קורה כאן: ייתכן שהיא עדיין פגועה מהוויכוח.\n"
                "3) מה לעשות עכשיו (פרקטי): לשלוח הודעת אמפתיה קצרה ולהציע שיחה רגועה.\n"
                "4) מה לא לומר: \"נו, אז מה הבעיה עכשיו?\".\n"
                "5) עקיצה צינית עדינה: אם \"סבבה\" מרגיש כמו סופת טורנדו - זה כנראה לא סבבה."
            ),
        }


@app.post("/emergency")
async def emergency(payload: InputPayload) -> dict[str, Any]:
    prompt = f"""
אתה עוזר זוגי רגוע עם הומור קל ומכבד.
קלט מצב חירום בזמן ריב: {payload.input}

החזר בדיוק בפורמט הבא:
1) תגובה מיידית מומלצת: משפט אחד מוכן לשליחה.
2) אסטרטגיית הרגעה (פרקטית): שני צעדים קצרים.
3) משפטים שאסור לומר: 2-3 דוגמאות קצרות.
4) עקיצה צינית עדינה: משפט קצר ולא פוגעני.
"""
    try:
        result = await ask_model(prompt)
        return {"mode": "emergency", "result": result}
    except Exception:
        return {
            "mode": "emergency",
            "result": (
                "1) תגובה מיידית מומלצת: \"אני איתך, בואי נרגע רגע ונמשיך לדבר בלי לפגוע\".\n"
                "2) אסטרטגיית הרגעה (פרקטית): א) לקחת 10 דקות הפסקה, ב) לחזור עם משפט אמפתי אחד.\n"
                "3) משפטים שאסור לומר: \"את מגזימה\", \"תירגעי כבר\", \"את תמיד עושה דרמה\".\n"
                "4) עקיצה צינית עדינה: לנצח בוויכוח זה נחמד, לישון בסלון זה פחות."
            ),
        }
