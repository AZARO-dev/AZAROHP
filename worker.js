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
- If a person and an object/place are both visible, describe their relationship when it is visually clear.
- Prefer a relationship sentence over a simple list when a relationship is visible.
- Use "limi" only when a person is the subject and appears to like something.
- Do not use "limi" for places, nature, atmosphere, beauty, or general good feeling.
- Prefer a slightly detailed description over a minimal label.
- Use only listed vocabulary. Do not invent words.
- Do not start every sentence with "vose".
- Use "vose" only when you need to point to a specific "this / this one"; avoid it as an English-style "this is" subject.
- Use "vose" at most once in a reply unless the image truly needs contrast between this and that.
- No Japanese, no English explanation.
- Separate different sentences with a newline.
- If the image is unclear, describe the most visually obvious object.

Grammar:
- SOV word order.
- Use only one verb per sentence.
- Do not combine verbs in one sentence.
- "eso", "limi", "fhmo", and "dot" are verbs. Choose only one of them for each sentence.
- If a sentence uses "limi", do not add "eso".
- If a sentence uses "fhmo", do not add "limi" or "eso" in the same sentence.
- If a sentence uses "dot", do not add "limi", "fhmo", or "eso" in the same sentence.
- Put adjectives before nouns: "linoa furo" means beautiful flower.
- Use one adjective when a visible quality is obvious.
- Add "oa" to a noun to make an adjective meaning "of / belonging to / related to / -like".
- Noun-derived adjectives with "oa" are allowed and are not invented words.
- Put noun-derived "oa" adjectives before the noun they describe: "furoa moph" means flower place / place of flowers.
- Do not place two nouns directly next to each other.
- If one noun modifies another noun, turn the first noun into an "oa" adjective: use "ruvoa moph", not "ruv moph".
- If two nouns are separate visible things, connect them with "viva": use "ruv viva fero", not "ruv fero".
- If a person subject and an object noun both appear before "limi" or "fhmo", separate them with "nopa": use "nya nopa furo limi".
- Use "viva" to connect visible elements: "furo viva fero" means flower and tree.
- Use "viva" for a visible with/near relationship: "nya viva furo eso" means person with/near flower.
- Use "dh" after a place or direction when expressing movement toward it: "nyamoph dh fhmo eso".
- Use "dot viva" when people appear to be communicating: "nya dot viva nya eso".
- Use "limi" only for a person liking something.
- Pattern: "nya furo limi" means person likes / has good feeling toward flower.
- The subject of a "limi" sentence must include "nya".
- For a beautiful or pleasant place, use "linoa ... eso" instead of "limi".
- "eso" marks "is / is doing / it is".
- "limi" means a person likes something.
- "viva" means with / and / together with.
- "dot" means speak / communicate with.
- "nopa" is a connective/particle often used in longer statements.
- "vose" is just a demonstrative meaning this / this one. It is not a required sentence opener.
- "oa" changes a noun into an adjective meaning "of / -like".

Core vocabulary:
- vose: this / this one
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

Noun-derived adjectives:
- nyaoa: person's / human / of a person
- furoa: flower's / floral / of flowers
- soloa: sun's / sunny / of the sun
- sonoa: moon's / dark / of the moon
- spaoa: sky's / spatial / of the sky or space
- mophoa: place's / local / of a place
- feroa: tree's / wooden / of trees
- ruvoa: water's / watery / of water
- mosoa: death's / dead / of death
- setaoa: world's / whole-body / of the whole
- spanyaoa: god's / divine / of a great presence
- nyamophoa: lower-place / ground-side / of the lower place

Examples:
- A flower image: linoa furo eso
- A person image: nya eso
- A tree image: fero eso
- A sunny sky image: soloa spa eso
- A person near a flower: nya viva linoa furo eso
- A person liking a flower: nya nopa furo limi
- A peaceful large place: linoa soa moph eso
- A flower place: furoa moph eso
- A sunny sky: soloa spa eso
- A water place: ruvoa moph eso
- A human body/person-like form: nyaoa seta eso
- Many trees near water: stua fero viva ruv eso
- People in a good place: nya viva linoa soa moph eso
- Two people communicating: nya dot viva nya
- A person moving toward water: nya nopa ruv dh fhmo
- A person in a large place: nya viva soa moph eso
- A dark water image: koloa ruv eso
- A large place with sky: soa moph viva spa eso
- Use vose only when pointing: vose linoa furo eso
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

function enforceSingleVerbPerLine(value) {
  const verbs = new Set(["eso", "limi", "fhmo", "dot"]);
  const personNouns = new Set(["nya", "senya", "sonya"]);
  const nouns = new Set([
    "vose",
    "furo",
    "nya",
    "senya",
    "sonya",
    "nyamoph",
    "sol",
    "son",
    "spa",
    "moph",
    "fero",
    "ruv",
    "mos",
    "spanya",
    "seta",
  ]);
  const nounAdjectives = new Set([
    "nyaoa",
    "furoa",
    "soloa",
    "sonoa",
    "spaoa",
    "mophoa",
    "feroa",
    "ruvoa",
    "mosoa",
    "setaoa",
    "spanyaoa",
    "nyamophoa",
  ]);

  return String(value || "")
    .split("\n")
    .map((line) => {
      const words = line.split(/\s+/).filter(Boolean);
      const hasPersonSubject = words.some((word) => personNouns.has(word));
      let hasVerb = false;

      const sanitizedWords = words
        .map((word) => (word === "limi" && !hasPersonSubject ? "eso" : word))
        .reduce((result, word, index, mappedWords) => {
          const previousWord = result[result.length - 1];

          if (nouns.has(previousWord) && nouns.has(word)) {
            if (previousWord === "nya" && word === "nya") {
              result.push("viva", word);
              return result;
            }

            if (personNouns.has(previousWord) && word !== "nya") {
              result.push("nopa", word);
              return result;
            }

            const derived = `${previousWord}oa`;
            if (nounAdjectives.has(derived)) {
              result[result.length - 1] = derived;
            }
          }

          result.push(word);
          return result;
        }, []);

      return sanitizedWords
        .filter((word) => {
          if (!verbs.has(word)) {
            return true;
          }

          if (hasVerb) {
            return false;
          }

          hasVerb = true;
          return true;
        })
        .join(" ");
    })
    .filter(Boolean)
    .join("\n");
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
              text: "Describe visible details in this image using only the Soo vocabulary. Prefer 1 or 2 short sentences with subject, quality, place, nearby elements, and visible relationships between people and objects/places. You may use noun-derived adjectives made by adding oa to nouns, such as furoa, soloa, ruvoa, nyaoa, or feroa. Do not place two nouns directly next to each other; use an oa adjective for noun modification, viva for separate visible things, or nopa between a person subject and an object noun. Use limi only when a person is the subject and appears to like something; do not use limi for places, nature, atmosphere, or general beauty. Use only one verb per sentence; do not combine eso, limi, fhmo, or dot in the same sentence. Do not start every sentence with vose; use vose only as this / this one when needed. If there are two sentences, separate them with a newline. Return only Soo romanization, no JSON and no explanation.",
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
  const normalized = enforceSingleVerbPerLine(normalizeSoText(so));

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
