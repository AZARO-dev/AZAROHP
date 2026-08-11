const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const maxImageBytes = 8 * 1024 * 1024;

const soLanguageGuide = `
You are translating an image description into Soo, a constructed alien language.
Return a short sentence in Soo romanization only.

Important normalization:
- Read every "u'" as "h".
- Do not output "u'"; output "h" instead.
- Example: nyamopu' -> nyamoph, du' -> dh.

Style:
- Use simple words from the database when possible.
- Prefer one short sentence.
- No Japanese, no English explanation.
- If the image is unclear, describe the most visually obvious object.

Grammar:
- SOV word order.
- "eso" marks "is / is doing / it is".
- "limi" means like / good feeling / positive feeling.
- "viva" means with / and / together with.
- "dot" means speak / communicate with.
- "nopa" is a connective/particle often used in longer statements.

Core vocabulary:
- vose: this
- furo: flower
- linoa: beautiful / good
- nya: person
- senya: I / me
- sonya: you
- nyamoph: lower place / below / ground-side
- dh: to / toward / at
- sol: sun
- son: moon / dark
- spa: sky / space
- moph: place
- fero: tree
- ruv: water / flow
- mos: death / dead
- fhmo: go / path / travel
- spanya: god / great presence
- moa: small / weak
- seta: world / body / whole

Examples:
- A flower image: vose linoa furo eso
- A person image: vose nya eso
- A tree image: vose fero eso
- A sunny sky image: vose sol spa eso
`.trim();

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...(init.headers || {}),
    },
  });
}

function normalizeSoText(value) {
  return String(value || "")
    .replace(/[\u201c\u201d]/g, "\"")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/u'/gi, "h")
    .replace(/[^a-zA-Z'\s.?!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }

  const firstText = payload?.output
    ?.flatMap((item) => item.content || [])
    ?.find((content) => typeof content.text === "string");

  return firstText?.text || "";
}

async function callOpenAI({ env, image }) {
  const buffer = await image.arrayBuffer();

  if (buffer.byteLength > maxImageBytes) {
    return jsonResponse(
      { error: "IMAGE_TOO_LARGE", message: "Choose an image under 8MB." },
      { status: 413 },
    );
  }

  const mimeType = image.type || "image/png";
  const imageUrl = `data:${mimeType};base64,${arrayBufferToBase64(buffer)}`;
  const model = env.OPENAI_MODEL || "gpt-5.6-luna";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "developer",
          content: [{ type: "input_text", text: soLanguageGuide }],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Describe this image in one short Soo sentence. Return JSON only: {\"so\":\"...\"}",
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "low",
            },
          ],
        },
      ],
      max_output_tokens: 80,
      store: false,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return jsonResponse(
      {
        error: "OPENAI_REQUEST_FAILED",
        message: payload?.error?.message || "OpenAI API request failed.",
      },
      { status: response.status },
    );
  }

  const rawText = extractOutputText(payload);
  let so = rawText;

  try {
    const parsed = JSON.parse(rawText);
    so = parsed.so || parsed.reply || rawText;
  } catch {
    so = rawText;
  }

  const normalized = normalizeSoText(so) || "vose linoa furo eso";

  return jsonResponse({ so: normalized });
}

async function handleDescribe(request, env) {
  if (!env.OPENAI_API_KEY) {
    return jsonResponse(
      { error: "OPENAI_API_KEY_MISSING", message: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return jsonResponse(
      { error: "IMAGE_REQUIRED", message: "Send an image file." },
      { status: 400 },
    );
  }

  if (!image.type.startsWith("image/")) {
    return jsonResponse(
      { error: "INVALID_IMAGE_TYPE", message: "Choose an image file." },
      { status: 415 },
    );
  }

  return callOpenAI({ env, image });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/describe") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
      }

      return handleDescribe(request, env);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
