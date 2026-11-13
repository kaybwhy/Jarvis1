const MODEL = "gemini-2.5-flash";

const SYSTEM = `
You are JARVIS, a personal AI assistant.

Your job is not to blindly agree with the user. Your job is to help the user make better decisions.

PERSONALITY:
- Calm, concise, capable, warm and confident.
- Speak naturally, like a sophisticated personal assistant.
- Do not pretend to have abilities, access, memory or tools you do not actually have.
- Do not manufacture disagreement just to seem intelligent.
- When the user's reasoning contains a meaningful flaw, risk, contradiction, unrealistic assumption or important trade-off, respectfully challenge it.
- If a decision is emotionally driven or impulsive, point that out without insulting the user.
- Give the strongest counterargument when it would improve the decision.
- Distinguish facts, assumptions and opinions when useful.
- If the user is right, say so.
- If information is missing and it matters, ask a focused question.
- Prefer practical next steps over vague motivational advice.
- Keep ordinary spoken answers reasonably concise unless the user asks for detail.

MEMORY:
The user may provide local memories. Use them as context, not as unquestionable facts.
Only suggest a memory candidate when it is a durable preference, goal, constraint, or fact that would genuinely improve future assistance.
Do not suggest memories for one-off questions, temporary moods, sensitive secrets, passwords, API keys, or highly private information.

IMPORTANT:
The user's final decisions remain theirs. Challenge; do not control.
`;

function cors(origin, allowed) {
  const ok = allowed === "*" || origin === allowed;
  return {
    "Access-Control-Allow-Origin": ok ? origin || allowed : allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(data, status, origin, allowed) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {"Content-Type":"application/json", ...cors(origin, allowed)}
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN || "*";

    if (request.method === "OPTIONS") {
      if (allowed !== "*" && origin !== allowed) return new Response("Forbidden", {status:403});
      return new Response(null, {status:204, headers:cors(origin, allowed)});
    }

    const url = new URL(request.url);
    if (url.pathname === "/") return new Response("JARVIS worker online.");
    if (url.pathname !== "/chat" || request.method !== "POST") return json({error:"Not found"},404,origin,allowed);
    if (allowed !== "*" && origin !== allowed) return json({error:"Origin not allowed"},403,origin,allowed);
    if (!env.GEMINI_API_KEY) return json({error:"GEMINI_API_KEY secret is missing"},500,origin,allowed);

    try {
      const body = await request.json();
      const message = String(body.message || "").trim();
      const memories = Array.isArray(body.memories) ? body.memories.slice(-50) : [];
      const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
      if (!message) return json({error:"Empty message"},400,origin,allowed);

      const context = [
        SYSTEM,
        "\\nLOCAL MEMORY:\\n" + (memories.length ? memories.map(x=>"- "+String(x)).join("\\n") : "(none)"),
        "\\nRECENT CONVERSATION:\\n" + (history.length ? history.map(x=>`${x.role}: ${x.text}`).join("\\n") : "(none)"),
        "\\nCURRENT USER MESSAGE:\\n" + message,
        "\\nReturn valid JSON with exactly these fields: reply (string) and memory_candidates (array of strings)."
      ].join("\\n");

      const api = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
      const r = await fetch(api, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-goog-api-key":env.GEMINI_API_KEY
        },
        body:JSON.stringify({
          systemInstruction:{parts:[{text:SYSTEM}]},
          contents:[{role:"user",parts:[{text:
            "Local memory:\\n"+(memories.length?memories.map(x=>"- "+x).join("\\n"):"(none)")+
            "\\n\\nRecent conversation:\\n"+(history.length?history.map(x=>`${x.role}: ${x.text}`).join("\\n"):"(none)")+
            "\\n\\nUser message:\\n"+message+
            "\\n\\nReturn ONLY valid JSON with exactly: {\"reply\":\"...\",\"memory_candidates\":[\"...\"]}. Memory candidates must be durable and genuinely useful; otherwise use []."
          }]}],
          generationConfig:{
            temperature:0.7,
            responseMimeType:"application/json"
          }
        })
      });

      const raw = await r.text();
      if (!r.ok) {
        let detail = raw;
        try { detail = JSON.parse(raw)?.error?.message || raw; } catch {}
        return json({error:"Gemini error: "+detail},502,origin,allowed);
      }

      const parsed = JSON.parse(raw);
      const text = parsed?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("") || "";
      let out;
      try { out = JSON.parse(text); }
      catch { out = {reply:text, memory_candidates:[]}; }

      return json({
        reply:String(out.reply || "").trim(),
        memory_candidates:Array.isArray(out.memory_candidates) ? out.memory_candidates.map(String).slice(0,3) : []
      },200,origin,allowed);

    } catch (e) {
      return json({error:e.message || "Server error"},500,origin,allowed);
    }
  }
};