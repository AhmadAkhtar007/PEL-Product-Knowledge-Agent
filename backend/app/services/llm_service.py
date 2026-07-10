import asyncio
import base64
from google import genai
from google.genai import types
from tenacity import AsyncRetrying, wait_exponential, stop_after_attempt, retry_if_exception
from backend.app.config import settings

def is_rate_limit(e: Exception) -> bool:
    err_str = str(e).lower()
    return "429" in err_str or "quota" in err_str or "too many requests" in err_str

class LLMService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        # If USE_MOCK_LLM is enabled or no API key is provided, we run in mock mode
        if self.api_key and not settings.USE_MOCK_LLM:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    async def query_gemini_multimodal(self, prompt: str, image_base64: str = None) -> str:
        if not self.client:
            return f"[Mock Mode] Echoing your prompt: {prompt[:100]}...\nEverything is working smoothly offline!"

        contents = [prompt]
        if image_base64:
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            image_data = base64.b64decode(image_base64)
            image_part = types.Part.from_bytes(
                data=image_data,
                mime_type="image/jpeg"
            )
            contents.append(image_part)

        try:
            async for attempt in AsyncRetrying(
                wait=wait_exponential(multiplier=1, min=2, max=10),
                stop=stop_after_attempt(5),
                retry=retry_if_exception(is_rate_limit)
            ):
                with attempt:
                    response = await self.client.aio.models.generate_content(
                        model=settings.MODEL_NAME,
                        contents=contents
                    )
                    return response.text
        except Exception as e:
            print(f"Gemini API call failed: {e}. Falling back to mock response.")
            return "I'm currently experiencing some technical difficulties connecting to my knowledge base. Please try asking your question again in a moment."

    async def generate_content_stream(self, prompt: str, image_base64: str = None, audio_base64: str = None, **kwargs):
        """Yield response chunks using Gemini's streaming API, or mock fallback."""
        if not self.client:
            mock_text = f"[Mock Mode] I received your prompt:\n{prompt[:100]}...\n\nI am simulating a streaming response so you can perform extensive testing on the UI and chat behavior without hitting any API rate limits!"
            for chunk in [mock_text[i:i+4] for i in range(0, len(mock_text), 4)]:
                yield chunk
                await asyncio.sleep(0.01)
            return

        contents = [prompt]
        if image_base64:
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            image_data = base64.b64decode(image_base64)
            image_part = types.Part.from_bytes(
                data=image_data,
                mime_type="image/jpeg"
            )
            contents.append(image_part)

        if audio_base64:
            if "," in audio_base64:
                audio_base64 = audio_base64.split(",")[1]
            audio_data = base64.b64decode(audio_base64)
            audio_part = types.Part.from_bytes(
                data=audio_data,
                mime_type="audio/mp4"
            )
            contents.append(audio_part)

        try:
            # We retry the initial connection if rate limited
            response = None
            async for attempt in AsyncRetrying(
                wait=wait_exponential(multiplier=1, min=2, max=10),
                stop=stop_after_attempt(5),
                retry=retry_if_exception(is_rate_limit)
            ):
                with attempt:
                    # Determine config for tools if provided
                    gen_config = None
                    if kwargs.get("tools"):
                        gen_config = types.GenerateContentConfig(tools=kwargs.get("tools"))
                        
                    response = await self.client.aio.models.generate_content_stream(
                        model=settings.MODEL_NAME,
                        contents=contents,
                        config=gen_config
                    )
            
            # If we successfully get the stream generator, we stream the chunks
            async for chunk in response:
                if chunk.function_calls:
                    yield chunk.function_calls
                elif chunk.text:
                    yield chunk.text
        except Exception as e:
            print(f"Gemini streaming API call failed: {e}. Falling back to mock response.")
            mock_text = "I'm currently experiencing some technical difficulties connecting to my knowledge base. Please try asking your question again in a moment."
            for chunk in [mock_text[i:i+4] for i in range(0, len(mock_text), 4)]:
                yield chunk
                await asyncio.sleep(0.01)
