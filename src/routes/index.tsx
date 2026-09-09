import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blohsh AI — Workspace" },
      {
        name: "description",
        content:
          "Workspace Blohsh AI: converse com o assistente, gere imagens no Image Studio e entenda a arquitetura do modelo.",
      },
      { property: "og:title", content: "Blohsh AI — Workspace" },
      {
        property: "og:description",
        content: "Assistente, Image Studio e arquitetura em preto profundo e verde neon.",
      },
    ],
  }),
  component: Index,
});

type Panel = "chat" | "studio" | "architecture";
type Message = { role: "user" | "assistant"; content: string };

const TITLES: Record<Panel, string> = {
  chat: "Bom te ver por aqui.",
  studio: "Image Studio.",
  architecture: "Arquitetura da IA.",
};

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

function Index() {
  const [panel, setPanel] = useState<Panel>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageState, setImageState] = useState<"idle" | "loading">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function send(value: string) {
    const prompt = value.trim();
    if (!prompt || pending) return;
    setMessages((m) => [...m, { role: "user", content: prompt }]);
    setInput("");
    setPending(true);
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Esta é a interface do Blohsh AI. O modelo de linguagem ainda não está conectado — peça a conexão para receber respostas reais aqui.",
        },
      ]);
      setPending(false);
    }, 700);
  }

  function clearChat() {
    setMessages([]);
    setInput("");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] noise-overlay" />
      <div className="pointer-events-none fixed -top-[25vw] -right-[15vw] z-0 h-[42vw] w-[42vw] opacity-[0.08] glow-acid" />
      <div className="pointer-events-none fixed -bottom-[30vw] left-[15vw] z-0 h-[42vw] w-[42vw] opacity-[0.08] glow-acid" />

      <main className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside className="flex w-16 flex-col border-r border-border bg-sidebar-bg px-2 py-6 md:w-[258px] md:px-4">
          <a href="/" className="flex items-center gap-2.5 px-2 pb-7 text-base font-bold tracking-[0.11em]">
            <span className="grid size-7 shrink-0 place-items-center rounded-[50%_50%_46%_54%] bg-primary font-mono font-bold text-primary-foreground shadow-[0_0_25px] shadow-primary/45">
              B
            </span>
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
            <kbd className="float-right hidden pt-1 font-mono text-[10px] text-muted-foreground md:inline">⌘ K</kbd>
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
            <strong className="text-[11px] tracking-[0.1em]">DEEPSEEK</strong>
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
                  <div className="relative mb-7 grid size-[42px] place-items-center rounded-full border border-primary/40">
                    <span className="size-2.5 rounded-full bg-primary shadow-[0_0_22px] shadow-primary" />
                    <span className="absolute h-px w-[59px] -rotate-[35deg] bg-primary" />
                  </div>
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
                        onClick={() => send(s.prompt)}
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
                    <article key={i} className="grid grid-cols-[28px_1fr] gap-3 whitespace-pre-wrap text-sm leading-relaxed">
                      <div
                        className={`grid size-7 place-items-center rounded-[2px] font-mono text-[11px] font-bold ${
                          m.role === "assistant" ? "bg-accent text-primary" : "bg-secondary text-foreground"
                        }`}
                      >
                        {m.role === "assistant" ? "B" : "VC"}
                      </div>
                      <div className="py-1">{m.content}</div>
                    </article>
                  ))}
                  {pending && (
                    <article className="grid grid-cols-[28px_1fr] gap-3">
                      <div className="grid size-7 place-items-center rounded-[2px] bg-accent font-mono text-[11px] font-bold text-primary">
                        B
                      </div>
                      <div className="py-1 tracking-[3px] text-primary">···</div>
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
                <textarea
                  ref={textareaRef}
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
                  placeholder="Pergunte qualquer coisa..."
                  className="max-h-[180px] min-h-16 w-full resize-none rounded-[2px] border border-border bg-surface py-5 pr-14 pl-4 text-sm outline-none transition-colors focus:border-primary/60"
                />
                <button
                  type="submit"
                  aria-label="Enviar mensagem"
                  className="absolute top-7 right-2.5 grid size-[37px] cursor-pointer place-items-center rounded-[2px] bg-primary text-xl text-primary-foreground"
                >
                  ↑
                </button>
                <small className="block px-0.5 py-2 font-mono text-[9px] tracking-wide text-muted-foreground">
                  DEEPSEEK · respostas podem conter imprecisões
                </small>
              </form>
            </div>
          )}

          {panel === "studio" && (
            <div className="flex flex-1 flex-col gap-9 py-[7.5vh]">
              <div className="max-w-[650px]">
                <p className="mb-2 font-mono text-[10px] tracking-[0.13em] text-muted-foreground">OPENAI IMAGE API</p>
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
                  if (!imagePrompt.trim()) return;
                  setImageState("loading");
                  window.setTimeout(() => setImageState("idle"), 1200);
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
                  className="h-11 cursor-pointer bg-primary px-6 text-[13px] font-semibold text-primary-foreground md:h-auto"
                >
                  Gerar imagem <span className="ml-2 text-lg">↗</span>
                </button>
              </form>

              <div className="grid min-h-[260px] place-items-center overflow-hidden border border-dashed border-border">
                <div className="text-center text-[13px] text-muted-foreground">
                  <span className="text-[29px] text-primary/70">✦</span>
                  <p>{imageState === "loading" ? "Gerando sua imagem..." : "Sua criação aparecerá aqui."}</p>
                </div>
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
                  O Blohsh conecta sua conversa a um modelo hospedado no DeepSeek. Estas são as camadas que tornam a
                  geração de linguagem possível.
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
