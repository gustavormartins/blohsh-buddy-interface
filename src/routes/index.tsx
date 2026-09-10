import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";

import logo from "@/assets/blohsh-logo.png";
import { FormattedText } from "@/components/formatted-text";
import { chat, createVideo, generateImage, pollVideo, type Attachment } from "@/lib/ai.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blohsh AI — Workspace" },
      {
        name: "description",
        content:
          "Workspace Blohsh AI: converse com o assistente, anexe arquivos, gere imagens e vídeos em um só lugar.",
      },
      { property: "og:title", content: "Blohsh AI — Workspace" },
      {
        property: "og:description",
        content: "Assistente, imagens, vídeos e arquitetura em preto profundo e verde neon.",
      },
    ],
  }),
  component: Index,
});

type Panel = "chat" | "studio" | "architecture";
type Mode = "chat" | "image" | "video";
type Message = {
  role: "user" | "assistant";
  content: string;
  image?: string;
  video?: string;
  files?: { name: string; mime: string; preview?: string }[];
  error?: boolean;
};

const TITLES: Record<Panel, string> = {
  chat: "Bom te ver por aqui.",
  studio: "Image Studio.",
  architecture: "Arquitetura da IA.",
};

const MODES: { id: Mode; label: string; icon: string; hint: string }[] = [
  { id: "chat", label: "Conversa", icon: "◈", hint: "Pergunte qualquer coisa..." },
  { id: "image", label: "Imagem", icon: "✦", hint: "Descreva a imagem que quer criar..." },
  { id: "video", label: "Vídeo", icon: "▶", hint: "Descreva a cena do vídeo..." },
];

const SUGGESTIONS = [
  { n: "01", label: "Estratégia de produto", prompt: "Crie um plano estratégico para lançar meu produto." },
  { n: "02", label: "Simplificar ideias", prompt: "Explique um conceito complexo de forma simples." },
  { n: "03", label: "Construir com código", prompt: "Me ajude a criar um projeto em Python." },
];

const LAYERS = [
  { n: "01", title: "Tokenização", text: "Quebra o texto em unidades que o modelo consegue processar." },
  { n: "02", title: "Embeddings", text: "Transforma tokens em vetores com significado matemático." },
  { n: "03", title: "Atenção", text: "Relaciona cada parte da frase para preservar contexto e intenção." },
  { n: "04", title: "Camadas neurais", text: "Calculam a próxima resposta mais útil para a sua solicitação." },
];

const STACK = ["Python", "PyTorch", "Transformers", "Tokenizers / Rust", "Candle ou Burn"];

const NAV: { id: Panel; icon: string; label: string; tag?: string }[] = [
  { id: "chat", icon: "◈", label: "Assistente" },
  { id: "studio", icon: "✦", label: "Image Studio", tag: "BETA" },
  { id: "architecture", icon: "⌘", label: "Arquitetura" },
];

function readFile(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não consegui ler o arquivo."));
    reader.onload = () => {
      const result = String(reader.result);
      resolve({
        name: file.name,
        mime: file.type || "application/octet-stream",
        data: result.slice(result.indexOf(",") + 1),
      });
    };
    reader.readAsDataURL(file);
  });
}

