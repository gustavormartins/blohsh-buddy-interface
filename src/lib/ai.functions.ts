import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev";

export type Attachment = {
  name: string;
  mime: string;
  /** base64 (sem prefixo data:) */
  data: string;
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[] | undefined;
};

function key() {
  const k = process.env["LOVABLE_API_KEY"];
  if (!k) throw new Error("LOVABLE_API_KEY não configurada.");
  return k;
}

function buildContent(turn: ChatTurn) {
  const files = turn.attachments ?? [];
  if (files.length === 0) return turn.content;
  const blocks: unknown[] = [{ type: "text", text: turn.content || "Analise o(s) arquivo(s)." }];
  for (const f of files) {
    if (f.mime.startsWith("image/")) {
      blocks.push({ type: "image_url", image_url: { url: `data:${f.mime};base64,${f.data}` } });
    } else if (f.mime === "application/pdf") {
      blocks.push({
        type: "file",
        file: { filename: f.name, file_data: `data:${f.mime};base64,${f.data}` },
      });
    } else {
      let text = "";
      try {
        text = atob(f.data).slice(0, 20000);
      } catch {
        text = "";
      }
      blocks.push({ type: "text", text: `Conteúdo do arquivo ${f.name}:\n${text}` });
    }
  }
  return blocks;
}

/** Conversa com o modelo de linguagem. */
export const chat = createServerFn({ method: "POST" })
  .inputValidator((data: { turns: ChatTurn[] }) => data)
  .handler(async ({ data }) => {
    const res = await fetch(`${GATEWAY}/v1/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        messages: [
          {
            role: "system",
            content:
              "Você é a Blohsh AI, uma assistente direta, criativa e em português do Brasil. Responda de forma clara e útil.",
          },
          ...data.turns.map((t) => ({ role: t.role, content: buildContent(t) })),
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(errorMessage(res.status, body));
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { text: json.choices?.[0]?.message?.content ?? "Sem resposta." };
  });

/** Gera uma imagem a partir de um prompt. */
export const generateImage = createServerFn({ method: "POST" })
  .inputValidator((data: { prompt: string }) => data)
  .handler(async ({ data }) => {
    const res = await fetch(`${GATEWAY}/v1/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image",
        messages: [{ role: "user", content: data.prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(errorMessage(res.status, body));
    }
    const json = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("A geração não retornou nenhuma imagem.");
    return { image: `data:image/png;base64,${b64}` };
  });

/** Cria o trabalho de geração de vídeo (assíncrono). */
export const createVideo = createServerFn({ method: "POST" })
  .inputValidator((data: { prompt: string }) => data)
  .handler(async ({ data }) => {
    const res = await fetch(`${GATEWAY}/v1/videos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-omni-1.1-flash",
        input: data.prompt,
        response_format: { type: "video", resolution: "720p", duration: "6s", aspect_ratio: "16:9" },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(errorMessage(res.status, body));
    }
    const job = (await res.json()) as { id: string; status: string };
    return { id: job.id, status: job.status };
  });

/** Consulta o vídeo; quando pronto devolve o MP4 já embutido. */
export const pollVideo = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const res = await fetch(`${GATEWAY}/v1/videos/${data.id}`, {
      headers: { Authorization: `Bearer ${key()}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(errorMessage(res.status, body));
    }
    const job = (await res.json()) as {
      status: string;
      progress?: number;
      error?: { message?: string };
    };
    if (job.status === "failed") {
      throw new Error(job.error?.message ?? "A geração de vídeo falhou.");
    }
    if (job.status !== "completed") {
      return { status: job.status, progress: job.progress ?? 0, video: null as string | null };
    }
    const content = await fetch(`${GATEWAY}/v1/videos/${data.id}/content`, {
      headers: { Authorization: `Bearer ${key()}` },
    });
    if (!content.ok) throw new Error("Não foi possível baixar o vídeo gerado.");
    const bytes = new Uint8Array(await content.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return {
      status: "completed",
      progress: 100,
      video: `data:video/mp4;base64,${btoa(binary)}`,
    };
  });

function errorMessage(status: number, body: string) {
  let message = body;
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: { message?: string } };
    message = parsed.message ?? parsed.error?.message ?? body;
  } catch {
    /* texto puro */
  }
  if (status === 429) return "Muitas solicitações agora. Tente de novo em instantes.";
  if (status === 402) return message || "Créditos de IA insuficientes para concluir isso.";
  if (status === 403) return message || "O acesso à IA está bloqueado neste espaço de trabalho.";
  return message || `Falha na solicitação (${status}).`;
}
