const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const maxImageBytes = 8 * 1024 * 1024;

const soLanguageGuide = `
You are translating a detailed image description into Soo, a constructed alien language.
Return one or two short Soo sentences in romanization only.
If you return two sentences, put each sentence on its own line.

Important normalization:
- Read every "u'" as "h".
- Do not output "u'"; output "h" instead.
- Example: nyamopu' -> nyamoph, du' -> dh.

Style:
- Use simple words from the database when possible.
- Describe the photo as specifically as the vocabulary allows.
- Mention 2 or 3 visible details when possible: main subject, visible quality, background/place, movement, or nearby element.
- Prefer a slightly detailed description over a minimal label.
- Use only listed vocabulary. Do not invent words.
- No Japanese, no English explanation.
- Separate different sentences with a newline.
- If the image is unclear, describe the most visually obvious object.

Grammar:
- SOV word order.
- Put adjectives before nouns: "linoa furo" means beautiful flower.
- Use one adjective when a visible quality is obvious.
- Use "viva" to connect visible elements: "furo viva fero" means flower and tree.
- Use "dh" after a place or direction when expressing movement toward it: "nyamoph dh fhmo eso".
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
- soa: big / great
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
- stua: many
- koloa: dark
- ruvspoa: long
- fumia: short
- thonoa: bad / unpleasant

Examples:
- A flower image: vose linoa furo eso
- A person image: vose nya eso
- A tree image: vose fero eso
- A sunny sky image: vose sol spa eso
- A person near a flower: vose nya viva linoa furo eso
- A dark water image: vose koloa ruv eso
- A large place with sky: vose soa moph viva spa eso
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
    .split(/\r?\n+/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
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

function collectTextValues(value, texts = []) {
  if (!value) {
    return texts;
  }

  if (typeof value === "string") {
    return texts;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectTextValues(item, texts);
    }

    return texts;
  }

  if (typeof value !== "object") {
    return texts;
  }

  for (const [key, child] of Object.entries(value)) {
    if ((key === "text" || key === "output_text") && typeof child === "string") {
      texts.push(child);
      continue;
    }

    collectTextValues(child, texts);
  }

  return texts;
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }

  const outputTexts = collectTextValues(payload?.output);

  return outputTexts.join("\n").trim();
}

function extractSooReply(rawText) {
  if (!rawText) {
    return "";
  }

  try {
    const parsed = JSON.parse(rawText);
    return parsed.so || parsed.reply || parsed.message || rawText;
  } catch {
    return rawText;
  }
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
  const startedAt = Date.now();

  console.log({
    event: "snapper_openai_start",
    imageBytes: buffer.byteLength,
    imageType: mimeType,
    model,
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: "low" },
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
              text: "Describe visible details in this image using only the Soo vocabulary. Prefer 1 or 2 short sentences with subject, quality, place, or nearby elements. If there are two sentences, separate them with a newline. Return only Soo romanization, no JSON and no explanation.",
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "low",
            },
          ],
        },
      ],
      max_output_tokens: 300,
      store: false,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  const requestId = response.headers.get("x-request-id") || "";

  console.log({
    event: "snapper_openai_end",
    status: response.status,
    requestId,
    durationMs: Date.now() - startedAt,
    outputStatus: payload?.status || "",
    incompleteReason: payload?.incomplete_details?.reason || "",
    outputItems: Array.isArray(payload?.output) ? payload.output.length : 0,
  });

  if (!response.ok) {
    return jsonResponse(
      {
        error: "OPENAI_REQUEST_FAILED",
        message: payload?.error?.message || "OpenAI API request failed.",
        requestId,
      },
      { status: response.status },
    );
  }

  const rawText = extractOutputText(payload);
  const so = extractSooReply(rawText);
  const normalized = normalizeSoText(so);

  if (!normalized) {
    console.error({
      event: "snapper_empty_reply",
      requestId,
      outputStatus: payload?.status || "",
      incompleteReason: payload?.incomplete_details?.reason || "",
      rawTextLength: rawText.length,
    });

    return jsonResponse(
      {
        error: "EMPTY_SOO_REPLY",
        message: "OpenAI response did not include a usable Soo reply.",
        requestId,
        outputStatus: payload?.status || "",
        incompleteReason: payload?.incomplete_details?.reason || "",
      },
      { status: 502 },
    );
  }

  return jsonResponse({ so: normalized, requestId });
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

    if (url.pathname === "/api/health") {
      return jsonResponse({
        ok: true,
        hasOpenAIKey: Boolean(env.OPENAI_API_KEY),
        model: env.OPENAI_MODEL || "gpt-5.6-luna",
      });
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