function Index() {
  const [panel, setPanel] = useState<Panel>("chat");
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [pending, setPending] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [studioImage, setStudioImage] = useState<string | null>(null);
  const [studioState, setStudioState] = useState<"idle" | "loading">("idle");
  const [studioError, setStudioError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const askChat = useServerFn(chat);
  const askImage = useServerFn(generateImage);
  const askVideo = useServerFn(createVideo);
  const checkVideo = useServerFn(pollVideo);

  const busy = pending !== "";

  async function send(value: string) {
    const prompt = value.trim();
    if ((!prompt && files.length === 0) || busy) return;
    const attachments = files;
    const userMessage: Message = {
      role: "user",
      content: prompt,
      files: attachments.map((f) => ({
        name: f.name,
        mime: f.mime,
        ...(f.mime.startsWith("image/") ? { preview: `data:${f.mime};base64,${f.data}` } : {}),
      })),
    };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setFiles([]);

    try {
      if (mode === "image") {
        setPending("Gerando sua imagem...");
        const { image } = await askImage({ data: { prompt } });
        setMessages((m) => [...m, { role: "assistant", content: "Imagem criada.", image }]);
      } else if (mode === "video") {
        setPending("Criando o vídeo (pode levar alguns minutos)...");
        const job = await askVideo({ data: { prompt } });
        let video: string | null = null;
        for (let i = 0; i < 60 && !video; i++) {
          await new Promise((r) => setTimeout(r, 6000));
          const status = await checkVideo({ data: { id: job.id } });
          if (status.video) video = status.video;
          else setPending(`Renderizando o vídeo... ${status.progress ?? 0}%`);
        }
        if (!video) throw new Error("O vídeo demorou demais para ficar pronto.");
        setMessages((m) => [...m, { role: "assistant", content: "Vídeo pronto.", video }]);
      } else {
        setPending("...");
        const { text } = await askChat({
          data: {
            turns: history.map((m, i) => ({
              role: m.role,
              content: m.content,
              attachments: i === history.length - 1 ? attachments : undefined,
            })),
          },
        });
        setMessages((m) => [...m, { role: "assistant", content: text }]);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: err instanceof Error ? err.message : "Algo deu errado.", error: true },
      ]);
    } finally {
      setPending("");
    }
  }

  async function onPickFiles(list: FileList | File[] | null) {
    const items = list ? Array.from(list as ArrayLike<File>) : [];
    if (items.length === 0) return;
    const read = await Promise.all(items.slice(0, 4).map(readFile));
    setFiles((f) => [...f, ...read].slice(0, 4));
    if (fileRef.current) fileRef.current.value = "";
  }

  /** Aceita imagens coladas (Ctrl+V) direto no campo de mensagem. */
  async function onPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (pasted.length === 0) return;
    event.preventDefault();
    const named = pasted.map((file) =>
      file.name && file.name !== "image.png"
        ? file
        : new File([file], `colado-${Date.now()}.${(file.type.split("/")[1] ?? "png").replace("jpeg", "jpg")}`, {
            type: file.type,
          }),
    );
    await onPickFiles(named);
  }

  async function runStudio(prompt: string) {
    if (!prompt.trim() || studioState === "loading") return;
    setStudioState("loading");
    setStudioError(null);
    try {
      const { image } = await askImage({ data: { prompt } });
      setStudioImage(image);
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Não consegui gerar a imagem.");
    } finally {
      setStudioState("idle");
    }
  }

  function clearChat() {
    setMessages([]);
    setInput("");
    setFiles([]);
  }

  const activeMode = MODES.find((m) => m.id === mode)!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] noise-overlay" />
      <div className="pointer-events-none fixed -top-[25vw] -right-[15vw] z-0 h-[42vw] w-[42vw] opacity-[0.08] glow-acid" />
      <div className="pointer-events-none fixed -bottom-[30vw] left-[15vw] z-0 h-[42vw] w-[42vw] opacity-[0.08] glow-acid" />

      <main className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside className="flex w-16 flex-col border-r border-border bg-sidebar-bg px-2 py-6 md:w-[258px] md:px-4">
          <a href="/" className="flex items-center gap-2.5 px-2 pb-7 text-base font-bold tracking-[0.11em]">
            <img
              src={logo}
              alt="Logo Blohsh AI"
              width={28}
              height={28}
              className="size-7 shrink-0 drop-shadow-[0_0_14px_var(--primary)]"
            />
            <span className="hidden md:inline">
              BLOHSH <i className="not-italic text-primary">AI</i>
            </span>
          </a>

          <button
            onClick={() => {
              clearChat();
              setPanel("chat");
            }}
            className="w-full cursor-pointer border border-primary/40 px-2.5 py-3 text-left text-[13px] font-medium text-primary transition-colors hover:bg-primary/8"
          >
            <span className="mr-0 text-lg md:mr-2">＋</span>
            <span className="hidden md:inline">Nova conversa</span>
          </button>

          <nav aria-label="Navegação principal" className="mt-7 grid gap-1.5">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setPanel(item.id)}
                className={`cursor-pointer rounded-sm px-2.5 py-3 text-left text-[13px] font-medium transition-colors ${
                  panel === item.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <span className="text-primary md:mr-2.5">{item.icon}</span>
                <span className="hidden md:inline">{item.label}</span>
                {item.tag ? (
                  <em className="float-right hidden border border-primary/35 px-1 py-0.5 font-mono text-[9px] not-italic text-primary md:inline">
                    {item.tag}
                  </em>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="mt-auto hidden border-t border-border px-2 pt-5 font-mono md:block">
            <p className="mb-2 text-[10px] tracking-[0.13em] text-muted-foreground">MODELO ATIVO</p>
            <strong className="text-[11px] tracking-[0.1em]">BLOHSH CORE</strong>
            <span className="mt-4 block text-[10px] text-muted-foreground">
              <b className="mr-1.5 inline-block size-1.5 rounded-full bg-primary shadow-[0_0_9px] shadow-primary" />
              Sistema online
            </span>
          </div>
        </aside>

        {/* Workspace */}
        <section className="mx-auto flex w-[calc(100%-4rem)] max-w-[1440px] flex-col px-6 md:w-[calc(100%-258px)] md:px-[8.2vw]">
          <header className="flex h-[100px] items-center justify-between border-b border-border md:h-[124px]">
            <div>
              <p className="mb-2 font-mono text-[10px] tracking-[0.13em] text-muted-foreground">BLOHSH / WORKSPACE</p>
              <h1 className="text-xl font-medium">{TITLES[panel]}</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={clearChat}
                title="Limpar conversa"
                className="size-[34px] cursor-pointer border border-border transition-colors hover:border-primary/50 hover:text-primary"
              >
                ↻
              </button>
              <div className="grid size-[33px] place-items-center rounded-full bg-secondary font-mono text-xs text-primary">
                A
              </div>
            </div>
          </header>

          {panel === "chat" && (
            <div className="flex min-h-[calc(100vh-124px)] flex-1 flex-col">
              {messages.length === 0 ? (
                <div className="my-auto -translate-y-4">
                  <img
                    src={logo}
                    alt=""
                    width={44}
                    height={44}
                    className="mb-7 size-11 drop-shadow-[0_0_22px_var(--primary)]"
                  />
                  <p className="mb-2 font-mono text-[10px] tracking-[0.13em] text-muted-foreground">
                    SEU ESPAÇO DE PENSAMENTO
                  </p>
                  <h2 className="text-[clamp(38px,5vw,72px)] font-medium leading-[0.96]">
                    Em que vamos
                    <br />
                    <i className="not-italic text-primary">mergulhar</i> hoje?
                  </h2>
                  <div className="mt-10 flex flex-wrap gap-2.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.n}
                        onClick={() => {
                          setMode("chat");
                          send(s.prompt);
                        }}
                        className="cursor-pointer border border-border bg-surface px-3.5 py-3 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                      >
                        <span className="mr-2 font-mono text-[10px] text-primary">{s.n}</span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div aria-live="polite" className="mx-auto grid w-full max-w-[790px] gap-5 py-9">
                  {messages.map((m, i) => (
                    <article key={i} className="grid grid-cols-[28px_1fr] gap-3 text-sm leading-relaxed">
                      <div
                        className={`grid size-7 place-items-center rounded-[2px] font-mono text-[11px] font-bold ${
                          m.role === "assistant" ? "bg-accent text-primary" : "bg-secondary text-foreground"
                        }`}
                      >
                        {m.role === "assistant" ? "B" : "VC"}
                      </div>
                      <div className="min-w-0 py-1">
                        {m.files?.length ? (
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            {m.files.map((f) =>
                              f.preview ? (
                                <img
                                  key={f.name}
                                  src={f.preview}
                                  alt={f.name}
                                  loading="lazy"
                                  className="size-16 border border-border object-cover"
                                />
                              ) : (
                                <span
                                  key={f.name}
                                  className="border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground"
                                >
                                  ⎙ {f.name}
                                </span>
                              ),
                            )}
                          </div>
                        ) : null}
                        {m.content ? (
                          <FormattedText text={m.content} {...(m.error ? ({ tone: "error" } as const) : {})} />
                        ) : null}
                        {m.image ? (
                          <img
                            src={m.image}
                            alt="Imagem gerada pela Blohsh AI"
                            loading="lazy"
                            className="mt-3 w-full max-w-[430px] border border-border"
                          />
                        ) : null}
                        {m.video ? (
                          <video
                            src={m.video}
                            controls
                            className="mt-3 w-full max-w-[520px] border border-border"
                          />
                        ) : null}
                      </div>
                    </article>
                  ))}
                  {busy && (
                    <article className="grid grid-cols-[28px_1fr] gap-3">
                      <div className="grid size-7 place-items-center rounded-[2px] bg-accent font-mono text-[11px] font-bold text-primary">
                        B
                      </div>
                      <div className="py-1 text-sm text-primary">{pending}</div>
                    </article>
                  )}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="relative border-t border-border pt-4 pb-9"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className={`cursor-pointer border px-3 py-2 text-[11px] font-medium transition-colors ${
                        mode === m.id
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="mr-1.5">{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="cursor-pointer border border-border px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    ⎙ Anexar arquivo
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => onPickFiles(e.target.files)}
                  />
                </div>

                {files.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <span
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-2 border border-primary/40 py-1 pr-2 pl-2 font-mono text-[10px] text-primary"
                      >
                        {f.mime.startsWith("image/") ? (
                          <img
                            src={`data:${f.mime};base64,${f.data}`}
                            alt=""
                            className="size-8 border border-border object-cover"
                          />
                        ) : null}
                        <span className="max-w-[160px] truncate">{f.name}</span>
                        <button
                          type="button"
                          aria-label={`Remover ${f.name}`}
                          onClick={() => setFiles((list) => list.filter((_, idx) => idx !== i))}
                          className="cursor-pointer text-muted-foreground hover:text-destructive"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    const el = e.target;
                    el.style.height = "auto";
                    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  onPaste={onPaste}
                  placeholder={`${activeMode.hint} (cole imagens com Ctrl+V)`}
                  className="max-h-[180px] min-h-16 w-full resize-none rounded-[2px] border border-border bg-surface py-5 pr-14 pl-4 text-sm outline-none transition-colors focus:border-primary/60"
                />
                <button
                  type="submit"
                  disabled={busy}
                  aria-label="Enviar mensagem"
                  className="absolute right-2.5 bottom-[68px] grid size-[37px] cursor-pointer place-items-center rounded-[2px] bg-primary text-xl text-primary-foreground disabled:opacity-40"
                >
                  ↑
                </button>
                <small className="block px-0.5 py-2 font-mono text-[9px] tracking-wide text-muted-foreground">
                  BLOHSH AI · texto, imagem e vídeo · respostas podem conter imprecisões
                </small>
              </form>
            </div>
          )}

          {panel === "studio" && (
            <div className="flex flex-1 flex-col gap-9 py-[7.5vh]">
              <div className="max-w-[650px]">
                <p className="mb-2 font-mono text-[10px] tracking-[0.13em] text-muted-foreground">BLOHSH IMAGE</p>
                <h2 className="text-[clamp(38px,5vw,72px)] font-medium leading-[0.96]">
                  Transforme ideias
                  <br />
                  em <i className="not-italic text-primary">imagem.</i>
                </h2>
                <p className="mt-4 max-w-[480px] leading-relaxed text-muted-foreground">
                  Descreva uma cena, estilo ou conceito. O Blohsh Studio cria a primeira visualização para você.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runStudio(imagePrompt);
                }}
                className="grid w-full gap-3 border border-border bg-surface p-4 md:grid-cols-[1fr_auto]"
              >
                <label htmlFor="imagePrompt" className="col-span-full font-mono text-[10px] tracking-[0.13em] text-primary">
                  PROMPT VISUAL
                </label>
                <textarea
                  id="imagePrompt"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Ex.: Uma cidade futurista em preto e verde neon, chuva suave, fotografia editorial"
                  className="min-h-[54px] resize-none border border-border bg-card p-3 text-sm outline-none focus:border-primary/60"
                />
                <button
                  type="submit"
                  disabled={studioState === "loading"}
                  className="h-11 cursor-pointer bg-primary px-6 text-[13px] font-semibold text-primary-foreground disabled:opacity-50 md:h-auto"
                >
                  Gerar imagem <span className="ml-2 text-lg">↗</span>
                </button>
              </form>

              <div className="grid min-h-[260px] place-items-center overflow-hidden border border-dashed border-border p-4">
                {studioImage && studioState === "idle" ? (
                  <img
                    src={studioImage}
                    alt={imagePrompt || "Imagem gerada"}
                    loading="lazy"
                    className="max-h-[520px] w-auto"
                  />
                ) : (
                  <div className="text-center text-[13px] text-muted-foreground">
                    <span className="text-[29px] text-primary/70">✦</span>
                    <p className={studioError ? "text-destructive" : ""}>
                      {studioError ??
                        (studioState === "loading" ? "Gerando sua imagem..." : "Sua criação aparecerá aqui.")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {panel === "architecture" && (
            <div className="flex flex-1 flex-col justify-center gap-10 py-[7.5vh]">
              <div className="max-w-[690px]">
                <p className="mb-2 font-mono text-[10px] tracking-[0.13em] text-muted-foreground">
                  COMO A INTELIGÊNCIA OPERA
                </p>
                <h2 className="text-[clamp(38px,5vw,72px)] font-medium leading-[0.96]">
                  Da ideia à
                  <br />
                  <i className="not-italic text-primary">resposta.</i>
                </h2>
                <p className="mt-5 max-w-[570px] leading-[1.65] text-muted-foreground">
                  A Blohsh conecta sua conversa a modelos de linguagem, imagem e vídeo. Estas são as camadas que
                  tornam a geração possível.
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {LAYERS.map((l) => (
                  <article
                    key={l.n}
                    className="min-h-[180px] border border-border bg-surface p-5 transition-colors hover:border-primary/50"
                  >
                    <span className="font-mono text-[10px] text-primary">{l.n}</span>
                    <h3 className="mt-10 mb-2 text-[17px] font-medium">{l.title}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{l.text}</p>
                  </article>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 font-mono text-[10px] text-muted-foreground">
                <b className="mr-1 text-primary">STACK SUGERIDA</b>
                {STACK.map((s) => (
                  <span key={s} className="border border-border px-2.5 py-2">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
